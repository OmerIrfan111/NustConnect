const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const mongoose = require('mongoose');
const config = require('../../../core/config');
const { HttpError } = require('../../../core/errors');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const { extractOcrFromImage, findMatchesForItem, maskSensitiveText } = require('../ocr');
const { validateCreateItem, validateUpdateItem } = require('../validation');
const { notifyUser } = require('../notifyHelper');

const UPLOAD_SUBDIR = path.join(config.uploadDir, 'lostfound');
const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAX_BYTES = (config.maxUploadMb || 5) * 1024 * 1024;
const MAX_FILES = 3;

const isStaff = (user) => user && (user.role === 'moderator' || user.role === 'admin');
const isValidId = (id) => mongoose.isValidObjectId(id);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(UPLOAD_SUBDIR, { recursive: true });
      cb(null, UPLOAD_SUBDIR);
    },
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}${TYPES[file.mimetype] || '.jpg'}`),
  }),
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
  fileFilter: (req, file, cb) =>
    TYPES[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Upload JPEG, PNG, or WebP images only')),
}).array('photos', MAX_FILES);

function handleUpload(req, res, next) {
  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.includes('multipart/form-data')) return next();
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(400, `Each image must be ${config.maxUploadMb || 5} MB or smaller`));
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new HttpError(400, `Upload at most ${MAX_FILES} images`));
    }
    return next(err);
  });
}

async function listItems(req, res) {
  const { type, category, location, q, status, fromDate, toDate, mine, includeArchived } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const filter = {};

  if (!isStaff(req.user)) filter.hidden = { $ne: true };
  if (mine === 'true') filter.ownerId = req.user.id;
  else if (includeArchived !== 'true') filter.expiresAt = { $gt: new Date() };

  if (type && ['lost', 'found'].includes(String(type))) filter.type = String(type);
  if (category && category !== 'all') filter.category = String(category);
  if (status && status !== 'all') filter.status = String(status);
  if (location) filter.location = { $regex: String(location).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

  if (fromDate || toDate) {
    filter.eventDate = {};
    if (fromDate && !Number.isNaN(Date.parse(fromDate))) filter.eventDate.$gte = new Date(fromDate);
    if (toDate && !Number.isNaN(Date.parse(toDate))) filter.eventDate.$lte = new Date(toDate);
    if (Object.keys(filter.eventDate).length === 0) delete filter.eventDate;
  }

  if (q && String(q).trim()) {
    const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
      { location: { $regex: safe, $options: 'i' } },
      { manualKeywords: { $regex: safe, $options: 'i' } },
    ];
  }

  const [rows, total] = await Promise.all([
    Item.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Item.countDocuments(filter),
  ]);

  res.json({
    items: rows.map((r) => r.toPublic()),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}

async function getItem(req, res) {
  if (!isValidId(req.params.id)) throw new HttpError(404, 'Item not found');
  const item = await Item.findById(req.params.id);
  if (!item || (item.hidden && !isStaff(req.user))) throw new HttpError(404, 'Item not found');

  const isOwner = item.ownerId === req.user.id;
  let claims = [];
  if (isOwner) {
    claims = (await Claim.find({ itemId: item._id }).sort({ createdAt: -1 })).map((c) => c.toPublic());
  } else {
    claims = (await Claim.find({ itemId: item._id, claimantId: req.user.id }).sort({ createdAt: -1 })).map((c) => c.toPublic());
  }

  res.json({ item: item.toPublic(), claims, isOwner });
}

async function createItem(req, res) {
  const uploadedFiles = Array.isArray(req.files) ? req.files : [];
  try {
    const data = validateCreateItem(req.body);
    const photos = uploadedFiles.map((f) => `/uploads/lostfound/${f.filename}`);

    let ocrTextMasked = '';
    let ocrKeywords = [];
    let ocrStatus = data.manualKeywords ? 'manual' : 'none';

    // Run server-side OCR on found-item photos (privacy-masked, timeout-safe fallback).
    if (data.type === 'found' && uploadedFiles.length > 0) {
      const ocrOut = await extractOcrFromImage(uploadedFiles[0].path, {
        recognizer: req.app?.locals?.lostfoundOcrRecognizer,
      });
      if (ocrOut.ok) {
        ocrTextMasked = ocrOut.maskedText;
        ocrKeywords = ocrOut.keywords;
        ocrStatus = 'completed';
      } else {
        ocrStatus = data.manualKeywords ? 'manual' : 'failed';
      }
    } else if (data.manualKeywords) {
      ocrKeywords = maskSensitiveText(data.manualKeywords).keywords;
    }

    const item = await Item.create({
      ...data,
      photos,
      ownerId: req.user.id,
      ownerName: req.user.name,
      ownerVerified: Boolean(req.user.verified),
      ocrTextMasked,
      ocrKeywords,
      ocrStatus,
    });

    // Find probable matches among opposite-type open items and notify owners.
    const candidates = await Item.find({
      type: data.type === 'found' ? 'lost' : 'found',
      status: 'open',
      hidden: { $ne: true },
      expiresAt: { $gt: new Date() },
    }).limit(50);

    const matches = findMatchesForItem(item, candidates);
    await Promise.all(
      matches
        .filter((m) => m.item.ownerId !== req.user.id)
        .slice(0, 3)
        .map((m) =>
          notifyUser(m.item.ownerId, {
            type: 'lostfound',
            title: 'Possible Lost & Found match',
            body: `A ${item.type} item "${item.title}" near ${item.location} may match "${m.item.title}".`,
            link: `/lost-found/${m.item.id}`,
            important: true,
          }),
        ),
    );

    res.status(201).json({
      item: item.toPublic(),
      matchCount: matches.length,
    });
  } catch (err) {
    for (const f of uploadedFiles) fs.promises.unlink(f.path).catch(() => {});
    throw err;
  }
}

async function updateItem(req, res) {
  if (!isValidId(req.params.id)) throw new HttpError(404, 'Item not found');
  const item = await Item.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Item not found');
  if (item.ownerId !== req.user.id && !isStaff(req.user)) {
    throw new HttpError(403, 'Only the item owner can edit this post');
  }

  const patch = validateUpdateItem(req.body);
  Object.assign(item, patch);
  if (patch.manualKeywords !== undefined && item.ocrStatus !== 'completed') {
    item.ocrStatus = patch.manualKeywords ? 'manual' : item.ocrStatus;
    item.ocrKeywords = maskSensitiveText(patch.manualKeywords).keywords;
  }
  await item.save();
  res.json({ item: item.toPublic() });
}

async function deleteItem(req, res) {
  if (!isValidId(req.params.id)) throw new HttpError(404, 'Item not found');
  const item = await Item.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Item not found');
  if (item.ownerId !== req.user.id && req.user.role !== 'admin') {
    throw new HttpError(403, 'Only the owner or an admin can delete this item');
  }

  await Claim.deleteMany({ itemId: item._id });
  await Item.deleteOne({ _id: item._id });
  res.json({ ok: true });
}

/**
 * Privacy rule (PROJECT_PLAN §8 C1 QA-2): Match suggestions are visible ONLY to the item owner.
 */
async function getMatches(req, res) {
  if (!isValidId(req.params.id)) throw new HttpError(404, 'Item not found');
  const item = await Item.findById(req.params.id);
  if (!item || (item.hidden && !isStaff(req.user))) throw new HttpError(404, 'Item not found');
  if (item.ownerId !== req.user.id) {
    throw new HttpError(403, 'Match suggestions are visible only to the item owner');
  }

  const candidates = await Item.find({
    type: item.type === 'found' ? 'lost' : 'found',
    status: 'open',
    hidden: { $ne: true },
    expiresAt: { $gt: new Date() },
  }).limit(100);

  const matches = findMatchesForItem(item, candidates);
  res.json({ matches });
}

module.exports = {
  handleUpload,
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  getMatches,
};

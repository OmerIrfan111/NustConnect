const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const mongoose = require('mongoose');
const config = require('../../../core/config');
const { HttpError } = require('../../../core/errors');
const Complaint = require('../models/Complaint');
const { ALLOWED_TRANSITIONS } = require('../models/Complaint');
const ComplaintHistory = require('../models/ComplaintHistory');
const { validateComplaintCreate, validateComplaintTransition } = require('../validation');
const { notifyUser } = require('../notifyHelper');

const UPLOAD_SUBDIR = path.join(config.uploadDir, 'complaints');
const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAX_BYTES = (config.maxUploadMb || 5) * 1024 * 1024;

const isStaff = (user) => user && (user.role === 'moderator' || user.role === 'admin');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(UPLOAD_SUBDIR, { recursive: true });
      cb(null, UPLOAD_SUBDIR);
    },
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}${TYPES[file.mimetype] || '.jpg'}`),
  }),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) =>
    TYPES[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Upload JPEG, PNG, or WebP images only')),
}).single('photo');

function handleUpload(req, res, next) {
  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.includes('multipart/form-data')) return next();
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(400, `Photo must be ${config.maxUploadMb || 5} MB or smaller`));
    return next(err);
  });
}

async function listComplaints(req, res) {
  const { scope, status, category } = req.query;
  const filter = {};
  if (scope === 'staff') {
    if (!isStaff(req.user)) throw new HttpError(403, 'Staff permission required');
  } else {
    filter.ownerId = req.user.id;
  }
  if (status && status !== 'all') filter.status = String(status);
  if (category && category !== 'all') filter.category = String(category);

  const rows = await Complaint.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ complaints: rows.map((c) => c.toPublic()) });
}

async function createComplaint(req, res) {
  try {
    const data = validateComplaintCreate(req.body);
    const photo = req.file ? `/uploads/complaints/${req.file.filename}` : '';
    const complaint = await Complaint.create({
      ...data,
      photo,
      ownerId: req.user.id,
      ownerName: req.user.name,
      status: 'submitted',
    });

    const historyEntry = await ComplaintHistory.create({
      complaintId: complaint._id,
      fromStatus: '',
      toStatus: 'submitted',
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      note: 'Complaint submitted',
    });

    res.status(201).json({ complaint: complaint.toPublic(), history: [historyEntry.toPublic()] });
  } catch (err) {
    if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
    throw err;
  }
}

async function getComplaint(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Complaint not found');
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new HttpError(404, 'Complaint not found');

  // Privacy rule (CLAUDE.md §2.7, PROJECT_PLAN §8 C2 QA-2): owner and staff only.
  if (complaint.ownerId !== req.user.id && !isStaff(req.user)) {
    throw new HttpError(403, 'Only the complaint owner or staff can view this complaint');
  }

  const history = await ComplaintHistory.find({ complaintId: complaint._id }).sort({ createdAt: 1 });
  res.json({
    complaint: complaint.toPublic(),
    history: history.map((h) => h.toPublic()),
    isOwner: complaint.ownerId === req.user.id,
  });
}

async function updateStatus(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Complaint not found');
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new HttpError(404, 'Complaint not found');

  const { status: nextStatus, note, assignedTo } = validateComplaintTransition(req.body);
  const staff = isStaff(req.user);
  const owner = complaint.ownerId === req.user.id;

  if (!staff && !owner) throw new HttpError(403, 'You do not have permission to update this complaint');
  if (!staff && nextStatus !== 'reopened') {
    throw new HttpError(403, 'Only staff can transition complaints to this status');
  }

  const allowed = ALLOWED_TRANSITIONS[complaint.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new HttpError(400, `Cannot change status from "${complaint.status}" to "${nextStatus}"`);
  }

  const prevStatus = complaint.status;
  complaint.status = nextStatus;
  if (assignedTo && staff) complaint.assignedTo = assignedTo;
  await complaint.save();

  const entry = await ComplaintHistory.create({
    complaintId: complaint._id,
    fromStatus: prevStatus,
    toStatus: nextStatus,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    note: note || `Status changed to ${nextStatus.replace('_', ' ')}`,
  });

  await notifyUser(complaint.ownerId, {
    type: 'complaint',
    title: 'Complaint status updated',
    body: `"${complaint.title}" is now ${nextStatus.replace('_', ' ')}.`,
    link: `/complaints/${complaint._id}`,
    important: nextStatus === 'resolved' || nextStatus === 'assigned',
  });

  const history = await ComplaintHistory.find({ complaintId: complaint._id }).sort({ createdAt: 1 });
  res.json({ complaint: complaint.toPublic(), history: history.map((h) => h.toPublic()), entry: entry.toPublic() });
}

module.exports = { handleUpload, listComplaints, createComplaint, getComplaint, updateStatus };

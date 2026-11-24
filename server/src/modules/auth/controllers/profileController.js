const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const User = require('../models/User');
const config = require('../../../core/config');
const { HttpError } = require('../../../core/errors');
const { validateProfile, validateSettings } = require('../validation');

const AVATAR_DIR = path.join(config.uploadDir, 'avatars');
const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));

const load = async (req) => {
  if (!isObjectId(req.user.id)) throw new HttpError(400, 'The demo user has no profile to edit');
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Authentication required');
  return user;
};

async function updateProfile(req, res) {
  const data = validateProfile(req.body);
  const user = await load(req);
  Object.assign(user, data);
  await user.save();
  res.json({ user: user.toPublic() });
}

async function updateSettings(req, res) {
  const patch = validateSettings(req.body);
  const user = await load(req);
  const phone = patch.phone !== undefined ? patch.phone : user.phone;
  const pref = patch['settings.contactPreference'] ?? user.settings?.contactPreference;
  if (pref === 'phone' && !phone) {
    throw new HttpError(400, 'Add a phone number to use phone as your contact preference', {
      phone: 'Add a phone number to use phone as your contact preference',
    });
  }
  const updated = await User.findByIdAndUpdate(user._id, { $set: patch }, { returnDocument: 'after', runValidators: true });
  res.json({ user: updated.toPublic() });
}

/** Image only (jpeg / png / webp), max 2 MB. The stored name is random, never the uploaded one. */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(AVATAR_DIR, { recursive: true });
      cb(null, AVATAR_DIR);
    },
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}${TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  fileFilter: (req, file, cb) =>
    TYPES[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Upload a JPEG, PNG or WebP image')),
}).single('avatar');

function uploadAvatar(req, res, next) {
  upload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') throw new HttpError(400, 'Image must be 2 MB or smaller');
        throw err;
      }
      if (!req.file) throw new HttpError(400, 'Choose an image to upload');
      const user = await load(req);
      const old = user.avatarUrl && path.join(AVATAR_DIR, path.basename(user.avatarUrl));
      user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
      await user.save();
      if (old) fs.promises.unlink(old).catch(() => {});
      res.json({ user: user.toPublic() });
    } catch (e) {
      if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
      next(e);
    }
  });
}

module.exports = { updateProfile, updateSettings, uploadAvatar };

const mongoose = require('mongoose');
const User = require('../models/User');
const { HttpError } = require('../../../core/errors');

const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));

/**
 * POST /alumni-request { gradYear, note }: a verified student asks to be recognised as alumni.
 * There is no automatic check: an admin approves each request by hand (docs/PROJECT_PLAN.md section 10).
 */
async function requestAlumni(req, res) {
  if (!isObjectId(req.user.id)) throw new HttpError(400, 'The demo user cannot request alumni status');
  const gradYear = String(req.body?.gradYear ?? '').trim();
  const note = String(req.body?.note ?? '').trim().slice(0, 300);
  const year = Number(gradYear);
  const thisYear = new Date().getFullYear();
  if (!/^\d{4}$/.test(gradYear) || year < 1990 || year > thisYear) {
    throw new HttpError(400, `Enter your graduation year (1990 to ${thisYear})`, { gradYear: `Enter your graduation year (1990 to ${thisYear})` });
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Authentication required');
  if (user.role !== 'student') throw new HttpError(409, 'Your account already has a role that does not need alumni verification');
  if (user.alumniStatus === 'pending') throw new HttpError(409, 'Your request is already waiting for review');

  user.alumniStatus = 'pending';
  user.alumniGradYear = gradYear;
  user.alumniNote = note;
  user.alumniRequestedAt = new Date();
  await user.save();
  res.status(201).json({ user: user.toPublic() });
}

/** GET /alumni-requests?status=pending|approved|rejected (admin). No email or phone: name, school, batch and the claim only. */
async function listRequests(req, res) {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const users = await User.find({ alumniStatus: status }).sort({ alumniRequestedAt: 1 }).limit(100);
  res.json({
    items: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      department: u.department,
      batch: u.batch,
      gradYear: u.alumniGradYear,
      note: u.alumniNote,
      status: u.alumniStatus,
      requestedAt: u.alumniRequestedAt,
    })),
  });
}

async function review(req, res, decision) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Request not found');
  const user = await User.findById(req.params.id);
  if (!user || user.alumniStatus !== 'pending') throw new HttpError(404, 'No pending request for this user');
  user.alumniStatus = decision;
  if (decision === 'approved' && user.role === 'student') user.role = 'alumni';
  await user.save();
  res.json({ id: String(user._id), status: user.alumniStatus, role: user.role });
}

const approve = (req, res) => review(req, res, 'approved');
const reject = (req, res) => review(req, res, 'rejected');

module.exports = { requestAlumni, listRequests, approve, reject };

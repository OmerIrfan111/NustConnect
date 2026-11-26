const mongoose = require('mongoose');

/**
 * True when queries can run. Without MongoDB (dev without a database, or tests) the public map and guide endpoints serve
 * their built-in sample data instead of hanging on a buffered query. `campusAssumeDb` is a test hook.
 */
const dbReady = (req) => req?.app?.locals?.campusAssumeDb === true || mongoose.connection.readyState === 1;

module.exports = { dbReady };

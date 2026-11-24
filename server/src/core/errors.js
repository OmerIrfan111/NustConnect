/** HttpError + central Express error handling. Every API error is `{ status, message, error, details? }` (`error` repeats `message` as a string). */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

const notFound = (req, res, next) => next(new HttpError(404, `Not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = 'Validation failed';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = 'Duplicate value';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err.name === 'MulterError') {
    status = 400;
  }

  if (status >= 500) {
    if (process.env.NODE_ENV !== 'test') console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Internal server error';
  }
  // `message` + `error` (string) at the top level is what client/src/core/api/http.js reads.
  res.status(status).json({ status, message, error: message, ...(details ? { details } : {}) });
};

module.exports = { HttpError, notFound, errorHandler };

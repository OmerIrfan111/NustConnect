/** MongoDB connection. */
const mongoose = require('mongoose');
const config = require('./config');

async function connectDb(uri = config.mongoUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log(`[db] connected to ${mongoose.connection.name}`);
  return mongoose.connection;
}

const dbState = () =>
  ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';

const disconnectDb = () => mongoose.disconnect();

module.exports = { connectDb, disconnectDb, dbState };

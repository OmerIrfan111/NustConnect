/** Server entry point: `npm run dev` / `npm start` in /server. */
const config = require('./config');
const { connectDb, disconnectDb } = require('./db');
const { createApp } = require('./app');

async function main() {
  try {
    await connectDb();
  } catch (err) {
    if (config.isProduction) throw err;
    // In development the API still starts so module stubs can be worked on without MongoDB running.
    console.warn(`[db] could not connect to ${config.mongoUri} (${err.message}). Continuing without a database.`);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    const slugs = [...app.locals.modules.keys()].join(', ');
    console.log(`[server] http://localhost:${config.port}  modules: ${slugs}`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDb().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

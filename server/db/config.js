const path = require('path');

function ensureServerCwd() {
  const serverDir = path.resolve(__dirname, '..');
  if (process.cwd() !== serverDir) {
    process.chdir(serverDir);
  }
}

function getDatabaseConfig() {
  ensureServerCwd();

  const configuredUrl = process.env.DATABASE_URL;
  const url = configuredUrl && configuredUrl.trim()
    ? configuredUrl.trim()
    : 'file:lifesaver.db';

  return {
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined
  };
}

module.exports = {
  ensureServerCwd,
  getDatabaseConfig
};

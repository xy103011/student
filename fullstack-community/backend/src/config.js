const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'site-config.json');
const LOCK_FILE = path.join(DATA_DIR, 'install.lock');

function readSiteConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    return null;
  }
}

function getSiteConfig() {
  return (
    readSiteConfig() || {
      siteName: '全栈 AI 社区',
      siteDescription: '一个面向 AI 软件的社区平台',
      jwtSecret: process.env.JWT_SECRET || 'fullstack-community-dev-secret',
    }
  );
}

function getJwtSecret() {
  return getSiteConfig().jwtSecret;
}

function isInstalled() {
  return fs.existsSync(LOCK_FILE);
}

module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_EXPIRES: '7d',
  DATA_DIR,
  CONFIG_FILE,
  LOCK_FILE,
  getSiteConfig,
  getJwtSecret,
  isInstalled,
};

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { CONFIG_FILE, LOCK_FILE, DATA_DIR, getSiteConfig, isInstalled } = require('../config');

const router = express.Router();

router.get('/status', (req, res) => {
  const config = getSiteConfig();
  res.json({
    installed: isInstalled(),
    site: { name: config.siteName, description: config.siteDescription },
  });
});

router.get('/check', (req, res) => {
  const checks = [];

  const nodeVer = process.versions.node;
  checks.push({
    name: 'Node.js 运行时',
    ok: !!nodeVer,
    detail: nodeVer ? `v${nodeVer}` : '未检测到',
  });

  let dirWritable = false;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    dirWritable = true;
  } catch (e) {
    dirWritable = false;
  }
  checks.push({
    name: '数据目录可写',
    ok: dirWritable,
    detail: dirWritable ? DATA_DIR : `${DATA_DIR}（无写入权限）`,
  });

  let dbOk = false;
  let dbDetail = '异常';
  try {
    db.prepare('SELECT 1 AS x').get();
    dbOk = true;
    dbDetail = '正常';
  } catch (e) {
    dbOk = false;
    dbDetail = e.message;
  }
  checks.push({ name: 'SQLite 数据库', ok: dbOk, detail: dbDetail });

  const installed = isInstalled();
  checks.push({
    name: '安装状态',
    ok: !installed,
    detail: installed ? '已安装（如需重装请删除 install.lock）' : '未安装',
  });

  res.json({ checks, allPass: checks.every((c) => c.ok) });
});

router.post('/', (req, res) => {
  if (isInstalled()) {
    return res.status(400).json({ error: '网站已安装，如需重装请删除数据目录下的 install.lock' });
  }

  const { siteName, siteDescription, username, email, password } = req.body || {};

  if (!siteName || !String(siteName).trim()) {
    return res.status(400).json({ error: '请填写站点名称' });
  }
  if (String(siteName).trim().length > 40) {
    return res.status(400).json({ error: '站点名称不能超过 40 个字符' });
  }
  if (!username || String(username).trim().length < 2 || String(username).trim().length > 20) {
    return res.status(400).json({ error: '管理员用户名长度需在 2-20 个字符之间' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: '密码至少需要 6 位' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .get(String(username).trim(), String(email).trim());
  if (exists) {
    return res.status(409).json({ error: '用户名或邮箱已被占用' });
  }

  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const siteConfig = {
    siteName: String(siteName).trim(),
    siteDescription: String(siteDescription || '').trim(),
    jwtSecret,
    installedAt: new Date().toISOString(),
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(siteConfig, null, 2));

  const hash = bcrypt.hashSync(String(password), 10);
  const color = '#6366f1';
  const info = db.prepare(
    "INSERT INTO users (username, email, password_hash, bio, avatar_color, role) VALUES (?, ?, ?, ?, ?, 'admin')"
  ).run(String(username).trim(), String(email).trim(), hash, '管理员', color);

  fs.writeFileSync(LOCK_FILE, `installed at ${new Date().toISOString()}\n`);

  res.json({
    ok: true,
    site: { name: siteConfig.siteName, description: siteConfig.siteDescription },
    adminId: info.lastInsertRowid,
  });
});

module.exports = router;

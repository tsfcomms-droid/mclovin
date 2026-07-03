const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ADMIN_FILE = path.join(__dirname, '..', 'data', 'admin.json');
const INITIAL_PW_FILE = path.join(__dirname, '..', 'data', 'INITIAL_ADMIN_PASSWORD.txt');

function readAdmin() {
  if (!fs.existsSync(ADMIN_FILE)) return null;
  return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
}

function writeAdmin(admin) {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
}

function setPassword(plainPassword) {
  const hash = bcrypt.hashSync(plainPassword, 12);
  writeAdmin({ username: 'admin', passwordHash: hash });
}

// Called once at startup. If ADMIN_PASSWORD env var is set, it always
// wins (lets the vendor set a known password via .env). Otherwise, if no
// admin.json exists yet, generate a random password and drop it in a
// one-time-read text file next to the data folder.
function ensureAdminInitialized() {
  if (process.env.ADMIN_PASSWORD) {
    setPassword(process.env.ADMIN_PASSWORD);
    if (fs.existsSync(INITIAL_PW_FILE)) fs.unlinkSync(INITIAL_PW_FILE);
    return;
  }

  if (readAdmin()) return;

  const randomPassword = crypto.randomBytes(9).toString('base64url');
  setPassword(randomPassword);
  fs.writeFileSync(
    INITIAL_PW_FILE,
    `McLovin EU admin panel - initial password\n\n` +
      `Username: admin\n` +
      `Password: ${randomPassword}\n\n` +
      `Log in at /admin/login, then change this password from the dashboard.\n` +
      `This file is safe to delete once you've logged in and changed the password.\n`
  );
  // eslint-disable-next-line no-console
  console.log(`\n[McLovin EU] No admin password set. Generated one-time password, saved to: ${INITIAL_PW_FILE}\n`);
}

function verifyPassword(plainPassword) {
  const admin = readAdmin();
  if (!admin) return false;
  return bcrypt.compareSync(plainPassword, admin.passwordHash);
}

module.exports = {
  ensureAdminInitialized,
  verifyPassword,
  setPassword,
};

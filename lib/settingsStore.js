const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'settings.json');

const DEFAULTS = {
  orderUrl: '',
  bannerText: '',
  bannerEnabled: false,
};

function readSettings() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return Object.assign({}, DEFAULTS, JSON.parse(raw));
  } catch {
    return Object.assign({}, DEFAULTS);
  }
}

function writeSettings(settings) {
  const tmpFile = DATA_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(settings, null, 2));
  fs.renameSync(tmpFile, DATA_FILE);
}

function updateSettings(updates) {
  const settings = readSettings();
  if (typeof updates.orderUrl === 'string') settings.orderUrl = updates.orderUrl.trim();
  if (typeof updates.bannerText === 'string') settings.bannerText = updates.bannerText.trim();
  if (typeof updates.bannerEnabled === 'boolean') settings.bannerEnabled = updates.bannerEnabled;
  writeSettings(settings);
  return settings;
}

module.exports = { readSettings, updateSettings };

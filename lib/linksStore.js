const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'links.json');

function readLinks() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeLinks(links) {
  const tmpFile = DATA_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(links, null, 2));
  fs.renameSync(tmpFile, DATA_FILE);
}

function getAllSorted() {
  return readLinks().sort((a, b) => a.order - b.order);
}

function getEnabledSorted() {
  return getAllSorted().filter((l) => l.enabled);
}

function addLink({ label, url, icon }) {
  const links = readLinks();
  const maxOrder = links.reduce((max, l) => Math.max(max, l.order), 0);
  const newLink = {
    id: crypto.randomBytes(6).toString('hex'),
    label,
    url,
    icon: icon || 'link',
    enabled: true,
    order: maxOrder + 1,
  };
  links.push(newLink);
  writeLinks(links);
  return newLink;
}

function updateLink(id, updates) {
  const links = readLinks();
  const link = links.find((l) => l.id === id);
  if (!link) return null;
  if (typeof updates.label === 'string') link.label = updates.label;
  if (typeof updates.url === 'string') link.url = updates.url;
  if (typeof updates.icon === 'string') link.icon = updates.icon;
  if (typeof updates.enabled === 'boolean') link.enabled = updates.enabled;
  writeLinks(links);
  return link;
}

function deleteLink(id) {
  let links = readLinks();
  links = links.filter((l) => l.id !== id);
  writeLinks(links);
}

function moveLink(id, direction) {
  const links = getAllSorted();
  const index = links.findIndex((l) => l.id === id);
  if (index === -1) return;
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= links.length) return;
  const a = links[index];
  const b = links[swapIndex];
  const tmp = a.order;
  a.order = b.order;
  b.order = tmp;
  writeLinks(links);
}

module.exports = {
  getAllSorted,
  getEnabledSorted,
  addLink,
  updateLink,
  deleteLink,
  moveLink,
};

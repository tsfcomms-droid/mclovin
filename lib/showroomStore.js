const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'showroom.json');
const VIDEOS_DIR = path.join(__dirname, '..', 'public', 'videos');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

function readItems() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const items = JSON.parse(raw);
  return items.map((item) => {
    // Migrate old grams/price → gramTiers
    if (!item.gramTiers) {
      const tier = { grams: item.grams || '', price: item.price || '' };
      item.gramTiers = (tier.grams || tier.price) ? [tier] : [];
      delete item.grams;
      delete item.price;
    }
    if (!item.category) item.category = 'weed';
    if (typeof item.inStock === 'undefined') item.inStock = true;
    if (typeof item.featured === 'undefined') item.featured = false;
    if (typeof item.imageFilename === 'undefined') item.imageFilename = null;
    return item;
  });
}

function writeItems(items) {
  const tmpFile = DATA_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(items, null, 2));
  fs.renameSync(tmpFile, DATA_FILE);
}

function getAllSorted() {
  return readItems().sort((a, b) => a.order - b.order);
}

function getEnabledSorted() {
  return getAllSorted().filter((i) => i.enabled);
}

function deleteVideoFile(filename) {
  if (!filename) return;
  const filePath = path.join(VIDEOS_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function deleteImageFile(filename) {
  if (!filename) return;
  const filePath = path.join(IMAGES_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function addItem({ title, currency, gramTiers, category, description, videoFilename, imageFilename, inStock, featured }) {
  const items = readItems();
  const maxOrder = items.reduce((max, i) => Math.max(max, i.order), 0);
  const newItem = {
    id: crypto.randomBytes(6).toString('hex'),
    title,
    currency: currency || 'EUR',
    gramTiers: gramTiers || [],
    category: category || 'weed',
    description: description || '',
    videoFilename: videoFilename || null,
    imageFilename: imageFilename || null,
    inStock: inStock !== false,
    featured: featured || false,
    enabled: true,
    order: maxOrder + 1,
  };
  items.push(newItem);
  writeItems(items);
  return newItem;
}

function updateItem(id, updates) {
  const items = readItems();
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  if (typeof updates.title === 'string') item.title = updates.title;
  if (typeof updates.currency === 'string') item.currency = updates.currency;
  if (Array.isArray(updates.gramTiers)) item.gramTiers = updates.gramTiers;
  if (typeof updates.category === 'string') item.category = updates.category;
  if (typeof updates.description === 'string') item.description = updates.description;
  if (typeof updates.enabled === 'boolean') item.enabled = updates.enabled;
  if (typeof updates.inStock === 'boolean') item.inStock = updates.inStock;
  if (typeof updates.featured === 'boolean') item.featured = updates.featured;
  if (updates.videoFilename) {
    deleteVideoFile(item.videoFilename);
    item.videoFilename = updates.videoFilename;
  }
  if (updates.imageFilename) {
    deleteImageFile(item.imageFilename);
    item.imageFilename = updates.imageFilename;
  }
  writeItems(items);
  return item;
}

function deleteItem(id) {
  const items = readItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    deleteVideoFile(item.videoFilename);
    deleteImageFile(item.imageFilename);
  }
  writeItems(items.filter((i) => i.id !== id));
}

function moveItem(id, direction) {
  const items = getAllSorted();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return;
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= items.length) return;
  const a = items[index];
  const b = items[swapIndex];
  const tmp = a.order;
  a.order = b.order;
  b.order = tmp;
  writeItems(items);
}

module.exports = {
  getAllSorted,
  getEnabledSorted,
  addItem,
  updateItem,
  deleteItem,
  moveItem,
};

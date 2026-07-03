require('dotenv').config();
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, 'public', 'img', 'logo.jpg');

const linksStore = require('./lib/linksStore');
const showroomStore = require('./lib/showroomStore');
const adminAuth = require('./lib/adminAuth');
const settingsStore = require('./lib/settingsStore');
const { uploadMedia } = require('./lib/videoUpload');

adminAuth.ensureAdminInitialized();

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    name: 'mclovin.sid',
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again later.',
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin/login');
}

const mediaFields = uploadMedia.fields([
  { name: 'video', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
]);

function handleUploadErrors(req, res, next) {
  mediaFields(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large (max 300MB for video, 20MB for photo).'
        : err.message;
      return res.redirect('/admin/showroom?message=' + encodeURIComponent(message));
    }
    next();
  });
}

// ---------- Public site ----------

app.get('/', (req, res) => {
  res.render('index', {
    links: linksStore.getEnabledSorted(),
    hasLogo: fs.existsSync(LOGO_PATH),
  });
});

app.get('/showroom', (req, res) => {
  res.render('showroom', {
    items: showroomStore.getEnabledSorted(),
    hasLogo: fs.existsSync(LOGO_PATH),
    settings: settingsStore.readSettings(),
  });
});

// ---------- Admin: auth ----------

app.get('/admin/login', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

app.post('/admin/login', loginLimiter, (req, res) => {
  const { password, remember } = req.body;
  if (password && adminAuth.verifyPassword(password)) {
    req.session.isAdmin = true;
    if (remember === 'on') {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    }
    return res.redirect('/admin');
  }
  res.status(401).render('admin/login', { error: 'Incorrect password.' });
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ---------- Admin: dashboard ----------

app.get('/admin', requireAdmin, (req, res) => {
  res.render('admin/dashboard', {
    links: linksStore.getAllSorted(),
    message: req.query.message || null,
    settings: settingsStore.readSettings(),
  });
});

app.post('/admin/links', requireAdmin, (req, res) => {
  const { label, url, icon } = req.body;
  if (label && url) {
    linksStore.addLink({ label: label.trim(), url: url.trim(), icon });
  }
  res.redirect('/admin?message=Link+added');
});

app.post('/admin/links/:id/update', requireAdmin, (req, res) => {
  const { label, url, icon } = req.body;
  const enabled = req.body.enabled === 'on';
  linksStore.updateLink(req.params.id, { label, url, icon, enabled });
  res.redirect('/admin?message=Link+updated');
});

app.post('/admin/links/:id/delete', requireAdmin, (req, res) => {
  linksStore.deleteLink(req.params.id);
  res.redirect('/admin?message=Link+deleted');
});

app.post('/admin/links/:id/move', requireAdmin, (req, res) => {
  const direction = req.body.direction === 'up' ? 'up' : 'down';
  linksStore.moveLink(req.params.id, direction);
  res.redirect('/admin');
});

// ---------- Admin: settings ----------

app.post('/admin/settings', requireAdmin, (req, res) => {
  settingsStore.updateSettings({
    orderUrl: req.body.orderUrl || '',
    bannerText: req.body.bannerText || '',
    bannerEnabled: req.body.bannerEnabled === 'on',
  });
  res.redirect('/admin?message=' + encodeURIComponent('Settings saved'));
});

// ---------- Admin: showroom ----------

app.get('/admin/showroom', requireAdmin, (req, res) => {
  res.render('admin/showroom', {
    items: showroomStore.getAllSorted(),
    message: req.query.message || null,
  });
});

app.post('/admin/showroom', requireAdmin, handleUploadErrors, (req, res) => {
  const { title, currency, description, category } = req.body;
  if (!title) {
    return res.redirect('/admin/showroom?message=' + encodeURIComponent('Title is required.'));
  }
  const gramsArr = [].concat(req.body.grams || []);
  const pricesArr = [].concat(req.body.price || []);
  const gramTiers = gramsArr
    .map((g, i) => ({ grams: (g || '').trim(), price: ((pricesArr[i] || '') + '').trim() }))
    .filter((t) => t.grams || t.price);

  const videoFile = req.files && req.files.video && req.files.video[0];
  const photoFile = req.files && req.files.photo && req.files.photo[0];

  showroomStore.addItem({
    title: title.trim(),
    currency: currency ? currency.trim() : 'EUR',
    gramTiers,
    category: category || 'weed',
    description: description ? description.trim() : '',
    videoFilename: videoFile ? videoFile.filename : null,
    imageFilename: photoFile ? photoFile.filename : null,
    inStock: req.body.inStock === 'on',
    featured: req.body.featured === 'on',
  });
  res.redirect('/admin/showroom?message=' + encodeURIComponent('Item added'));
});

app.post('/admin/showroom/:id/update', requireAdmin, handleUploadErrors, (req, res) => {
  const { title, currency, description, category } = req.body;
  const enabled = req.body.enabled === 'on';
  const inStock = req.body.inStock === 'on';
  const featured = req.body.featured === 'on';

  const gramsArr = [].concat(req.body.grams || []);
  const pricesArr = [].concat(req.body.price || []);
  const gramTiers = gramsArr
    .map((g, i) => ({ grams: (g || '').trim(), price: ((pricesArr[i] || '') + '').trim() }))
    .filter((t) => t.grams || t.price);

  const videoFile = req.files && req.files.video && req.files.video[0];
  const photoFile = req.files && req.files.photo && req.files.photo[0];

  showroomStore.updateItem(req.params.id, {
    title,
    currency,
    gramTiers,
    category,
    description,
    enabled,
    inStock,
    featured,
    videoFilename: videoFile ? videoFile.filename : null,
    imageFilename: photoFile ? photoFile.filename : null,
  });
  res.redirect('/admin/showroom?message=' + encodeURIComponent('Item updated'));
});

app.post('/admin/showroom/:id/delete', requireAdmin, (req, res) => {
  showroomStore.deleteItem(req.params.id);
  res.redirect('/admin/showroom?message=' + encodeURIComponent('Item deleted'));
});

app.post('/admin/showroom/:id/move', requireAdmin, (req, res) => {
  const direction = req.body.direction === 'up' ? 'up' : 'down';
  showroomStore.moveItem(req.params.id, direction);
  res.redirect('/admin/showroom');
});

app.post('/admin/password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!adminAuth.verifyPassword(currentPassword || '')) {
    return res.render('admin/dashboard', {
      links: linksStore.getAllSorted(),
      message: 'Current password is incorrect.',
      settings: settingsStore.readSettings(),
    });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.render('admin/dashboard', {
      links: linksStore.getAllSorted(),
      message: 'New password must be at least 8 characters.',
      settings: settingsStore.readSettings(),
    });
  }
  if (newPassword !== confirmPassword) {
    return res.render('admin/dashboard', {
      links: linksStore.getAllSorted(),
      message: 'New passwords do not match.',
      settings: settingsStore.readSettings(),
    });
  }
  adminAuth.setPassword(newPassword);
  res.redirect('/admin?message=Password+changed');
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`McLovin EU running at http://localhost:${PORT}`);
});

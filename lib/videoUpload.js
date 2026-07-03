const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const VIDEOS_DIR = path.join(__dirname, '..', 'public', 'videos');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']);
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEOS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    cb(null, `${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_VIDEO_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only video files (mp4, mov, webm) are allowed.'));
  },
});

// Handles both video and photo fields in a single multipart form
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === 'photo' ? IMAGES_DIR : VIDEOS_DIR);
  },
  filename: (req, file, cb) => {
    const fallback = file.fieldname === 'photo' ? '.jpg' : '.mp4';
    const ext = path.extname(file.originalname).toLowerCase() || fallback;
    cb(null, `${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const uploadMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_VIDEO_MIME.has(file.mimetype) || ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only video (mp4, mov, webm) or image (jpg, png, webp) files are allowed.'));
  },
});

module.exports = { upload, uploadMedia, MAX_FILE_SIZE };

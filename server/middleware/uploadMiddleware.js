const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure random filename; never trust user-supplied originalname
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTS.includes(ext) ? ext : '.jpg';
    cb(null, `${file.fieldname}-${Date.now()}-${randomName}${safeExt}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Prevent null-byte injection & path traversal attacks
  if (!file || !file.originalname || file.originalname.includes('\0') || file.originalname.includes('..')) {
    return cb(new Error('Invalid filename format detected.'));
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  const isExtAllowed = ALLOWED_EXTS.includes(ext);
  const isMimeAllowed = ALLOWED_MIMES.includes(mime);

  if (isExtAllowed && isMimeAllowed) {
    return cb(null, true);
  } else {
    return cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are permitted.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max per file
  },
  fileFilter: fileFilter
});

upload.fileFilter = fileFilter;

module.exports = upload;

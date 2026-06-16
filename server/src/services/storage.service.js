const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ─── Provider Detection ──────────────────────────────────────────────────
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
const isS3Configured = !!(process.env.S3_ACCESS_KEY_ID && process.env.S3_ENDPOINT);

// ─── Cloudinary Setup ────────────────────────────────────────────────────
let cloudinary;
if (isCloudinaryConfigured) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('☁️  Cloudinary storage configured');
}

// ─── S3 Setup ────────────────────────────────────────────────────────────
let s3;
if (isS3Configured && !isCloudinaryConfigured) {
  const AWS = require('aws-sdk');
  s3 = new AWS.S3({
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION || 'auto',
    signatureVersion: 'v4',
    s3ForcePathStyle: true,
  });
}

const BUCKET = process.env.S3_BUCKET || 'hrms-documents';

// ─── Upload File ─────────────────────────────────────────────────────────
const uploadFile = async (buffer, originalName, mimeType, folder, tenantId) => {
  const ext = path.extname(originalName) || '';

  // Priority: Cloudinary > S3 > Local
  if (isCloudinaryConfigured) {
    return uploadToCloudinary(buffer, originalName, mimeType, folder, tenantId);
  } else if (isS3Configured) {
    return uploadToS3(buffer, originalName, mimeType, folder, tenantId, ext);
  } else {
    return uploadToLocal(buffer, folder, tenantId, ext);
  }
};

// ─── Cloudinary Upload ──────────────────────────────────────────────────
async function uploadToCloudinary(buffer, originalName, mimeType, folder, tenantId) {
  const publicId = `hrms/${tenantId}/${folder}/${uuidv4()}`;

  // Determine resource type from MIME
  let resourceType = 'auto';
  if (mimeType.startsWith('image/')) resourceType = 'image';
  else if (mimeType.startsWith('video/')) resourceType = 'video';
  else resourceType = 'raw';

  // Upload via stream (from buffer, no temp file needed)
  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,
        folder: '', // public_id already includes folder
        overwrite: true,
        tags: [tenantId, folder],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    // Write buffer to the upload stream
    const { Readable } = require('stream');
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });

  return {
    key: result.public_id,
    url: result.secure_url,
    provider: 'cloudinary',
  };
}

// ─── S3 Upload ───────────────────────────────────────────────────────────
async function uploadToS3(buffer, originalName, mimeType, folder, tenantId, ext) {
  const key = `${tenantId}/${folder}/${uuidv4()}${ext}`;
  await s3.upload({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    Metadata: { tenantId, originalName },
  }).promise();
  const url = await getSignedUrl(key);
  return { key, url, provider: 's3' };
}

// ─── Local Upload ────────────────────────────────────────────────────────
function uploadToLocal(buffer, folder, tenantId, ext) {
  const targetDir = path.join(__dirname, '../../uploads', tenantId, folder);
  fs.mkdirSync(targetDir, { recursive: true });
  const fileName = `${uuidv4()}${ext}`;
  const filePath = path.join(targetDir, fileName);
  fs.writeFileSync(filePath, buffer);
  const relativeUrl = `/uploads/${tenantId}/${folder}/${fileName}`;
  return { key: relativeUrl, url: relativeUrl, provider: 'local' };
}

// ─── Get Signed URL ──────────────────────────────────────────────────────
const getSignedUrl = async (key, expiresInSeconds = 3600) => {
  if (isCloudinaryConfigured) {
    // Cloudinary URLs are already public; return optimized URL
    return cloudinary.url(key, { secure: true, sign_url: true });
  } else if (isS3Configured) {
    return new Promise((resolve, reject) => {
      s3.getSignedUrl('getObject', {
        Bucket: BUCKET, Key: key, Expires: expiresInSeconds,
      }, (err, url) => {
        if (err) return reject(err);
        resolve(url);
      });
    });
  } else {
    return key; // local path
  }
};

// ─── Delete File ─────────────────────────────────────────────────────────
const deleteFile = async (key) => {
  if (isCloudinaryConfigured) {
    try {
      // Try image first, then raw
      await cloudinary.uploader.destroy(key, { resource_type: 'image' });
    } catch {
      try { await cloudinary.uploader.destroy(key, { resource_type: 'raw' }); } catch {}
    }
  } else if (isS3Configured) {
    await s3.deleteObject({ Bucket: BUCKET, Key: key }).promise();
  } else {
    const filePath = path.join(__dirname, '../../', key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};

// ─── List Files ──────────────────────────────────────────────────────────
const listFiles = async (tenantId, folder) => {
  if (isCloudinaryConfigured) {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `hrms/${tenantId}/${folder}`,
      max_results: 500,
    });
    return (result.resources || []).map(r => ({
      key: r.public_id,
      url: r.secure_url,
      size: r.bytes,
      lastModified: r.created_at,
    }));
  } else if (isS3Configured) {
    const prefix = `${tenantId}/${folder}/`;
    const result = await s3.listObjectsV2({ Bucket: BUCKET, Prefix: prefix }).promise();
    return (result.Contents || []).map(obj => ({
      key: obj.Key, size: obj.Size, lastModified: obj.LastModified,
    }));
  } else {
    const targetDir = path.join(__dirname, '../../uploads', tenantId, folder);
    if (!fs.existsSync(targetDir)) return [];
    return fs.readdirSync(targetDir).map(file => {
      const stats = fs.statSync(path.join(targetDir, file));
      return { key: `/uploads/${tenantId}/${folder}/${file}`, size: stats.size, lastModified: stats.mtime };
    });
  }
};

// ─── Multer Helper ───────────────────────────────────────────────────────
const uploadMulterFile = async (file, folder, tenantId) => {
  return uploadFile(file.buffer, file.originalname, file.mimetype, folder, tenantId);
};

module.exports = { uploadFile, uploadMulterFile, getSignedUrl, deleteFile, listFiles };

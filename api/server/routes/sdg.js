const fs = require('fs');
const multer = require('multer');
const express = require('express');
const { logger } = require('@librechat/data-schemas');
const { storage } = require('~/server/routes/files/multer');
const { checkBan, uaParser, requireJwtAuth, configMiddleware, createFileLimiters } = require('~/server/middleware');
const {
  mapSDGInput,
  MAX_SDG_INPUT_TEXT_LENGTH,
  SDG_UPLOAD_FILE_SIZE_LIMIT_BYTES,
  normalizeSDGUploadMimeType,
  isSDGUploadMimeType,
} = require('@librechat/api');

const router = express.Router();

const upload = multer({
  storage,
  limits: {
    fileSize: SDG_UPLOAD_FILE_SIZE_LIMIT_BYTES,
    fieldSize: MAX_SDG_INPUT_TEXT_LENGTH * 4,
    files: 1,
    fields: 4,
  },
  fileFilter: (_req, file, callback) => {
    const normalizedMimeType = normalizeSDGUploadMimeType({
      fileName: file.originalname,
      mimeType: file.mimetype,
    });
    file.mimetype = normalizedMimeType;
    if (isSDGUploadMimeType(normalizedMimeType) === false) {
      callback(new Error(`Unsupported SDG file type: ${normalizedMimeType}`), false);
      return;
    }
    callback(null, true);
  },
});

const getSDGErrorStatusCode = (error) => {
  if (typeof error?.statusCode === 'number') {
    return error.statusCode;
  }
  return 500;
};

const getSDGErrorMessage = (error, fallbackMessage) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallbackMessage;
};

const uploadSingleFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error?.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        message: `SDG uploads are limited to ${Math.round(SDG_UPLOAD_FILE_SIZE_LIMIT_BYTES / (1024 * 1024))} MB.`,
      });
      return;
    }
    res.status(400).json({
      message: getSDGErrorMessage(error, 'Failed to process the uploaded SDG file.'),
    });
  });
};

router.use(requireJwtAuth);
router.use(configMiddleware);
router.use(checkBan);
router.use(uaParser);

const { fileUploadIpLimiter, fileUploadUserLimiter } = createFileLimiters();

router.post(
  '/',
  fileUploadIpLimiter,
  fileUploadUserLimiter,
  uploadSingleFile,
  async (req, res) => {
    const inputText = req.body?.inputText ?? null;
    const sourceLanguage = req.body?.sourceLanguage ?? null;

    try {
      const response = await mapSDGInput({
        file: req.file,
        inputText: typeof inputText === 'string' ? inputText : null,
        sourceLanguage: typeof sourceLanguage === 'string' ? sourceLanguage : null,
      });
      return res.status(200).json(response);
    } catch (error) {
      logger.error('[sdg] Failed to map SDG input', error);
      return res
        .status(getSDGErrorStatusCode(error))
        .json({ message: getSDGErrorMessage(error, 'The SDG analysis could not be completed.') });
    } finally {
      if (req.file?.path) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
    }
  },
);

module.exports = router;

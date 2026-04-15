const rateLimit = require('express-rate-limit');
const { ViolationTypes } = require('librechat-data-provider');
const { limiterCache, removePorts } = require('@librechat/api');
const { logViolation } = require('~/cache');

const {
  VERIFY_EMAIL_WINDOW = 2,
  VERIFY_EMAIL_MAX = 2,
  VERIFY_EMAIL_VIOLATION_SCORE: score,
} = process.env;
const windowMs = VERIFY_EMAIL_WINDOW * 60 * 1000;
const max = VERIFY_EMAIL_MAX;
const windowInMinutes = windowMs / 60000;
const message = `Too many attempts, please try again after ${windowInMinutes} minute(s)`;

const handler = async (req, res) => {
  const type = ViolationTypes.VERIFY_EMAIL_LIMIT;
  const errorMessage = {
    type,
    max,
    windowInMinutes,
  };

  await logViolation(req, res, type, errorMessage, score);
  return res.status(429).json({ message });
};

const ipLimiter = rateLimit({
  windowMs,
  max,
  handler,
  keyGenerator: removePorts,
  store: limiterCache('verify_email_limiter'),
});

const emailKeyGenerator = (req) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `email:${email}`;
};

const emailLimiter = rateLimit({
  windowMs,
  max,
  handler,
  keyGenerator: emailKeyGenerator,
  store: limiterCache('verify_email_email_limiter'),
});

const verifyEmailLimiter = (req, res, next) => {
  ipLimiter(req, res, () => emailLimiter(req, res, next));
};

module.exports = verifyEmailLimiter;

import crypto from 'crypto';

/**
 * Generates a SHA-256 hash from a string
 * @param {string} data - The data to hash
 * @returns {string} - The SHA-256 hash
 */
export const generateSHA256 = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Validates Razorpay HMAC signature
 * @param {string} orderId 
 * @param {string} paymentId 
 * @param {string} signature 
 * @param {string} secret 
 * @returns {boolean}
 */
export const verifyRazorpaySignature = (orderId, paymentId, signature, secret) => {
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(orderId + "|" + paymentId)
    .digest('hex');

  return generatedSignature === signature;
};

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import Razorpay from 'razorpay';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { authenticateJWT } from './middleware/authMiddleware.js';
import { db } from './db/index.js';
import { users, qrVouchers, beneficiaries } from './db/schema.js';
import { generateSHA256, verifyRazorpaySignature } from './lib/crypto.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
let razorpayInstance;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ==========================================
// 1. Google OAuth & JWT Generation
// ==========================================
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing credential' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture: avatarUrl } = payload;

    // Upsert User
    let userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (userRecord.length === 0) {
      const insertedUser = await db.insert(users).values({
        name,
        email,
        googleId,
        avatarUrl,
        role: 'DONOR'
      }).returning();
      userRecord = insertedUser;
    } else {
      // Update existing
      userRecord = await db.update(users).set({ googleId, avatarUrl, name }).where(eq(users.email, email)).returning();
    }

    const user = userRecord[0];

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token, user });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

// ==========================================
// 2. Razorpay Orders
// ==========================================
app.post('/api/payment/create-order', authenticateJWT, async (req, res) => {
  const { packageId, beneficiaryId, amountInInr } = req.body;
  
  if (!razorpayInstance) return res.status(500).json({ error: 'Razorpay not configured' });

  try {
    const options = {
      amount: amountInInr * 100, // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${uuidv4().substring(0, 8)}`,
    };

    const order = await razorpayInstance.orders.create(options);

    // Insert into QR Vouchers
    const voucherHash = generateSHA256(`${order.id}-${Date.now()}`);
    
    await db.insert(qrVouchers).values({
      packageId,
      beneficiaryId,
      donorEmail: req.user.email,
      razorpayOrderId: order.id,
      voucherHash,
      status: 'PENDING_PAYMENT'
    });

    res.json({ order });
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

// ==========================================
// 3. Verify Razorpay Payment
// ==========================================
app.post('/api/payment/verify', authenticateJWT, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    process.env.RAZORPAY_KEY_SECRET
  );

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    await db.update(qrVouchers)
      .set({
        razorpayPaymentId: razorpay_payment_id,
        status: 'ISSUED',
        issuedAt: new Date()
      })
      .where(eq(qrVouchers.razorpayOrderId, razorpay_order_id));

    res.json({ success: true, message: 'Payment verified and voucher issued' });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// ==========================================
// 4. Beneficiary Registration (Zero-Trust)
// ==========================================
app.post('/api/beneficiaries/register', authenticateJWT, async (req, res) => {
  const { disasterZoneId, identityData, incomeEligibilityStatus } = req.body;
  
  try {
    // Generate Zero-Trust Identity Hash
    const proofOfHumanityHash = generateSHA256(JSON.stringify(identityData));

    // Anti-Sybil Check
    const existing = await db.select().from(beneficiaries).where(eq(beneficiaries.proofOfHumanityHash, proofOfHumanityHash));
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Beneficiary already registered (Hash Collision)' });
    }

    const inserted = await db.insert(beneficiaries).values({
      disasterZoneId,
      proofOfHumanityHash,
      incomeEligibilityStatus: incomeEligibilityStatus || 'ELIGIBLE'
    }).returning();

    res.json({ success: true, beneficiary: inserted[0] });
  } catch (error) {
    console.error('Beneficiary Registration Error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/', (req, res) => res.send('ClearTrust API Server is running'));

app.listen(port, () => console.log(`Server is running on port ${port}`));

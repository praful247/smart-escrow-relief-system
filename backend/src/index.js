import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import Razorpay from 'razorpay';
import { eq, and, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { authenticateJWT } from './middleware/authMiddleware.js';
import { requireRole } from './middleware/roleMiddleware.js';
import { db } from './db/index.js';
import { users, qrVouchers, beneficiaries, ngos, disasterZones, aidPackages } from './db/schema.js';
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
    const isProfileCompleted = Boolean(user.age && user.phone);

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, profileCompleted: isProfileCompleted },
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
  const { packageId, beneficiaryId, customAmount } = req.body;

  if (!razorpayInstance) return res.status(500).json({ error: 'Razorpay not configured' });

  try {
    // Check the package
    const pkgResult = await db.select().from(aidPackages).where(eq(aidPackages.id, packageId)).limit(1);
    if (pkgResult.length === 0) return res.status(404).json({ error: 'Package not found' });
    
    const pkg = pkgResult[0];
    let amountInInr = Number(pkg.priceInInr);
    
    if (customAmount) {
      if (!pkg.isCustomAmountAllowed) {
        return res.status(403).json({ error: 'Forbidden: Custom amount is not allowed for this package' });
      }
      amountInInr = Number(customAmount);
    }
    
    if (!amountInInr || amountInInr * 100 < 100) {
      return res.status(400).json({ error: 'Amount must be at least 1 INR' });
    }

    const options = {
      amount: Math.round(amountInInr * 100), // amount in smallest currency unit (paise)
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

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing required payment fields' });
  }

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
app.post('/api/beneficiaries/register', requireRole('FIELD_WORKER'), async (req, res) => {
  const { disasterZoneId, identityData, incomeEligibilityStatus } = req.body;
  
  if (!disasterZoneId) {
    return res.status(400).json({ error: 'disasterZoneId is required' });
  }

  try {
    // Voucher Assignment Pre-Check (Crucial)
    // Find ONE voucher where status = 'ISSUED' AND beneficiaryId IS NULL
    const availableVouchers = await db.select().from(qrVouchers)
      .where(and(eq(qrVouchers.status, 'ISSUED'), isNull(qrVouchers.beneficiaryId)))
      .limit(1);

    if (availableVouchers.length === 0) {
      return res.status(400).json({ error: 'No available pre-paid vouchers to assign.' });
    }

    const voucherToAssign = availableVouchers[0];

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
    
    const newBeneficiary = inserted[0];

    // Update that specific voucher record
    await db.update(qrVouchers)
      .set({ beneficiaryId: newBeneficiary.id })
      .where(eq(qrVouchers.id, voucherToAssign.id));

    res.json({ success: true, beneficiary: newBeneficiary, voucherHash: voucherToAssign.voucherHash });
  } catch (error) {
    console.error('Beneficiary Registration Error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ==========================================
// 5. User Profile Update
// ==========================================
app.put('/api/users/profile', authenticateJWT, async (req, res) => {
  const { role, age, gender, phone, registrationNumber, description, missionStatement } = req.body;
  
  try {
    const updated = await db.update(users)
      .set({ role, age, gender, phone })
      .where(eq(users.id, req.user.id))
      .returning();
      
    if (updated.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (role === 'NGO' && registrationNumber) {
      const existingNgo = await db.select().from(ngos).where(eq(ngos.userId, req.user.id));
      if (existingNgo.length === 0) {
        await db.insert(ngos).values({
          userId: req.user.id,
          registrationNumber,
          description,
          missionStatement,
          isVerified: false
        });
      } else {
        await db.update(ngos).set({
          registrationNumber,
          description,
          missionStatement
        }).where(eq(ngos.userId, req.user.id));
      }
    }
    
    const user = updated[0];
    const isProfileCompleted = Boolean(user.age && user.phone);
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, profileCompleted: isProfileCompleted },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    res.json({ success: true, token, user });
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ==========================================
// 6. NGO Marketplace Endpoints
// ==========================================

app.get('/api/ngos', async (req, res) => {
  try {
    const allNgos = await db.select({
      id: ngos.id,
      userId: ngos.userId,
      registrationNumber: ngos.registrationNumber,
      description: ngos.description,
      missionStatement: ngos.missionStatement,
      isVerified: ngos.isVerified,
      name: users.name,
      avatarUrl: users.avatarUrl
    })
    .from(ngos)
    .innerJoin(users, eq(ngos.userId, users.id))
    .where(eq(ngos.isVerified, true));
    
    res.json({ ngos: allNgos });
  } catch (error) {
    console.error('Fetch NGOs Error:', error);
    res.status(500).json({ error: 'Failed to fetch NGOs' });
  }
});

app.get('/api/ngos/:id', async (req, res) => {
  try {
    const ngoId = req.params.id;
    const ngoResult = await db.select({
      id: ngos.id,
      userId: ngos.userId,
      registrationNumber: ngos.registrationNumber,
      description: ngos.description,
      missionStatement: ngos.missionStatement,
      isVerified: ngos.isVerified,
      name: users.name,
      avatarUrl: users.avatarUrl
    })
    .from(ngos)
    .innerJoin(users, eq(ngos.userId, users.id))
    .where(eq(ngos.id, ngoId)).limit(1);
    
    if (ngoResult.length === 0) return res.status(404).json({ error: 'NGO not found' });
    
    const packages = await db.select().from(aidPackages).where(eq(aidPackages.ngoId, ngoId));
    
    res.json({ ngo: ngoResult[0], packages });
  } catch (error) {
    console.error('Fetch NGO details error:', error);
    res.status(500).json({ error: 'Failed to fetch NGO details' });
  }
});

// ==========================================
// 7. NGO Package Management
// ==========================================

app.post('/api/ngo/packages', requireRole('NGO'), async (req, res) => {
  try {
    const { title, priceInInr, isCustomAmountAllowed } = req.body;
    
    const ngoResult = await db.select().from(ngos).where(eq(ngos.userId, req.user.id)).limit(1);
    if (ngoResult.length === 0) return res.status(403).json({ error: 'NGO profile not found' });
    
    const ngoId = ngoResult[0].id;
    
    const inserted = await db.insert(aidPackages).values({
      ngoId,
      title,
      priceInInr,
      isCustomAmountAllowed: Boolean(isCustomAmountAllowed)
    }).returning();
    
    res.json({ success: true, package: inserted[0] });
  } catch (error) {
    console.error('Create Package Error:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

app.delete('/api/ngo/packages/:id', requireRole('NGO'), async (req, res) => {
  try {
    const packageId = req.params.id;
    
    const ngoResult = await db.select().from(ngos).where(eq(ngos.userId, req.user.id)).limit(1);
    if (ngoResult.length === 0) return res.status(403).json({ error: 'NGO profile not found' });
    const ngoId = ngoResult[0].id;
    
    const deleted = await db.delete(aidPackages)
      .where(and(eq(aidPackages.id, packageId), eq(aidPackages.ngoId, ngoId)))
      .returning();
      
    if (deleted.length === 0) return res.status(404).json({ error: 'Package not found or unauthorized' });
    
    res.json({ success: true, message: 'Package deleted' });
  } catch (error) {
    console.error('Delete Package Error:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

app.get('/', (req, res) => res.send('ClearTrust API Server is running'));

app.listen(port, () => console.log(`Server is running on port ${port}`));

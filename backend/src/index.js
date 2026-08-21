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
import { users, qrVouchers, beneficiaries, ngos, disasterZones, aidPackages, vendors, ngoWorkers } from './db/schema.js';
import { generateSHA256, verifyRazorpaySignature } from './lib/crypto.js';
import { calculateHaversineDistance } from './lib/geo.js';
import { ethers } from 'ethers';

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
    // If role is DONOR, they must have age and phone. If they picked another role, they are considered complete.
    // However, default role is DONOR, so new users will have isProfileCompleted = false.
    const isProfileCompleted = user.role === 'DONOR' ? Boolean(user.age && user.phone) : true;

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
      donorUserId: req.user.id,
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
    const voucherResult = await db.select().from(qrVouchers).where(eq(qrVouchers.razorpayOrderId, razorpay_order_id)).limit(1);
    if (voucherResult.length === 0) return res.status(404).json({ error: 'Voucher not found' });
    const voucher = voucherResult[0];

    const packageResult = await db.select().from(aidPackages).where(eq(aidPackages.id, voucher.packageId)).limit(1);
    const pkg = packageResult[0];

    // Blockchain Execution: Issue voucher on-chain
    const provider = new ethers.JsonRpcProvider(process.env.RAAS_RPC_URL);
    const wallet = new ethers.Wallet(process.env.BACKEND_ADMIN_PRIVATE_KEY, provider);
    const abi = ["function createVoucher(string memory _voucherHash, uint256 _amount) external"];
    const contract = new ethers.Contract(process.env.ESCROW_CONTRACT_ADDRESS, abi, wallet);
    
    // Parse the price as Ether (1 INR = 1 token for simplicity)
    const amountInWei = ethers.parseEther(pkg.priceInInr);
    const tx = await contract.createVoucher(voucher.voucherHash, amountInWei);
    await tx.wait();

    await db.update(qrVouchers)
      .set({
        razorpayPaymentId: razorpay_payment_id,
        status: 'ISSUED',
        issuedAt: new Date()
      })
      .where(eq(qrVouchers.razorpayOrderId, razorpay_order_id));

    res.json({ success: true, message: 'Payment verified and voucher issued on-chain' });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
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
    const isProfileCompleted = user.role === 'DONOR' ? Boolean(user.age && user.phone) : true;
    
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

// Get all verified NGOs (for Dropdown in Field Worker onboarding)
app.get('/api/ngos/verified', authenticateJWT, async (req, res) => {
  try {
    const verifiedNgos = await db.select({
      id: ngos.id,
      name: users.name,
      registrationNumber: ngos.registrationNumber
    })
    .from(ngos)
    .innerJoin(users, eq(ngos.userId, users.id))
    .where(eq(ngos.isVerified, true));
    
    res.json(verifiedNgos);
  } catch (error) {
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

app.get('/api/ngo/packages', authenticateJWT, requireRole('NGO'), async (req, res) => {
  try {
    const ngoResult = await db.select().from(ngos).where(eq(ngos.userId, req.user.id)).limit(1);
    if (ngoResult.length === 0) return res.status(403).json({ error: 'NGO profile not found' });
    
    const packages = await db.select().from(aidPackages).where(eq(aidPackages.ngoId, ngoResult[0].id));
    res.json({ packages });
  } catch (error) {
    console.error('Fetch Packages Error:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
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

// ==========================================
// 8. On-Chain Escrow Settlement API
// ==========================================
app.post('/api/vouchers/redeem', requireRole('VENDOR'), async (req, res) => {
  const { voucherHash, latitude, longitude } = req.body;
  
  if (!voucherHash || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing voucherHash, latitude, or longitude' });
  }

  try {
    console.log(`[Redeem API] Incoming voucherHash from Vendor: "${voucherHash}"`);
    
    // Look up the voucher
    const voucherResult = await db.select().from(qrVouchers).where(eq(qrVouchers.voucherHash, voucherHash)).limit(1);
    if (voucherResult.length === 0) {
      console.log(`[Redeem API] Voucher not found in DB!`);
      return res.status(404).json({ error: 'Voucher not found' });
    }
    
    const voucher = voucherResult[0];
    if (voucher.status !== 'ISSUED') {
      return res.status(400).json({ error: 'Voucher is not in ISSUED status' });
    }

    // Look up the vendor
    const vendorResult = await db.select().from(vendors).where(eq(vendors.userId, req.user.id)).limit(1);
    if (vendorResult.length === 0) return res.status(403).json({ error: 'Vendor profile not found' });
    
    const vendor = vendorResult[0];

    // Geofencing
    if (vendor.disasterZoneId) {
      const zoneResult = await db.select().from(disasterZones).where(eq(disasterZones.id, vendor.disasterZoneId)).limit(1);
      if (zoneResult.length > 0) {
        const zone = zoneResult[0];
        const distance = calculateHaversineDistance(
          Number(latitude), Number(longitude),
          Number(zone.centerLatitude), Number(zone.centerLongitude)
        );
        if (distance > Number(zone.radiusKm)) {
          return res.status(403).json({ error: 'Vendor is outside the authorized disaster zone' });
        }
      }
    }

    // Blockchain Execution
    const provider = new ethers.JsonRpcProvider(process.env.RAAS_RPC_URL);
    const wallet = new ethers.Wallet(process.env.BACKEND_ADMIN_PRIVATE_KEY, provider);
    
    // Minimal ABI for the escrow contract
    const abi = ["function redeemVoucher(string voucherHash, address vendor) external"];
    const contract = new ethers.Contract(process.env.ESCROW_CONTRACT_ADDRESS, abi, wallet);
    
    const tx = await contract.redeemVoucher(voucherHash, vendor.walletAddress);
    const receipt = await tx.wait(); // Wait for confirmation

    // Update DB
    await db.update(qrVouchers)
      .set({ status: 'REDEEMED', redeemedVendorId: vendor.id, txHash: receipt.hash })
      .where(eq(qrVouchers.id, voucher.id));

    res.json({ success: true, transactionHash: receipt.hash, message: 'Voucher redeemed successfully on-chain' });
  } catch (error) {
    console.error('Voucher Redeem Error:', error);
    res.status(500).json({ error: 'Failed to redeem voucher on-chain', details: error.message });
  }
});

// ==========================================
// Phase 7: Transparency Dashboards
// ==========================================

app.get('/api/donor/impact', authenticateJWT, requireRole('DONOR'), async (req, res) => {
  try {
    const impactData = await db.select({
      voucher: qrVouchers,
      package: aidPackages,
      ngo: ngos,
      vendor: vendors,
    })
    .from(qrVouchers)
    .leftJoin(aidPackages, eq(qrVouchers.packageId, aidPackages.id))
    .leftJoin(ngos, eq(aidPackages.ngoId, ngos.id))
    .leftJoin(vendors, eq(qrVouchers.redeemedVendorId, vendors.id))
    .where(eq(qrVouchers.donorUserId, req.user.id));

    res.json({ impact: impactData });
  } catch (error) {
    console.error('Donor Impact Error:', error);
    res.status(500).json({ error: 'Failed to fetch impact data' });
  }
});

app.get('/api/ngo/analytics', authenticateJWT, requireRole('NGO'), async (req, res) => {
  try {
    const ngoResult = await db.select().from(ngos).where(eq(ngos.userId, req.user.id)).limit(1);
    if (ngoResult.length === 0) return res.status(404).json({ error: 'NGO profile not found' });
    const ngoId = ngoResult[0].id;

    const analyticsData = await db.select({
      voucher: qrVouchers,
      package: aidPackages,
      vendor: vendors,
    })
    .from(qrVouchers)
    .innerJoin(aidPackages, eq(qrVouchers.packageId, aidPackages.id))
    .leftJoin(vendors, eq(qrVouchers.redeemedVendorId, vendors.id))
    .where(eq(aidPackages.ngoId, ngoId));

    // Aggregate Data
    let totalFundsRaised = 0;
    let vouchersIssued = 0;
    let vouchersRedeemed = 0;
    const vendorRedemptions = [];

    for (const row of analyticsData) {
      const price = Number(row.package.priceInInr);
      totalFundsRaised += price;

      if (row.voucher.status === 'ISSUED' || row.voucher.status === 'REDEEMED') {
        vouchersIssued++;
      }
      if (row.voucher.status === 'REDEEMED') {
        vouchersRedeemed++;
        if (row.vendor) {
          vendorRedemptions.push({
            vendorName: row.vendor.storeName,
            latitude: Number(row.vendor.latitude),
            longitude: Number(row.vendor.longitude),
            amount: price,
            txHash: row.voucher.txHash
          });
        }
      }
    }

    res.json({
      totalFundsRaised,
      vouchersIssued,
      vouchersRedeemed,
      vendorRedemptions
    });
  } catch (error) {
    console.error('NGO Analytics Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// ==========================================
// Phase 8: Admin Panel & Field Worker Linkage
// ==========================================

// Field Worker: Join an NGO
app.post('/api/field-workers/join', authenticateJWT, requireRole('FIELD_WORKER'), async (req, res) => {
  const { ngoId } = req.body;
  if (!ngoId) return res.status(400).json({ error: 'Missing ngoId' });

  try {
    // Check if worker is already linked to this or another NGO
    const existing = await db.select().from(ngoWorkers).where(eq(ngoWorkers.userId, req.user.id)).limit(1);
    
    if (existing.length > 0) {
      await db.update(ngoWorkers).set({ ngoId }).where(eq(ngoWorkers.userId, req.user.id));
    } else {
      await db.insert(ngoWorkers).values({ userId: req.user.id, ngoId });
    }
    
    res.json({ success: true, message: 'Successfully joined NGO' });
  } catch (error) {
    console.error('Field Worker Join Error:', error);
    res.status(500).json({ error: 'Failed to join NGO' });
  }
});

// Admin: Get all NGOs
app.get('/api/admin/ngos', authenticateJWT, requireRole('ADMIN'), async (req, res) => {
  try {
    const allNgos = await db.select({
      id: ngos.id,
      name: users.name, // users.name instead of ngos.name
      registrationNumber: ngos.registrationNumber,
      isVerified: ngos.isVerified,
      createdAt: users.createdAt, // Users table has createdAt, but wait, maybe ngos has createdAt? No, schema doesn't have it for ngos. I'll use users.createdAt.
      user: users
    })
    .from(ngos)
    .leftJoin(users, eq(ngos.userId, users.id));
    
    res.json(allNgos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch NGOs' });
  }
});

// Admin: Verify NGO
app.post('/api/admin/ngos/verify', authenticateJWT, requireRole('ADMIN'), async (req, res) => {
  const { ngoId, isVerified } = req.body;
  if (!ngoId) return res.status(400).json({ error: 'Missing ngoId' });

  try {
    await db.update(ngos).set({ isVerified: Boolean(isVerified) }).where(eq(ngos.id, ngoId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update NGO verification status' });
  }
});

// Admin: Stats
app.get('/api/admin/stats', authenticateJWT, requireRole('ADMIN'), async (req, res) => {
  try {
    // We'll just do basic row counts for a quick dashboard
    const usersCount = (await db.select().from(users)).length;
    const ngosCount = (await db.select().from(ngos)).length;
    const vouchersCount = (await db.select().from(qrVouchers)).length;
    const vendorsCount = (await db.select().from(vendors)).length;

    res.json({ usersCount, ngosCount, vouchersCount, vendorsCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

app.get('/api/field-workers/available-packages', authenticateJWT, requireRole('FIELD_WORKER'), async (req, res) => {
  try {
    const workerLink = await db.select().from(ngoWorkers).where(eq(ngoWorkers.userId, req.user.id)).limit(1);
    if (workerLink.length === 0) return res.status(403).json({ error: 'You are not linked to any NGO' });
    const ngoId = workerLink[0].ngoId;

    const packages = await db.select().from(aidPackages).where(eq(aidPackages.ngoId, ngoId));
    
    const availablePackages = [];
    for (const pkg of packages) {
      const vouchers = await db.select()
        .from(qrVouchers)
        .where(and(
          eq(qrVouchers.packageId, pkg.id),
          eq(qrVouchers.status, 'ISSUED'),
          isNull(qrVouchers.beneficiaryId)
        ));
      
      availablePackages.push({
        ...pkg,
        availableCount: vouchers.length
      });
    }

    res.json({ packages: availablePackages });
  } catch (error) {
    console.error('Available Packages Error:', error);
    res.status(500).json({ error: 'Failed to fetch available packages' });
  }
});

// Field Worker: Register Beneficiary
app.post('/api/beneficiaries/register', authenticateJWT, requireRole('FIELD_WORKER'), async (req, res) => {
  const { identityData, packageId } = req.body;
  if (!identityData || !packageId) return res.status(400).json({ error: 'Missing identity data or packageId' });

  try {
    // 1. Get worker's linked NGO
    const workerLink = await db.select().from(ngoWorkers).where(eq(ngoWorkers.userId, req.user.id)).limit(1);
    if (workerLink.length === 0) return res.status(403).json({ error: 'You are not linked to any NGO. Join an NGO first.' });
    const ngoId = workerLink[0].ngoId;

    // 2. Find an available voucher for this NGO's packages and specified packageId
    // Join qrVouchers and aidPackages where aidPackages.ngoId = ngoId and qrVouchers.status = 'PENDING_PAYMENT'
    const availableVoucherRows = await db.select({
      voucher: qrVouchers
    })
    .from(qrVouchers)
    .innerJoin(aidPackages, eq(qrVouchers.packageId, aidPackages.id))
    .where(and(
      eq(aidPackages.ngoId, ngoId),
      eq(qrVouchers.packageId, packageId),
      eq(qrVouchers.status, 'ISSUED'),
      isNull(qrVouchers.beneficiaryId)
    ))
    .limit(1);

    if (availableVoucherRows.length === 0) {
      return res.status(400).json({ error: 'No funded vouchers available for this NGO. Please wait for more donations.' });
    }
    const voucher = availableVoucherRows[0].voucher;

    // 3. Create Beneficiary
    // Need a disasterZoneId. We can fetch any disaster zone for this NGO.
    const zones = await db.select().from(disasterZones).where(eq(disasterZones.ngoId, ngoId)).limit(1);
    let disasterZoneId = null;
    if (zones.length > 0) disasterZoneId = zones[0].id;
    // If no zone exists, we could create one or leave it null. Our schema says disasterZoneId is notNull.
    // Let's create a generic zone if none exists for the NGO to satisfy the FK.
    if (!disasterZoneId) {
      const insertedZone = await db.insert(disasterZones).values({
        ngoId,
        name: 'General Aid Zone',
        centerLatitude: '0.00000000',
        centerLongitude: '0.00000000',
        radiusKm: '100.00'
      }).returning();
      disasterZoneId = insertedZone[0].id;
    }

    const proofOfHumanityHash = generateSHA256(JSON.stringify(identityData));

    // Anti-Sybil Check
    const existing = await db.select().from(beneficiaries).where(eq(beneficiaries.proofOfHumanityHash, proofOfHumanityHash));
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Beneficiary already registered (Hash Collision)' });
    }

    const insertedBeneficiary = await db.insert(beneficiaries).values({
      disasterZoneId,
      identityData: identityData,
      proofOfHumanityHash,
      incomeEligibilityStatus: 'VERIFIED'
    }).returning();
    const beneficiaryId = insertedBeneficiary[0].id;

    // 4. Update Voucher
    await db.update(qrVouchers)
      .set({ beneficiaryId, status: 'ISSUED' })
      .where(eq(qrVouchers.id, voucher.id));

    res.json({ success: true, voucherHash: voucher.voucherHash });
  } catch (error) {
    console.error('Register Beneficiary Error:', error);
    res.status(500).json({ error: 'Failed to register beneficiary' });
  }
});

app.get('/', (req, res) => res.send('ClearTrust API Server is running'));

app.listen(port, () => console.log(`Server is running on port ${port}`));

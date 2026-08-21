import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

// 1. Users Table (Google OAuth + JWT Auth)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  googleId: text('google_id'),
  avatarUrl: text('avatar_url'),
  role: varchar('role', { length: 50 }).default('DONOR').notNull(), // DONOR, FIELD_WORKER, VENDOR, ADMIN
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Disaster Zones
export const disasterZones = pgTable('disaster_zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  centerLatitude: decimal('center_latitude', { precision: 10, scale: 8 }).notNull(),
  centerLongitude: decimal('center_longitude', { precision: 11, scale: 8 }).notNull(),
  radiusKm: decimal('radius_km', { precision: 6, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Onboarded Vendors
export const vendors = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  disasterZoneId: uuid('disaster_zone_id').references(() => disasterZones.id, { onDelete: 'cascade' }),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  storeName: varchar('store_name', { length: 255 }).notNull(),
  ownerName: varchar('owner_name', { length: 255 }).notNull(),
  vendorType: varchar('vendor_type', { length: 50 }).default('FIXED_STORE').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Beneficiaries (Zero-Trust Identity)
export const beneficiaries = pgTable('beneficiaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  disasterZoneId: uuid('disaster_zone_id').references(() => disasterZones.id, { onDelete: 'cascade' }),
  proofOfHumanityHash: varchar('proof_of_humanity_hash', { length: 64 }).notNull().unique(), // SHA-256
  incomeEligibilityStatus: varchar('income_eligibility_status', { length: 50 }).default('ELIGIBLE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Aid Packages Catalog
export const aidPackages = pgTable('aid_packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priceInInr: decimal('price_in_inr', { precision: 10, scale: 2 }).notNull(),
  itemsSummary: jsonb('items_summary').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. QR Vouchers & Razorpay Payment Tracking
export const qrVouchers = pgTable('qr_vouchers', {
  id: uuid('id').defaultRandom().primaryKey(),
  packageId: uuid('package_id').references(() => aidPackages.id),
  beneficiaryId: uuid('beneficiary_id').references(() => beneficiaries.id),
  donorEmail: varchar('donor_email', { length: 255 }).notNull(),
  razorpayOrderId: varchar('razorpay_order_id', { length: 255 }).notNull().unique(),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 255 }),
  voucherHash: varchar('voucher_hash', { length: 64 }).notNull().unique(),
  status: varchar('status', { length: 50 }).default('PENDING_PAYMENT').notNull(), // PENDING_PAYMENT, ISSUED, REDEEMED, EXPIRED
  issuedAt: timestamp('issued_at'),
  redeemedAt: timestamp('redeemed_at'),
  redeemedVendorId: uuid('redeemed_vendor_id').references(() => vendors.id),
});

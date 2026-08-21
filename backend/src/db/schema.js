import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

// 1. Users Table (Updated with Deep Profile & RBAC)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  googleId: text('google_id'),
  avatarUrl: text('avatar_url'),
  role: varchar('role', { length: 50 }).default('DONOR').notNull(), // DONOR, NGO, FIELD_WORKER, VENDOR
  age: integer('age'),
  gender: varchar('gender', { length: 20 }),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. NGOs Table (NEW Multi-Tenant Architecture)
export const ngos = pgTable('ngos', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  registrationNumber: varchar('registration_number', { length: 255 }).notNull().unique(),
  description: text('description'),
  missionStatement: text('mission_statement'),
  isVerified: boolean('is_verified').default(false).notNull(),
});

export const ngoWorkers = pgTable('ngo_workers', {
  id: uuid('id').defaultRandom().primaryKey(),
  ngoId: uuid('ngo_id').references(() => ngos.id).notNull(),
  userId: uuid('user_id').references(() => users.id).unique().notNull(), // A worker belongs to one NGO at a time
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Disaster Zones (Strictly Linked to NGOs)
export const disasterZones = pgTable('disaster_zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  ngoId: uuid('ngo_id').references(() => ngos.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  centerLatitude: decimal('center_latitude', { precision: 10, scale: 8 }).notNull(),
  centerLongitude: decimal('center_longitude', { precision: 11, scale: 8 }).notNull(),
  radiusKm: decimal('radius_km', { precision: 6, scale: 2 }).notNull(),
});

// 4. Vendors Table (Updated with RBAC Links)
export const vendors = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  disasterZoneId: uuid('disaster_zone_id').references(() => disasterZones.id),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  storeName: varchar('store_name', { length: 255 }).notNull(),
  businessLicenseNumber: varchar('business_license_number', { length: 255 }),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
});

// 5. Beneficiaries (Zero-Trust Identity)
export const beneficiaries = pgTable('beneficiaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  disasterZoneId: uuid('disaster_zone_id').references(() => disasterZones.id),
  proofOfHumanityHash: varchar('proof_of_humanity_hash', { length: 64 }).notNull().unique(), // SHA-256
});

// 6. Aid Packages Catalog (Updated for Custom Donations)
export const aidPackages = pgTable('aid_packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  ngoId: uuid('ngo_id').references(() => ngos.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  priceInInr: decimal('price_in_inr', { precision: 10, scale: 2 }).notNull(),
  isCustomAmountAllowed: boolean('is_custom_amount_allowed').default(false).notNull(),
});

// 7. QR Vouchers & Razorpay Payment Tracking (Settlement Engine)
export const qrVouchers = pgTable('qr_vouchers', {
  id: uuid('id').defaultRandom().primaryKey(),
  packageId: uuid('package_id').references(() => aidPackages.id),
  beneficiaryId: uuid('beneficiary_id').references(() => beneficiaries.id),
  donorUserId: uuid('donor_user_id').references(() => users.id),
  razorpayOrderId: varchar('razorpay_order_id', { length: 255 }).notNull().unique(),
  voucherHash: varchar('voucher_hash', { length: 64 }).notNull().unique(),
  status: varchar('status', { length: 50 }).default('PENDING_PAYMENT').notNull(), // PENDING_PAYMENT, ISSUED, REDEEMED
  redeemedVendorId: uuid('redeemed_vendor_id').references(() => vendors.id),
  txHash: varchar('tx_hash', { length: 66 }),
});

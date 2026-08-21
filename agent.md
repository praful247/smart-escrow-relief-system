# 🌐 ClearTrust: Atomic Multi-Agent Master Technical Plan

This document serves as an atomic, modular development blueprint for **ClearTrust**. It is structured specifically for **3 autonomous development agents** working independently. Every task defines explicit **Prerequisites, Execution Actions, Inputs, and Standardized Outputs (Handoff Artifacts)** so any agent can pick up tasks without context loss.

---

## 🤝 1. Software Engineering & Git Collaboration Norms

To ensure seamless collaboration across the 3 independent agents without merge conflicts, all development MUST follow these strict engineering standards:

### 1.1. Branching Strategy (GitHub Flow)
* **Never commit directly to `main`.**
* **One Branch, One Feature:** Create a new branch for every isolated feature or bug fix.
* **Descriptive Naming:** Use clear prefixes such as `feature/`, `bugfix/`, or `chore/` (e.g., `feature/razorpay-checkout`, `bugfix/geofence-math`).

### 1.2. Commit Frequency & Atomicity
* **Small, Atomic Commits:** Each commit must represent a single, logical change. Do not bundle UI changes, database schema updates, and contract deployments into one massive commit.
* **Commit Often:** Save your work locally frequently to maintain a highly traceable project history, making it easier to revert bad check-ins.

### 1.3. Conventional Commits Specification
All commit messages MUST follow the **Conventional Commits** standard to automate changelogs and maintain readability.
* **Format:** `<type>(<optional scope>): <subject>`
* **Types:** 
  * `feat:` (New feature added)
  * `fix:` (Bug resolved)
  * `chore:` (Maintenance, dependencies, setup)
  * `refactor:` (Code improvements without altering logic)
* **Imperative Mood:** Write subjects in the present imperative tense (e.g., `feat: add Google OAuth`, NOT `added Google OAuth`).

---

## 🛠️ 2. Updated Core Stack Architecture

* **Frontend:** Next.js (App Router), Tailwind CSS, shadcn/ui, Razorpay React SDK.
* **Authentication:** **Google OAuth 2.0** via NextAuth.js / Auth.js (`@auth/drizzle-adapter`).
* **Backend & Database:** Node.js / Next.js API Routes, **PostgreSQL** via **Drizzle ORM** (Connection String: `DATABASE_URL`).
* **Payments:** **Razorpay (Test Mode)** for fiat/crypto mock donation flow.
* **Blockchain:** Custom Layer-2 RaaS Testnet (Caldera / Gelato), `ClearTrustEscrow.sol` via Thirdweb / Viem / Ethers.js.

---

## 📂 3. Shared Handoff Contracts & Environment Variables

All agents must adhere strictly to these shared environment variables and exported TypeScript types to guarantee inter-agent compatibility.

### `.env.example`
```env
# Database
DATABASE_URL="postgres://user:password@localhost:5432/cleartrust"

# Authentication (Google OAuth)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXTAUTH_SECRET="super-secret-nextauth-key"
NEXTAUTH_URL="http://localhost:3000"

# Razorpay Test Gateway
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"

# Blockchain & RaaS
NEXT_PUBLIC_RAAS_RPC_URL="https://rpc.cleartrust-chain.caldera.xyz"
NEXT_PUBLIC_CHAIN_ID=123456
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS="0x0000000000000000000000000000000000000000"
BACKEND_ADMIN_PRIVATE_KEY="0x0000000000000000000000000000000000000000000000000000000000000000"
```

---

## 🗄️ 4. Shared Drizzle ORM Schema (`src/db/schema.ts`)

> **Agent 2** will create this file in Phase 1. **Agent 1** and **Agent 3** will import types directly from here.

```typescript
import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

// 1. NextAuth Users Table (Google OAuth)
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  role: varchar('role', { length: 50 }).default('DONOR').notNull(), // DONOR, FIELD_WORKER, VENDOR, ADMIN
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
```

---

## 🤖 5. PHASE 1: Base Setup & Infrastructure

### Task 1.1: Web3 Layer-2 RaaS Setup
* **Agent:** Agent 1 (Blockchain)
* **Execution Actions:** Spin up Caldera/Gelato L2, extract RPC, initialize Thirdweb contract repo.

### Task 1.2: Drizzle ORM & Postgres Connection Setup
* **Agent:** Agent 2 (Backend)
* **Execution Actions:** Install Drizzle ORM/Postgres, create `schema.ts`, run `drizzle-kit push`.

### Task 1.3: Next.js Shell & Google OAuth Setup
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:** Init Next.js, add shadcn/ui components, setup NextAuth route handler with GoogleProvider.

---

## 🤖 6. PHASE 2: Core Business Logic & Contract Modules

### Task 2.1: Escrow Smart Contract Development
* **Agent:** Agent 1 (Blockchain)
* **Execution Actions:** Code `ClearTrustEscrow.sol`, deploy via Thirdweb, export ABI to shared config.

### Task 2.2: Razorpay Order & Webhook API Engine
* **Agent:** Agent 2 (Backend)
* **Execution Actions:** Create Razorpay `/api/payment/create-order` and HMAC verification at `/api/payment/verify`.

### Task 2.3: Zero-Trust Hashing & Geofence Utility
* **Agent:** Agent 2 (Backend)
* **Execution Actions:** Code `crypto.ts` (SHA-256) and `geo.ts` (Haversine formula), build `/api/beneficiaries/register`.

### Task 2.4: Donor Portal & Razorpay Checkout UI
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:** Add Razorpay script, build `/donate` package cards, trigger popup modal on click.

---

## 🤖 7. PHASE 3: Integration & Redemption Workflow

### Task 3.1: NGO Field Intake & QR Generator Page
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:** Build `/field-intake` form, POST to API, generate dynamic QR code via `qrcode.react`.

### Task 3.2: Vendor POS Camera Scanner & Geofenced Settlement Engine
* **Agent:** Agent 2 & Agent 3 (Joint Handoff)
* **Execution Actions (Agent 3):** Build `/vendor-pos` with `html5-qrcode` scanner and HTML5 Geolocation API.
* **Execution Actions (Agent 2):** Build `/api/vouchers/redeem` to check DB status, validate Geofence radius, and trigger Smart Contract payout.

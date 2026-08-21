# 🌐 ClearTrust: Atomic Multi-Agent Master Technical Plan (Node.js & JWT Architecture)

This document serves as an atomic, modular development blueprint for **ClearTrust**. It is structured specifically for **3 autonomous development agents** working independently. Every task defines explicit **Prerequisites, Execution Actions, Inputs, and Standardized Outputs (Handoff Artifacts)** so any agent can pick up tasks without context loss.

---

## 🤝 1. Software Engineering & Git Collaboration Norms

To ensure seamless collaboration across the 3 independent agents without merge conflicts, all development MUST follow these strict engineering standards:

### 1.1. Branching Strategy (GitHub Flow)
* **Never commit directly to `main`.**
* **One Branch, One Feature:** Create a new branch for every isolated feature or bug fix.
* **Descriptive Naming:** Use clear prefixes such as `feature/`, `bugfix/`, or `chore/` (e.g., `feature/express-jwt-auth`, `bugfix/geofence-math`).

### 1.2. Commit Frequency & Atomicity
* **Small, Atomic Commits:** Each commit must represent a single, logical change. Do not bundle UI changes, database schema updates, and contract deployments into one massive commit.
* **Commit Often:** Save your work locally frequently to maintain a highly traceable project history.

### 1.3. Conventional Commits Specification
All commit messages MUST follow the **Conventional Commits** standard:
* **Format:** `<type>(<optional scope>): <subject>`
* **Types:** `feat:`, `fix:`, `chore:`, `refactor:`
* **Imperative Mood:** Write subjects in the present imperative tense (e.g., `feat: add JWT authentication middleware`, NOT `added JWT auth`).

---

## 🛠️ 2. Updated Core Stack Architecture

* **Frontend:** React.js (built with **Vite**), Tailwind CSS, shadcn/ui, Razorpay Checkout SDK.
* **Backend:** Standalone **Node.js (Express.js)** REST API server.
* **Authentication:** **JWT (JSON Web Tokens)** via `jsonwebtoken` + Google OAuth 2.0 verification (`google-auth-library`).
* **Database & ORM:** **PostgreSQL** via **Drizzle ORM** (Connection String: `DATABASE_URL`).
* **Payments:** **Razorpay Node.js SDK** (Test Mode) for backend order creation & HMAC signature verification.
* **Blockchain:** Custom Layer-2 RaaS Testnet (Caldera / Gelato), `ClearTrustEscrow.sol` via Thirdweb / Viem / Ethers.js.

---

## 📂 3. Shared Handoff Contracts & Environment Variables

### `.env.example` (Backend - Express Server)
```env
# Server Config
PORT=5000
NODE_ENV="development"

# Database
DATABASE_URL="postgres://user:password@localhost:5432/cleartrust"

# JWT Authentication
JWT_SECRET="super-secret-jwt-token-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Google OAuth Client
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# Razorpay Test Gateway
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"

# Blockchain & RaaS
RAAS_RPC_URL="https://rpc.cleartrust-chain.caldera.xyz"
CHAIN_ID=123456
ESCROW_CONTRACT_ADDRESS="0x0000000000000000000000000000000000000000"
BACKEND_ADMIN_PRIVATE_KEY="0x0000000000000000000000000000000000000000000000000000000000000000"
```

### `.env.example` (Frontend - React Vite)
```env
VITE_API_BASE_URL="http://localhost:5000/api"
VITE_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
VITE_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxxx"
VITE_RAAS_RPC_URL="https://rpc.cleartrust-chain.caldera.xyz"
VITE_ESCROW_CONTRACT_ADDRESS="0x0000000000000000000000000000000000000000"
```

---

## 🗄️ 4. Shared Drizzle ORM Schema (`server/src/db/schema.ts`)

> **Agent 2** will create this file in Phase 1. **Agent 1** and **Agent 3** will import types directly or use matching API payloads.

```typescript
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
```

---

## 🤖 5. PHASE 1: Base Setup & Infrastructure

### Task 1.1: Web3 Layer-2 RaaS Setup
* **Agent:** Agent 1 (Blockchain)
* **Execution Actions:**
  1. Spin up Caldera/Gelato L2 testnet named `ClearTrust Chain`.
  2. Obtain Custom RPC URL, Chain ID, and testnet deployer funds.
  3. Initialize Thirdweb / Hardhat contract project.
* **Outputs:**
  - Save chain configuration to `server/src/config/chain.json`.

### Task 1.2: Express Server & Drizzle Postgres Setup
* **Agent:** Agent 2 (Backend)
* **Execution Actions:**
  1. Initialize Express backend (`server/package.json` with `express`, `cors`, `dotenv`, `drizzle-orm`, `postgres`, `jsonwebtoken`).
  2. Create `server/src/db/schema.ts` and `server/src/db/index.ts`.
  3. Run `npx drizzle-kit push` to apply database tables.
  4. Build JWT Verification Middleware (`server/src/middleware/authMiddleware.ts`):
     - Extract `Bearer <token>` from `Authorization` header.
     - Verify signature using `JWT_SECRET`. Attach `req.user` payload to Express request.
* **Outputs:**
  - Node.js Express server running on port 5000 with CORS & JWT middleware ready.

### Task 1.3: React (Vite) Shell & Google Auth UI
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:**
  1. Initialize React + Vite app: `npm create vite@latest client -- --template react-ts`.
  2. Install Tailwind CSS & shadcn/ui components (`button`, `card`, `dialog`, `toast`, `input`).
  3. Integrate `@react-oauth/google` for Google Sign-In button.
  4. On Google Auth success, POST credential token to Node.js backend `/api/auth/google`. Store returned JWT token in `localStorage`.
* **Outputs:**
  - React shell with Auth Context / LocalStorage JWT handler.

---

## 🤖 6. PHASE 2: Core Business Logic & Payment Modules

### Task 2.1: Escrow Smart Contract Development
* **Agent:** Agent 1 (Blockchain)
* **Execution Actions:**
  1. Write `ClearTrustEscrow.sol` with `createVoucher` and `redeemVoucher` functions.
  2. Deploy via Thirdweb to `ClearTrust Chain`.
  3. Export contract ABI and contract address to `server/src/config/ClearTrustEscrow.json`.

### Task 2.2: JWT Auth Routes & Razorpay Engine
* **Agent:** Agent 2 (Backend)
* **Execution Actions:**
  1. Create `/api/auth/google` route: Verifies Google token with `google-auth-library`, upserts user in Drizzle DB, and signs JWT.
  2. Install `razorpay` Node.js SDK.
  3. Create POST `/api/payment/create-order` (JWT Protected):
     - Takes `packageId`, creates Razorpay order, inserts record into `qrVouchers` as `PENDING_PAYMENT`.
  4. Create POST `/api/payment/verify` (JWT Protected):
     - Verifies Razorpay HMAC SHA256 signature using `RAZORPAY_KEY_SECRET`.
     - Updates `qrVouchers` status to `ISSUED`.

### Task 2.3: Zero-Trust Hashing & Geofence Utility
* **Agent:** Agent 2 (Backend)
* **Execution Actions:**
  1. Build `crypto.ts` for SHA-256 hashing.
  2. Build `geo.ts` implementing the Haversine distance formula.
  3. Build POST `/api/beneficiaries/register`:
     - Takes raw beneficiary identity data, generates SHA-256 `proofOfHumanityHash`.
     - Checks Drizzle for hash collisions (Anti-Sybil check) and inserts beneficiary record.

### Task 2.4: Donor Portal & Razorpay Checkout
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:**
  1. Add Razorpay Checkout JS script in `index.html`.
  2. Build `/donate` page displaying Aid Package cards.
  3. "Donate" button triggers `/api/payment/create-order` (sending JWT token in headers).
  4. Opens Razorpay popup modal; on payment success, calls `/api/payment/verify`.

---

## 🤖 7. PHASE 3: Integration & Redemption Workflow

### Task 3.1: NGO Field Intake & Dynamic QR Generator Page
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:**
  1. Build `/field-intake` page for authenticated field workers.
  2. Submit form to POST `/api/beneficiaries/register`.
  3. Render dynamic QR code using `qrcode.react` containing `voucherHash`.

### Task 3.2: Vendor POS Scanner & On-Chain Settlement API
* **Agent:** Agent 2 & Agent 3 (Joint Handoff)
* **Execution Actions (Agent 3):**
  1. Build `/vendor-pos` with webcam scanning using `html5-qrcode`.
  2. Obtain user's real-time GPS coordinates via `navigator.geolocation.getCurrentPosition`.
  3. Send scanned `voucherHash`, vendor coordinates, and vendor wallet to Node.js backend.
* **Execution Actions (Agent 2):**
  1. Create POST `/api/vouchers/redeem` (JWT Protected):
     - Query `qrVouchers` DB table; verify voucher status is `ISSUED`.
     - Check Haversine distance from vendor GPS to disaster zone perimeter.
     - If distance > `radiusKm`, return `403 Geofence Violation`.
     - Trigger smart contract `redeemVoucher` method using admin private key (`ethers`/`viem`).
     - Update `qrVouchers` status in Drizzle DB to `REDEEMED`.

# 🌐 ClearTrust: Atomic Multi-Agent Master Technical Plan (V6 - Multi-Tenant RBAC & Avalanche LAN)

This document serves as an atomic, modular development blueprint for **ClearTrust**. It is structured specifically for **3 autonomous development agents** working independently. Every task defines explicit **Prerequisites, Execution Actions, Inputs, and Standardized Outputs (Handoff Artifacts)** so any agent can pick up tasks without context loss.

---

## 🤝 1. Software Engineering & Git Collaboration Norms

To ensure seamless collaboration across the 3 independent agents, all development MUST follow these strict engineering standards:

### 1.1. Branching Strategy (Hackathon Fast-Track)
* **Direct to Main:** Since Phase 1 and 2 are complete, all agents will now commit directly to the `main` branch to accelerate Phase 3+ integration. 
* **Pull Before Push:** Always run `git pull origin main` before committing to avoid merge conflicts with other agents.

### 1.2. Commit Frequency & Atomicity
* **Small, Atomic Commits:** Each commit must represent a single, logical change. Do not bundle UI changes, database schema updates, and contract deployments into one massive commit.
* **Commit Often:** Save your work locally frequently to maintain a highly traceable project history.

### 1.3. Conventional Commits Specification
All commit messages MUST follow the **Conventional Commits** standard to automate changelogs and maintain readability:
* **Format:** `<type>(<optional scope>): <subject>`
* **Types:** `feat:`, `fix:`, `chore:`, `refactor:`
* **Imperative Mood:** Write subjects in the present imperative tense (e.g., `feat: add NGO schema updates`, NOT `added NGO schema updates`).

---

## 🛠️ 2. Updated Core Stack Architecture

* **Frontend:** React.js (built with **Vite**), Tailwind CSS, shadcn/ui, Razorpay Checkout SDK.
* **Backend:** Standalone **Node.js (Express.js)** REST API server.
* **Authentication:** **JWT (JSON Web Tokens)** via `jsonwebtoken` + Google OAuth 2.0 verification (`google-auth-library`).
* **Database & ORM:** **PostgreSQL (NeonDB)** via **Drizzle ORM**.
* **Payments:** **Razorpay Node.js SDK** (Test Mode) for backend order creation & HMAC signature verification.
* **Blockchain:** Custom **Avalanche L1 (Subnet-EVM)** deployed locally on Wi-Fi LAN (`ClearTrustEscrow.sol` via Thirdweb / Viem / Ethers.js).

---

## 📂 3. Shared Handoff Contracts & Environment Variables

All agents must strictly adhere to these verified environment variables to guarantee inter-agent compatibility.

### Backend (`server/.env`)
```env
# Server Config
PORT=5000
NODE_ENV="development"

# Database (NeonDB)
DATABASE_URL="postgresql://neondb_owner:npg_LAspHGW14Qoj@ep-round-star-ayqzvtlx-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"

# JWT Authentication
JWT_SECRET="uhndfuydsfuifuibiufbsajcnjisancjsabhvuhdmuhbds"
JWT_EXPIRES_IN="7d"

# Google OAuth Client
GOOGLE_CLIENT_ID="917497953374-pldns4d09s9vdcbfvd1djhbvsoahkuf7.apps.googleusercontent.com"

# Razorpay Test Gateway (Real Keys)
RAZORPAY_KEY_ID="rzp_test_TSLUhCirLeKCFq"
RAZORPAY_KEY_SECRET="j5sNRiyjYCXVcr0ss8gCSKbC"

# Blockchain & Avalanche LAN Setup
RAAS_RPC_URL="http://172.26.220.248:9654/ext/bc/2hSpV1HF3HUJiP9WgKYeYTEKimq4F2rpA2tx6sJM5nmXvDF4pQ/rpc"
CHAIN_ID=123456
ESCROW_CONTRACT_ADDRESS="0x4Ac1d98D9cEF99EC6546dEd4Bd550b0b287aaD6D"
BACKEND_ADMIN_PRIVATE_KEY="YOUR_ACTUAL_METAMASK_PRIVATE_KEY_HERE"
```

### Frontend (`client/.env`)
```env
VITE_API_BASE_URL="http://localhost:5000/api"
VITE_GOOGLE_CLIENT_ID="917497953374-pldns4d09s9vdcbfvd1djhbvsoahkuf7.apps.googleusercontent.com"
VITE_RAZORPAY_KEY_ID="rzp_test_TSLUhCirLeKCFq"
VITE_RAAS_RPC_URL="http://172.26.220.248:9654/ext/bc/2hSpV1HF3HUJiP9WgKYeYTEKimq4F2rpA2tx6sJM5nmXvDF4pQ/rpc"
VITE_CHAIN_ID=123456
VITE_ESCROW_CONTRACT_ADDRESS="0x4Ac1d98D9cEF99EC6546dEd4Bd550b0b287aaD6D"
```

---

## 🗄️ 4. Expanded Drizzle ORM Schema (Multi-Tenant & Profiles)

> **Agent 2** will update this file (`server/src/db/schema.ts`) in Phase 3 to support deep profiles and multi-tenant NGOs.

```typescript
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
  razorpayOrderId: varchar('razorpay_order_id', { length: 255 }).notNull().unique(),
  voucherHash: varchar('voucher_hash', { length: 64 }).notNull().unique(),
  status: varchar('status', { length: 50 }).default('PENDING_PAYMENT').notNull(), // PENDING_PAYMENT, ISSUED, REDEEMED
  redeemedVendorId: uuid('redeemed_vendor_id').references(() => vendors.id),
});
```

---

## ✅ PHASE 1 & 2: Base Setup & Core Logic [COMPLETED]
* **Agent 1:** Deployed Avalanche LAN Subnet & `ClearTrustEscrow.sol`.
* **Agent 2:** Built Express server, Drizzle ORM setup, JWT generation, and Razorpay endpoints.
* **Agent 3:** Built React + Vite shell, Google Auth, and basic Donor Portal.

---

## 🤖 PHASE 3: Deep Profiles & Role-Based Access Control (RBAC)

### Task 3.1: JWT Role Enrichment & RBAC Middleware
* **Agent:** Agent 2 (Backend)
* **Execution Actions:**
  1. Update `server/src/db/schema.ts` with the new V6 tables (`ngos`, modified `users`, etc.) and run `npx drizzle-kit push`.
  2. Modify the `/api/auth/google` endpoint to attach the user's `role` directly inside the signed JWT payload.
  3. Create `server/src/middleware/roleMiddleware.ts` with wrapper functions (e.g., `requireRole('NGO')`, `requireRole('VENDOR')`) to protect specific routes.
* **Outputs:** Express backend ready to reject unauthorized access with `403 Forbidden` and fully upgraded database schema.

### Task 3.2: Role-Based Routing & Profile Onboarding UI
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:**
  1. Implement React Router redirects post-login. Decode the JWT to route DONORs to `/explore`, NGOs to `/ngo/dashboard`, and VENDORs to `/vendor/pos`.
  2. Build a `/complete-profile` multi-step form. If a user's DB profile is missing `age`, `phone`, or role-specific details (NGO Registration Number, Vendor License), force them to this page.
  3. Implement a clean Logout functionality that clears the JWT from `localStorage`.
* **Outputs:** Protected frontend routing with deep profile onboarding functionality.

---

## 🤖 PHASE 4: NGO Discovery & Custom Donation Engine

### Task 4.1: NGO Package Management (CRUD)
* **Agent:** Agent 2 & Agent 3
* **Execution Actions (Agent 2 - Backend):** Build `POST /api/ngo/packages` (JWT Protected + requireRole 'NGO') allowing verified NGOs to create, edit, and delete their own specific aid packages.
* **Execution Actions (Agent 3 - Frontend):** Build `/ngo/packages` dashboard for NGOs to manage their inventory and toggle the `isCustomAmountAllowed` flag.
* **Outputs:** A self-serve backend and UI for NGOs to manage their campaigns independently.

### Task 4.2: The "Explore NGOs" Marketplace
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:**
  1. Build `/explore` page displaying a dynamic grid of verified NGOs using shadcn/ui cards.
  2. Build `/ngo/[id]` detail page showing the NGO's mission, impact stats, and their specific Aid Packages fetched from the backend.
* **Outputs:** A complete marketplace UI for donors to browse charities.

### Task 4.3: Dynamic Razorpay Checkout Engine
* **Agent:** Agent 2 & Agent 3
* **Execution Actions (Agent 2 - Backend):** Update `POST /api/payment/create-order` to accept a `customAmount` payload if the selected package allows it.
* **Execution Actions (Agent 3 - Frontend):** Update the Razorpay checkout modal to include a text input for custom INR amounts (e.g., ₹500, ₹1000, Custom: ₹____).
* **Outputs:** End-to-end custom donation payment flow.

---

## 🤖 PHASE 5: Field Operations & Zero-Trust Beneficiary Intake

### Task 5.1: NGO Field Worker App
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:**
  1. Build `/ngo/field-intake`. This is a mobile-first form for NGO field workers to register victims in disaster zones.
  2. Implement an intake form that collects basic traits/biometrics instead of state IDs (Zero-Trust Identity).
* **Outputs:** Field worker data collection interface.

### Task 5.2: Dynamic QR Generation & Hashing
* **Agent:** Agent 2 & Agent 3
* **Execution Actions (Agent 2 - Backend):** Expand `POST /api/beneficiaries/register`. It must generate a SHA-256 `proofOfHumanityHash` and link the issued voucher value.
* **Execution Actions (Agent 3 - Frontend):** Render a high-contrast dynamic QR Code (using `qrcode.react`) containing the `voucherHash` directly on the field worker's screen.
* **Outputs:** Cryptographically secure offline QR vouchers for victims.

---

## 🤖 PHASE 6: Vendor Geofenced POS & Smart Contract Settlement

### Task 6.1: Vendor HTML5 Webcam POS
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:**
  1. Build `/vendor/pos` (Route restricted to `VENDOR` role).
  2. Integrate `html5-qrcode` to activate the device's web camera and scan the victim's QR code voucher.
  3. Capture the vendor's real-time GPS coordinates via HTML5 `navigator.geolocation`.
* **Outputs:** Point-of-Sale scanning terminal for local merchants.

### Task 6.2: On-Chain Escrow Settlement API
* **Agent:** Agent 2 (Backend)
* **Execution Actions:**
  1. Build `POST /api/vouchers/redeem` (Protected for Vendors).
  2. Validate the Vendor's GPS coordinates against the disaster zone `radiusKm` using the Haversine formula (from `geo.ts`).
  3. If valid, use `BACKEND_ADMIN_PRIVATE_KEY` with `ethers.js` to call `ClearTrustEscrow.sol` and instantly release crypto funds to the Vendor's wallet.
  4. Update the DB `qrVouchers` status to `REDEEMED`.
* **Outputs:** Automated, gasless blockchain settlement engine.

---

## 🤖 PHASE 7: Transparency Dashboards & Audit Trail

### Task 7.1: Donor "Track My Impact" Dashboard
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:** Build `/donor/impact`. Show the donor exactly which NGO received their funds, if the voucher was issued to a victim, and the final blockchain transaction hash once a vendor redeems it.
* **Outputs:** Trust-building transparency dashboard for donors.

### Task 7.2: NGO Analytics Ledger
* **Agent:** Agent 3 (Frontend)
* **Execution Actions:** Build `/ngo/analytics` showing total funds raised via Razorpay, total vouchers issued, and heatmaps of where vendors are redeeming the aid within the disaster zone.
* **Outputs:** Administrative data visualization for NGOs.

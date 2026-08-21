# ClearTrust: Future Roadmap & Missing Features

This document outlines the critical features that remain to be implemented to elevate ClearTrust from a functional MVP to a fully robust, production-ready disaster relief platform.

## 1. Field Operations & Distribution
- **Package Selection for Victims**: Currently, when a Field Worker registers a beneficiary, the backend simply assigns the first available `ISSUED` voucher belonging to the NGO. The worker needs a dropdown to explicitly select *which* type of package (e.g., Medical Kit, Food Ration, Shelter) the victim requires based on their assessment.
- **Family Size Scaling**: Intake forms collect "family size", but this currently has no impact on distribution. The system should automatically scale the relief (e.g., allocating multiple vouchers or a specialized high-value family voucher) for larger households.
- **Offline Mode**: Field Workers often operate in areas with no internet. The intake form should cache beneficiary data offline and sync with the backend/blockchain once connectivity is restored.

## 2. Geo-Fencing & Fraud Prevention
- **Geo-Locked QRs**: The database schema includes `centerLatitude`, `centerLongitude`, and `radiusKm` for Disaster Zones. The smart contract (or backend API) needs to enforce that a Vendor's GPS coordinates fall within this radius when they attempt to redeem a voucher.
- **Vendor Verification**: Vendors currently self-register. NGOs need a workflow to physically verify and approve vendors before they are allowed to scan vouchers.

## 3. NGO & Platform Admin Tools
- **Disaster Zone Management**: Instead of falling back to a default "General Aid Zone", the NGO Dashboard must include an interactive map interface (e.g., using Leaflet or Google Maps) allowing them to draw and define specific operational zones.
- **Advanced Analytics & Inventory Management (Weak NGO Panel)**: Currently, the NGO panel is heavily mocked/underdeveloped. NGOs cannot see the packages they actually offer, nor can they track the number of packages they have issued vs. how many they have received funding for. A complete "Inventory and Distribution" tab is required.
- **Donor Impact Page (Incomplete)**: The page intended to show donors the direct impact of their contributions (tracking exactly where their money went) is currently not fully implemented or integrated with the real voucher status flow.

## 4. Vendor POS Experience
- **Package Details on Scan**: When a vendor scans a QR code, the POS currently just says "Redeem Voucher". It must display the exact contents of the package (e.g., "Provide: 5kg Rice, 2L Water") so the vendor knows what goods to hand over.
- **Fiat Off-Ramps**: Vendors accumulate stablecoins on the blockchain. The platform needs an automated off-ramp integration (or an internal treasury system) to settle these crypto balances into the vendor's local bank account in fiat currency.

## 5. Donor Experience
- **Bulk Donations / Cart System**: Donors can currently only fund one package at a time. A shopping cart experience should be added, allowing donors to fund 10 medical kits and 5 food rations in a single checkout.
- **Subscription / Monthly Giving**: Allowing donors to set up recurring donations to keep NGO pools continuously funded.

## 6. Real-World Proof of Humanity (Currently Mocked)
- **Biometric / Identity Hashing**: The Anti-Sybil check currently generates a `proofOfHumanityHash` by doing a simple SHA-256 hash of the victim's typed data (Name, Age, Village). In production, this needs to be replaced with true biometric uniqueness:
  - **Facial Scanning API**: Integrating AWS Rekognition or a specialized library to generate a facial hash on the field worker's mobile device.
  - **Decentralized ID**: Integrating with Worldcoin or local government digital IDs (e.g., Aadhaar) to ensure 100% unique, zero-trust beneficiaries.

## 7. Other Mocked / MVP Limitations
- **Razorpay Payments**: Currently runs in "Test Mode". Needs webhook handlers and failure/refund scenarios built out.
- **Wallet Abstraction**: The Vendor's blockchain wallet is currently mocked as a static address on the backend if they don't have one. A real wallet abstraction layer (like Privy or Web3Auth) needs to be integrated so vendors have secure, self-custodial wallets generated automatically.
- **File Uploads for Verification**: NGOs and Vendors currently type in their license numbers. True KYC/KYB requires uploading physical document scans to an S3 bucket and verifying them.

## Proposed Implementation Order

1. **Vendor POS Package Details**: High priority, simple frontend/backend data fetching fix.
2. **True Proof of Humanity Integration**: Replacing the mocked SHA-256 identity hash with a real biometric/ID flow.
3. **Disaster Zone Mapping & Robust NGO Panel**: Rebuilding the NGO dashboard to accurately reflect funded/issued inventory and zone management.
4. **Donor Impact Page Completion**: Closing the feedback loop for donors.
5. **Geo-Locked QRs**: Requires passing vendor location during the `/api/vouchers/redeem` call and calculating the haversine distance.
6. **Field Worker Package Selection**: Updates to the intake form and voucher assignment logic.
7. **Bulk Donations**: Frontend state management and Razorpay payload updates.

import { db } from './src/db/index.js';
import { qrVouchers, aidPackages } from './src/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function sync() {
  console.log("Starting sync...");
  
  // Find all ISSUED vouchers
  const vouchers = await db.select({
    voucher: qrVouchers,
    pkg: aidPackages
  }).from(qrVouchers)
  .innerJoin(aidPackages, eq(qrVouchers.packageId, aidPackages.id))
  .where(eq(qrVouchers.status, 'ISSUED'));

  console.log(`Found ${vouchers.length} ISSUED vouchers in DB.`);

  const provider = new ethers.JsonRpcProvider(process.env.RAAS_RPC_URL);
  const wallet = new ethers.Wallet(process.env.BACKEND_ADMIN_PRIVATE_KEY, provider);
  const abi = [
    "function createVoucher(string memory _voucherHash, uint256 _amount) external",
    "function vouchers(string memory _voucherHash) external view returns (string, uint256, uint8, address)"
  ];
  const contract = new ethers.Contract(process.env.ESCROW_CONTRACT_ADDRESS, abi, wallet);

  for (const { voucher, pkg } of vouchers) {
    try {
      // Check if it's already on the blockchain
      const onChainData = await contract.vouchers(voucher.voucherHash);
      if (onChainData[2] !== 0n) { // 0 is NOT_CREATED
        console.log(`Voucher ${voucher.voucherHash} is already on-chain. Skipping.`);
        continue;
      }
      
      const amountInWei = ethers.parseEther(pkg.priceInInr);
      console.log(`Creating voucher ${voucher.voucherHash} on-chain with amount ${pkg.priceInInr}...`);
      
      const tx = await contract.createVoucher(voucher.voucherHash, amountInWei);
      await tx.wait();
      
      console.log(`Successfully synced ${voucher.voucherHash}`);
    } catch (e) {
      console.error(`Failed to sync ${voucher.voucherHash}:`, e.message);
    }
  }
  
  console.log("Sync complete.");
  process.exit(0);
}

sync();

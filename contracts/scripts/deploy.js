import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const Escrow = await hre.ethers.getContractFactory("ClearTrustEscrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log(`ClearTrustEscrow deployed to: ${address}`);

  // Export ABI
  const artifact = await hre.artifacts.readArtifact("ClearTrustEscrow");
  
  const destDir = path.join(__dirname, "..", "..", "backend", "src", "config");
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const exportData = {
    address: address,
    abi: artifact.abi
  };

  fs.writeFileSync(
    path.join(destDir, "ClearTrustEscrow.json"),
    JSON.stringify(exportData, null, 2)
  );

  console.log("ABI and address exported to backend/src/config/ClearTrustEscrow.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

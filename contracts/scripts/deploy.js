const hre = require("hardhat");

// USDC addresses on Base
const USDC = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",       // mainnet
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // testnet
};

async function main() {
  const network = hre.network.name;
  const usdcAddress = USDC[network];
  const feeRecipient = process.env.DEPMI_TREASURY_ADDRESS;

  if (!usdcAddress) throw new Error(`No USDC address for network: ${network}`);
  if (!feeRecipient) throw new Error("DEPMI_TREASURY_ADDRESS env var required");

  console.log(`Deploying DepMiEscrow to ${network}...`);
  console.log(`  USDC:         ${usdcAddress}`);
  console.log(`  feeRecipient: ${feeRecipient}`);

  const DepMiEscrow = await hre.ethers.getContractFactory("DepMiEscrow");
  const escrow = await DepMiEscrow.deploy(usdcAddress, feeRecipient);
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log(`\nDepMiEscrow deployed to: ${address}`);
  console.log(`\nAdd to Vercel env vars:`);
  console.log(`  ESCROW_CONTRACT_ADDRESS=${address}`);
  console.log(`\nVerify on BaseScan:`);
  console.log(`  npx hardhat verify --network ${network} ${address} ${usdcAddress} ${feeRecipient}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

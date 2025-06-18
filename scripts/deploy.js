// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that,
// Hardhat will compile your contracts, add the Hardhat Runtime Environment's
// members to the global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  // 1. Get the signer (the account that will pay for the deployment)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 2. Get the Contract Factory for "HealthRecords"
  // The name must match the contract name in your .sol file exactly.
  const HealthRecords = await hre.ethers.getContractFactory("HealthRecords");

  // 3. Deploy the contract
  // If your contract had constructor arguments, you would pass them here.
  // For example: await HealthRecords.deploy(arg1, arg2);
  console.log("Deploying HealthRecords contract...");
  const healthRecords = await HealthRecords.deploy();

  // 4. Wait for the contract to be officially deployed and mined
  await healthRecords.deployed();

  // 5. Log the contract address to the console
  console.log(`HealthRecords contract deployed successfully to: ${healthRecords.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
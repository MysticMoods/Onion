import hre from "hardhat";

async function main() {
  const FileVault = await hre.ethers.getContractFactory("FileVault");
  const vault = await FileVault.deploy();

  await vault.waitForDeployment();

  console.log(`FileVault deployed to: ${await vault.getAddress()}`);
}

main()
  .then(() => setTimeout(() => process.exit(0), 10))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

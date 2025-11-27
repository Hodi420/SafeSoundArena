const hre = require('hardhat');

async function main() {
  const Pioneer = await hre.ethers.getContractFactory('PioneerPoH');
  const ctr = await Pioneer.deploy();
  await ctr.waitForDeployment?.();
  console.log('PioneerPoH deployed to:', ctr.target || ctr.address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

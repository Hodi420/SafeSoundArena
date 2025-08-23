const hre = require('hardhat');
const fs = require('fs');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const addr = (await hre.ethers.getContractFactory('PioneerPoH')).bytecode ? undefined : undefined;
  const ctr = await hre.ethers.getContractAt('PioneerPoH', process.env.POH_ADDR || '0x0000000000000000000000000000000000000000');
  // read root from aggregator out
  const rootHex = fs.readFileSync(__dirname + '/../aggregator/out/root.txt', 'utf8').trim();
  const manifestCid = fs.existsSync(__dirname + '/../aggregator/out/manifest-cid.txt') ? fs.readFileSync(__dirname + '/../aggregator/out/manifest-cid.txt', 'utf8').trim() : '';
  const epoch = Math.floor(Date.now() / 1000);
  console.log('Submitting root', rootHex, 'as epoch', epoch);
  const tx = await ctr.connect(deployer).submitRoot(epoch, rootHex, manifestCid);
  await tx.wait();
  console.log('submitted tx', tx.hash);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });

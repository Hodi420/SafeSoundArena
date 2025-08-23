const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Starting contract deployment...');
  
  // Get the contract factory
  const SafeSoundArena = await ethers.getContractFactory('SafeSoundArena');
  const SSAToken = await ethers.getContractFactory('SSAToken');
  
  console.log('Deploying contracts with the account:', (await ethers.provider.getSigner()).address);
  
  // Deploy SSAToken first
  console.log('Deploying SSAToken...');
  const ssaToken = await SSAToken.deploy();
  await ssaToken.deployed();
  console.log(`✅ SSAToken deployed to: ${ssaToken.address}`);
  
  // Deploy SafeSoundArena with token address
  console.log('Deploying SafeSoundArena...');
  const safeSoundArena = await SafeSoundArena.deploy(ssaToken.address);
  await safeSoundArena.deployed();
  console.log(`✅ SafeSoundArena deployed to: ${safeSoundArena.address}`);
  
  // Transfer ownership of the token to SafeSoundArena
  console.log('Transferring token ownership to SafeSoundArena...');
  await ssaToken.transferOwnership(safeSoundArena.address);
  console.log('✅ Token ownership transferred');
  
  // Save deployment info to a JSON file
  const deploymentInfo = {
    network: 'local',
    timestamp: new Date().toISOString(),
    contracts: {
      SSAToken: ssaToken.address,
      SafeSoundArena: safeSoundArena.address
    }
  };
  
  const deploymentPath = path.join(__dirname, 'deployments', 'local.json');
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log('📝 Deployment info saved to:', deploymentPath);
  console.log('✨ Deployment completed successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });

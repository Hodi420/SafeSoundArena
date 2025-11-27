const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('PioneerPoH', function () {
  it('allows owner to set relayer and relayer to submit root', async function () {
    const [owner, relayer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('PioneerPoH');
    const ctr = await Factory.deploy();
    await ctr.waitForDeployment?.();

    // set relayer
    await ctr.connect(owner).setRelayer(relayer.address);
    const epoch = 42;
    const root = ethers.keccak256(ethers.toUtf8Bytes('root-42'));
    // submit root from relayer with manifest CID
    const manifestCid = 'QmTestManifestCid';
    await ctr.connect(relayer).submitRoot(epoch, root, manifestCid);
    const stored = await ctr.getRoot(epoch);
    const storedManifest = await ctr.getManifest(epoch);
    expect(stored).to.equal(root);
    expect(storedManifest).to.equal(manifestCid);
  });
});

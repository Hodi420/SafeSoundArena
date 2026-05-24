const assert = require('assert');

function loadFreshArenaService() {
  const servicePath = require.resolve('../blockchain/arenaCreditService');
  delete require.cache[servicePath];
  return require('../blockchain/arenaCreditService');
}

describe('ArenaCreditService', () => {
  it('starts with the expected initial community allocation', async () => {
    const arena = loadFreshArenaService();

    assert.strictEqual(await arena.getBalance('community'), 500000);
    assert.strictEqual(await arena.getBurnedAmount(), 0);
  });

  it('transfers credits and burns the network fee', async () => {
    const arena = loadFreshArenaService();

    await arena.transfer('community', 'alice', 1000);

    assert.strictEqual(await arena.getBalance('alice'), 1000);
    assert.strictEqual(await arena.getBurnedAmount(), 5);
    assert.strictEqual(await arena.getBalance('community'), 498995);
  });

  it('blocks outgoing transfers from a frozen account', async () => {
    const arena = loadFreshArenaService();

    await arena.transfer('community', 'alice', 1000);
    await arena.freezeAccount('alice', 'admin');

    await assert.rejects(
      () => arena.transfer('alice', 'bob', 10),
      /Account is frozen/
    );
  });
});

const assert = require('assert');
const Notification = require('../server/models/notification');

describe('Notification Model', () => {
  it('should not validate notification without required fields', async () => {
    const notif = new Notification({});

    await assert.rejects(
      () => notif.validate(),
      error => Boolean(error.errors.userId && error.errors.type && error.errors.message)
    );
  });

  it('should validate notification with valid fields', async () => {
    const notif = new Notification({ userId: '1', type: 'info', message: 'Test' });

    await notif.validate();

    assert.ok(notif._id);
    assert.strictEqual(notif.type, 'info');
    assert.strictEqual(notif.read, false);
  });
});

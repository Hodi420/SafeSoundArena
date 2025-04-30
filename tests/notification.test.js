// בדיקת יחידה לדוגמה עבור Notification model
const mongoose = require('mongoose');
const Notification = require('../server/models/notification');

describe('Notification Model', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/safesoundarena-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  it('should not save notification without required fields', async () => {
    const notif = new Notification({});
    let err;
    try {
      await notif.save();
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
  });

  it('should save notification with valid fields', async () => {
    const notif = new Notification({ userId: '1', type: 'info', message: 'Test' });
    const saved = await notif.save();
    expect(saved._id).toBeDefined();
    expect(saved.type).toBe('info');
  });
});

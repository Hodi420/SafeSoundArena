const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  preferences: {
    theme: { type: String, default: 'light' },
    language: { type: String, default: 'he' },
    agentType: { type: String, default: '' },
    notificationEmails: {
      onboarding: { type: Boolean, default: true },
      notification: { type: Boolean, default: false },
      system: { type: Boolean, default: false },
      task: { type: Boolean, default: false }
    }
  },
  logs: { type: [String], default: [] },
  context: { type: Object, default: {} },
  agree: { type: Boolean, required: true },
  onboardingComplete: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  notifications: [{
    type: { type: String },
    message: { type: String },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('User', UserSchema);

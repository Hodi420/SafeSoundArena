import type { NextApiRequest, NextApiResponse } from 'next';

// --- Channel Adapters (replace with real API integrations as needed) ---
async function sendTelegram(message: string, chatId: string) {
  // TODO: Integrate with Telegram Bot API
  console.log(`[Telegram] To ${chatId}: ${message}`);
}

async function sendWhatsApp(message: string, phoneNumber: string) {
  // TODO: Integrate with Twilio WhatsApp API
  console.log(`[WhatsApp] To ${phoneNumber}: ${message}`);
}

async function sendSMS(message: string, phoneNumber: string) {
  // TODO: Integrate with Twilio SMS API
  console.log(`[SMS] To ${phoneNumber}: ${message}`);
}

async function sendVoice(message: string, phoneNumber: string) {
  // TODO: Integrate with Twilio Voice or Google TTS
  console.log(`[Voice] To ${phoneNumber}: ${message}`);
}

import { addInAppNotification } from './in-app-notifications';

async function sendInApp(message: string, userId: string) {
  // Store notification for frontend polling
  addInAppNotification(userId, message);
  console.log(`[In-App] To user ${userId}: ${message}`);
}

// --- Dispatcher ---
const channelAdapters: Record<string, (message: string, recipient: string) => Promise<void>> = {
  telegram: sendTelegram,
  whatsapp: sendWhatsApp,
  sms: sendSMS,
  voice: sendVoice,
  'in-app': sendInApp,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { message, channels = [], meta = {} } = req.body;
  if (!message || !Array.isArray(channels)) {
    return res.status(400).json({ error: 'Missing message or channels' });
  }
  // Dispatch to all requested channels
  await Promise.all(
    channels.map(async (channel: string) => {
      const adapter = channelAdapters[channel];
      if (!adapter) return;
      try {
        // Pass message and relevant meta info (e.g., chatId, phoneNumber, userId)
        switch (channel) {
          case 'telegram':
            return adapter(message, meta.telegramChatId);
          case 'whatsapp':
            return adapter(message, meta.phoneNumber);
          case 'sms':
            return adapter(message, meta.phoneNumber);
          case 'voice':
            return adapter(message, meta.phoneNumber);
          case 'in-app':
            return adapter(message, meta.userId);
          default:
            break;
        }
      } catch (err) {
        console.error(`Error sending to ${channel}:`, err);
      }
    })
  );
  res.status(200).json({ status: 'Message dispatched', channels });
}

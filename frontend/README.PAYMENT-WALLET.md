# Pi Payment & App Wallet Guide

This guide explains how to use the Pi Payment Demo and App Wallet Demo components in your project, and how to prepare for real-world integration.

---

## 1. Pi Payment Demo

The `PiPaymentDemo` component simulates a User-to-App payment in the Pi Network ecosystem.

**How to use:**
```tsx
import PiPaymentDemo from './src/components/PiPaymentDemo';
<PiPaymentDemo />
```
- In Sandbox mode: Simulates a successful payment.
- In Production: Shows an error (requires real Pi payment integration).

**Best Practices:**
- Never use real Pi or production keys in Sandbox mode.
- For production, integrate with the official Pi SDK or payment API.

---

## 2. App Wallet Demo

The `AppWalletDemo` component shows a demo wallet address for your app.

**How to use:**
```tsx
import AppWalletDemo from './src/components/AppWalletDemo';
<AppWalletDemo />
```
- The address is randomly generated for demo purposes only.
- In production, connect to a real wallet provider (Pi Wallet, Web3 wallet, etc).

**Best Practices:**
- Never use demo wallets for real transactions.
- Store private keys securely (never in the frontend).

---

## 3. Next Steps
- Replace demo components with real Pi Network SDK integrations when ready.
- Test all payment and wallet flows in Sandbox before going live.
- Document any custom logic or flows for future developers.

---

For questions, contact: [your-contact@email.com]

# Sandbox Mode Guide

This guide explains how to enable, configure, and use Sandbox Mode in your project. Sandbox Mode is essential for testing, integration with Pi Network, and safe development before deploying to production.

---

## 1. What is Sandbox Mode?
Sandbox Mode is a test environment where you can safely develop and test features without affecting real users or production data. Pi Network and many platforms require a clear separation between sandbox and production.

---

## 2. Setting Up Sandbox Environment Variables

Copy the example file and adjust values as needed:

```bash
cp env.sandbox.example.txt .env.sandbox
```

Example variables:
```
NEXT_PUBLIC_APP_ENV=sandbox
NEXT_PUBLIC_DOMAIN_SANDBOX=http://localhost:3000
NEXT_PUBLIC_PI_SANDBOX=true
NEXT_PUBLIC_API_URL_SANDBOX=https://sandbox-api.yourdomain.com
```

---

## 3. Using the SandboxModeBanner Component

Import the banner and render it at the top of your app:

```tsx
import SandboxModeBanner from './src/components/SandboxModeBanner';

function App() {
  return (
    <>
      <SandboxModeBanner />
      {/* ...rest of your app */}
    </>
  );
}
```

The banner will only appear if Sandbox Mode is active (see env variables above).

---

## 4. Why is Sandbox Mode Important?
- **Required by Pi Network and other platforms for app review**
- Prevents real transactions/data loss during testing
- Allows safe integration with test wallets, test APIs, and fake data
- Makes it easy to debug and demonstrate features

---

## 5. Best Practices
- Never use real API keys or production endpoints in Sandbox
- Always verify the banner is visible during testing
- Separate test and production wallets/accounts

---

## 6. Troubleshooting
- If the banner doesn't show: check your env variables and restart your dev server.
- Make sure `.env.sandbox` or your sandbox env file is loaded by your build tool.

---

## 7. Next Steps
- Integrate other sandbox-only features (test payments, fake users, etc.)
- Use this guide when onboarding new developers or submitting your app for review.

---

For questions, contact: [your-contact@email.com]

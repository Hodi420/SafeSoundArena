# SafeSoundArena Frontend

A modern, modular frontend for the SafeSoundArena platform, built with React, TypeScript, Zustand, and React Query.

## ✨ Features

- Accessible, responsive UI with semantic HTML
- Marketplace for trading items
- Guild management panel
- Notification center with real-time updates
- Theme toggling and persistent state
- Modular, maintainable code structure
- Comprehensive tests for hooks and components

## 📦 Project Structure

```
frontend/
├── src/
│   ├── components/    # Reusable React components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API clients and logic
│   ├── store/         # State management (Zustand, etc.)
│   ├── utils/         # Utility/helper functions
│   ├── types/         # TypeScript types/interfaces
│   ├── constants/     # App-wide constants
│   ├── context/       # React Context providers
│   └── tests/         # Unit/integration tests
├── package.json
├── README.md
└── ...
```

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Run the app:**
   ```bash
   npm start
   # or
   yarn start
   ```

3. **Run tests:**
   ```bash
   npm test
   # or
   yarn test
   ```

## 🛠️ Linting & Formatting

- **Lint:** `npm run lint`  
- **Format:** `npm run format`

## 🧪 Testing

- Unit and integration tests are in `src/tests/`
- Uses Jest and React Testing Library
- Example: Run all tests with
  ```bash
  npm test
  # or
  yarn test
  ```
- To add a test, create a `.test.ts` or `.test.tsx` file in `src/tests/` or next to the component.
- Mocks are used for API and store hooks to test all UI states.

## 🛡️ Code Quality

- **Lint:** `npm run lint` (checks code style and errors)
- **Format:** `npm run format` (auto-formats code)
- Commit only clean code: run lint and format before pushing.
- ESLint and Prettier config files are in the project root.

## 🏗️ Technologies Used

- React + TypeScript
- Zustand (state management)
- React Query (data fetching)
- Jest (testing)
- ESLint + Prettier (linting/formatting)

## 📄 Environment Variables

Copy `.env.example` to `.env` and fill in your settings.

## 📝 Conventions

- **Naming:** Use descriptive, self-documenting names for files, functions, and variables.
- **Structure:** Keep code modular. Use `src/components`, `src/hooks`, `src/utils`, etc.
- **Accessibility:** All interactive elements must have accessible labels and keyboard support.
- **Testing:** All hooks and components should have unit tests covering success, error, and empty states.
- **Docs:** Keep this README and code comments up-to-date.

## 📬 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 📚 License

[MIT](LICENSE)

---

## 🛡️ Compliance & Integrations

This project is built to comply with global standards (US, EU, Pi Network) and to support decentralized deployment and modern payment flows.

### Key Guides & Components

- **Sandbox Mode:**
  - [README.SANDBOX.md](./README.SANDBOX.md)
  - [SandboxModeBanner.tsx](./src/components/SandboxModeBanner.tsx)
  - _How to enable sandbox, why it's required, and best practices._

- **Domain Ownership Validation:**
  - [README.DOMAIN-VALIDATION.md](./README.DOMAIN-VALIDATION.md)
  - [DomainValidationHelper.tsx](./src/components/DomainValidationHelper.tsx)
  - _How to validate your domain for Pi Network and similar platforms._

- **Pi Payment & Wallet Demos:**
  - [README.PAYMENT-WALLET.md](./README.PAYMENT-WALLET.md)
  - [PiPaymentDemo.tsx](./src/components/PiPaymentDemo.tsx)
  - [AppWalletDemo.tsx](./src/components/AppWalletDemo.tsx)
  - _Simulate payments and wallet integration; ready for real Pi SDK/API integration._

- **Privacy & Terms:**
  - [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)
  - [TERMS_OF_SERVICE.md](./TERMS_OF_SERVICE.md)
  - _Compliant with GDPR, CCPA, and US/global standards._

- **IPFS & Unstoppable Domains:**
  - [README.IPFS-UNSTOPPABLE.md](./README.IPFS-UNSTOPPABLE.md)
  - _Guide for decentralized hosting and domain linking._

- **AI/API Integrations:**
  - [README.AI-API-INTEGRATION.md](./README.AI-API-INTEGRATION.md)
  - _How to connect to AI services and manage API calls._

---

**Always review and update compliance files before production!**

For any questions, contact: [your-contact@email.com]

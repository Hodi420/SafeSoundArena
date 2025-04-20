# Domain Ownership Validation Guide

This guide explains how to prove domain ownership for your app, as required by Pi Network and other global platforms.

---

## 1. Why is Domain Validation Required?
- To verify that you control the domain where your app is hosted
- Required for Pi Network app approval and many other integrations
- Prevents abuse and ensures trust

---

## 2. How to Validate Your Domain

### Step 1: Get Your Validation Key
- Obtain your unique validation key from the Pi Developer Portal or the relevant platform.

### Step 2: Create the validation-key.txt File
- Create a plain text file named `validation-key.txt`.
- Paste your validation key inside (no extra spaces or lines).

### Step 3: Upload the File
- Upload `validation-key.txt` to the root of your hosting domain.
- The file should be accessible at:  
  `https://yourdomain.com/validation-key.txt`

### Step 4: Confirm
- Use the platform's validation tool to confirm your domain is verified.

---

## 3. Using the DomainValidationHelper Component

To help users or admins, include the `DomainValidationHelper` React component:

```tsx
import DomainValidationHelper from './src/components/DomainValidationHelper';

<DomainValidationHelper validationKey="YOUR_VALIDATION_KEY" />
```
- Allows copying the key and downloading a ready-to-upload file.

---

## 4. Troubleshooting
- Make sure the file is at the root (not in a subfolder)
- Check for typos in the filename or key
- File must be publicly accessible (no authentication required)

---

For questions, contact: [your-contact@email.com]

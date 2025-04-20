# Deploying Your Site to IPFS and Unstoppable Domains

This guide will walk you through deploying your frontend site to IPFS and connecting it to your Unstoppable Domain for decentralized hosting.

---

## 1. Build Your Site

If you use React, Next.js, Vue, or similar, run:

```bash
npm run build
# or
yarn build
```

This will create a `build` or `dist` folder with your static site files.

---

## 2. Upload to IPFS

### Option A: Using [web3.storage](https://web3.storage/)
1. Go to [web3.storage](https://web3.storage/) and sign up/log in.
2. Click "Upload" and select your `build` or `dist` folder.
3. Wait for the upload to finish and copy the **CID** (hash) you receive.

### Option B: Using IPFS Desktop
1. Download and install [IPFS Desktop](https://docs.ipfs.tech/install/ipfs-desktop/).
2. Open IPFS Desktop and drag your `build` or `dist` folder into the window.
3. Copy the **CID** (hash) shown for your folder.

### Option C: Using IPFS CLI
1. Install IPFS CLI: https://docs.ipfs.tech/install/command-line/
2. In your project directory, run:
   ```bash
   ipfs add -r build/
   ```
3. Copy the **CID** from the last line (the folder hash).

---

## 3. Connect Your Unstoppable Domain

1. Go to [Unstoppable Domains](https://unstoppabledomains.com/) and log in.
2. Go to "My Domains" and select your domain.
3. Click "Manage" > "Website" > "IPFS Website".
4. Paste your **CID** (hash) into the field.
5. Save changes (it may take a few minutes to propagate).

---

## 4. Access Your Site

- Visit your Unstoppable Domain (e.g., `https://yourdomain.crypto`).
- Or, access directly via IPFS gateway: `https://ipfs.io/ipfs/YOUR_CID`

---

## 5. Updating Your Site

- Repeat steps 1–3 for every update. Each new upload gives a new CID. Update your domain with the new CID.

---

## 6. Tips

- Make sure your `index.html` is at the root of your uploaded folder for best compatibility.
- Use relative paths for assets in your site (not absolute paths).
- You can use any public IPFS gateway (e.g., Cloudflare, Pinata) to view your site.

---

בהצלחה!

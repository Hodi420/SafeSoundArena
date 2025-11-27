# SafeSoundArena Frontend (Clean)

A modern Next.js frontend for SafeSoundArena with a polished UI, theme customizer, and integrations to the backend API and license server.

## Features

- Layout with Navbar/Footer, responsive and theme-aware
- Theme Customizer (fonts, colors, styles, neon intensity, animation speed)
- Pages:
  - Home: quick access cards
  - Leaderboard: fetches from `/api/leaderboard/:type` (overall/scam_detection/community_impact)
  - Jail: shows current jail status from `/api/jail-status`
  - License: verify a license key against the license server `/verify`
- Healthcheck endpoint: `/api/healthz`
- Production-ready Dockerfile

## Requirements

- Node.js 18+
- Backend API running (Express) with endpoints:
  - `GET /api/leaderboard/:type`
  - `GET /api/jail-status`
- License server (optional) with endpoint:
  - `POST /verify`

## Environment Variables

Create `.env.local` for local dev or pass env vars to Docker:

- `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`)
- `NEXT_PUBLIC_LICENSE_URL` (default `http://localhost:3010`)
- Optional analytics: `NEXT_PUBLIC_GA_MEASUREMENT_ID`

## Scripts

- `npm run dev` – start local dev server
- `npm run build` – build production
- `npm start` – start production server

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Docker

Build and run the production image:

```bash
docker build -t safesoundarena-clean:latest -f Dockerfile .
docker run -d --name ssa-frontend \
  -p 3001:3000 \
  -e NEXT_PUBLIC_API_URL=http://host.docker.internal:4000 \
  -e NEXT_PUBLIC_LICENSE_URL=http://host.docker.internal:3010 \
  safesoundarena-clean:latest
```

## Theming

Theme state is stored via Zustand (`store/useThemeStore.ts`). The customizer is available from the Navbar button.

## Notes

- This frontend targets the in-repo backend (`backend/`) and license-server. Update `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_LICENSE_URL` when deploying.
- For the older `frontend/` app, there are unresolved merge conflicts. Use this clean app for production.

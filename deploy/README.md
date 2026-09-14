# Ubuntu LAN Deployment

This deployment runs the API and Next.js frontend on an Ubuntu mini PC or a NAS
that supports Docker Engine and Compose.

## Prepare the host

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in after adding the user to the `docker` group.

## Configure the deployment

From the repository root, create a local `.env` file. Do not commit it:

```dotenv
LAN_BIND_IP=0.0.0.0
NEXT_PUBLIC_API_URL=http://192.168.1.50:4000
ALLOWED_ORIGINS=http://192.168.1.50:3000
PI_API_KEY=replace-me
ADMIN_TOKEN=replace-me
```

Replace `192.168.1.50` with the static LAN address of the Ubuntu host. Add any
other API keys required by the enabled services.

## Start and verify

```bash
git pull
docker compose up -d --build
docker compose ps
curl http://192.168.1.50:4000/api/health
```

Open `http://192.168.1.50:3000` from another device on the LAN.

## Operations

```bash
docker compose logs -f api-server
docker compose logs -f frontend
docker compose restart
docker compose down
```

The IPFS data is stored in the named `ipfs_data` volume. Back up Docker volumes
before moving the stack between the mini PC and NAS. For internet access, put a
VPN or HTTPS reverse proxy in front of the frontend instead of exposing ports
directly.
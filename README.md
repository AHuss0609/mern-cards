# MERN Cards (COP 4331C)

The Cards app from Dr. Aedo's
[MERN tutorial](https://github.com/johnaedo/cop4331c-MERN-tutorial), built
through Step 13: register, log in, add, search, edit and delete trading
cards, and log out.

Live site: **https://cards.lampali.lol**

| Folder | What it is |
|---|---|
| [`cards-backend/`](cards-backend) | REST API: Node.js, Express, MongoDB (Mongoose), JWT login, bcrypt passwords. Docs at `/api/docs`. |
| [`cards-frontend/`](cards-frontend) | React + Vite + TypeScript + Bootstrap single-page app. |
| [`setup-droplet.sh`](setup-droplet.sh) | One-command production setup on a DigitalOcean LAMP droplet. |

GitHub Actions (`.github/workflows/`) runs the backend tests and the frontend
lint and build on every push.

## Run it locally

```bash
cd cards-backend
cp .env.example .env
docker compose up --build      # API on http://localhost:5000, MongoDB seeded

cd ../cards-frontend
npm install
npm run dev                    # http://localhost:8000
```

## Deploy

1. Create a droplet from the DigitalOcean Marketplace **LAMP** image.
2. Point an `A` record for your hostname at the droplet's IP.
3. In MongoDB Atlas, allow the droplet's IP under Network Access.
4. In the droplet's console, as root:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/AHuss0609/mern-cards/main/setup-droplet.sh -o setup.sh
   bash setup.sh
   ```

The script does the server side of tutorial Steps 7 and 13: the `deploy`
user, Node 26 via nvm, the API as a systemd user service, the frontend build,
the Apache site (`/api` proxied to Node on port 5000) and a Let's Encrypt
certificate. Run it again after pushing changes to redeploy.

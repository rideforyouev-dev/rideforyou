# Ride For You client deployment

This repository contains the existing MongoDB rental website and operations dashboard.
It replaces the mistakenly deployed Prisma/mobile-app repository. It does not run Prisma
or require PostgreSQL.

## Build and runtime

- Source: `rideforyouev-dev/rideforyou`, branch `main`, repository root `/`.
- Root `railway.toml` selects the Dockerfile and `node server.js` start command.
- Docker builds the React/Vite client with locked dependencies, then serves `client/dist`
  from Express on Railway's supplied `PORT`. Node 24 is used for build and runtime.
- Public website: `/`; rental login: `/login`; rental dashboard: `/app/dashboard`.
- `/health` reports MongoDB connectivity. Do not publish full diagnostic responses.

## Private Railway settings

Keep the existing values in the client service's private Variables tab. Never commit them.
The app uses `MONGODB_URI`, JWT settings, configured admin credentials and the existing
payment/WhatsApp provider variables. `DATABASE_URL` is unused by this code.
`BACKEND_URL` and `FRONTEND_URL` must match the actual public origin at cutover.

`/sales/` proxies to the independent existing sales workspace. Keep it available and set
`SALES_SERVICE_URL` to that upstream origin, without a `/sales` suffix. Do not point it
back at this website. The existing `sales/` source is retained for a separate service
deployment (root `/sales`), but the website Docker image does not run it or migrate
its SQLite volume. Keep its existing persistent volume and credentials in that service.

## Account transfer

The new Docker runtime defaults `PAUSE_AUTO_REMINDERS=true` so it cannot duplicate
customer reminders while the old deployment is running against the same MongoDB.
After the old instance is stopped and the client deployment is verified, explicitly set
`PAUSE_AUTO_REMINDERS=false` in the client service and redeploy. Other existing daily
status jobs remain unchanged.

No database reset, migration, operational fix script or manual seed command is run by
the build. Existing startup behavior creates an admin only if none exists and explicit
`ADMIN_EMAIL` and `ADMIN_PASSWORD` values are configured. Existing accounts are retained.

Uploaded files under `public/assets` require persistent storage or external storage to
survive container replacements. Git transfers code and bundled public assets, not old
runtime uploads or database records. Keep the existing data/storage until cutover is complete.

## Validation

Run `npm ci --include=dev`, `node --test test/sales-proxy.test.cjs`,
`npm --prefix client ci --include=dev`, and `npm --prefix client run build`.
The proxy test uses local mock servers; it does not connect to MongoDB or send messages.

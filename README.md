# My Marketplace

A local Angular 22 and Express class project. One account can buy and sell. Checkout records a simulated USD order, deducts stock, and clears the cart in one PostgreSQL transaction.

## Start locally

Use Node.js 24 and npm, and start Docker Desktop. This project expects PostgreSQL 18 in the existing `ecommerce-postgres` container.

```bash
npm ci
cp -n .env.example .env
docker start ecommerce-postgres
npm run db:init
npm run db:seed
npm run dev
```

Open the storefront at **http://localhost:9090**. The API is at **http://localhost:3000/api**, with **http://localhost:9090/api/health** for a database connectivity check through the Angular proxy. Use the storefront URL to test cookies and API requests.

If the container does not exist, create it once:

```bash
docker run -d --name ecommerce-postgres \
  -e POSTGRES_DB=ecommerce -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -p 127.0.0.1:5432:5432 -v ecommerce-postgres-data:/var/lib/postgresql \
  postgres:18
```

The backend reads `PORT`, `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `UPLOAD_DIR`, and `COOKIE_SECURE` from the environment or the root `.env`. The example matches `localhost:5432/ecommerce` with local postgres credentials. Update `proxy.conf.json` if you change the API port. Uploaded photos go to `server/uploads/` by default. The browser accesses PostgreSQL data only through the API.

## Demo accounts

All four passwords are `DemoShop123`.

| Name | Email |
| --- | --- |
| Maya Chen | `maya@example.test` |
| Jordan Lee | `jordan@example.test` |
| Sam Rivera | `sam@example.test` |
| Alex Patel | `alex@example.test` |

Maya starts with a keyboard from Jordan in her cart, favorites, and a past order. You can also register and start shopping or selling immediately.

## Database setup

Run the npm initialization and seed commands once before the first launch. They use the container's own `psql` and are separate from application startup.

```bash
docker exec -i ecommerce-postgres psql -X -U postgres -d ecommerce -v ON_ERROR_STOP=1 < database/01_schema.sql
docker exec -i ecommerce-postgres psql -X -U postgres -d ecommerce -v ON_ERROR_STOP=1 < database/02_seed.sql
```

All app tables and named database objects have the exact uppercase `AH_` prefix and are quoted in SQL, for example `"AH_items"`. The scripts are additive and leave unrelated data in place. See [database/README.md](database/README.md) for seed behavior.

For a database connection error, check the container status and published port with `docker ps -a --filter name=ecommerce-postgres` and `docker port ecommerce-postgres 5432`. Run `docker exec ecommerce-postgres pg_isready -U postgres -d ecommerce` to check readiness. For authentication failures, check the `PG*` values in `.env` against the existing container. For missing tables, run `npm run db:init` against the intended database.

## Build and smoke test

```bash
npm run build
npm test -- --watch=false
# In another terminal with npm run dev still running
npm run smoke
```

You can start each service independently with `npm run dev:frontend` and `npm run dev:backend`. The frontend build is in `dist/ecommerce-demo/browser`, and the backend build is in `server/dist`. Run `node server/dist/main.js` from the repository root to start the built API.

The smoke test uses the real proxy and database. It creates separate test accounts and a sample purchase, then soft-deletes its test listings. It leaves the test accounts and purchase history available in PostgreSQL and does not spend stock on the seeded listings.

## API

Routes below are relative to `/api`. Mutations and private reads use the session cookie returned by login or registration.

| Area | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Categories | `GET /categories`, `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id` |
| Listings | `GET /items?q=&category=&mine=true`, `GET /items/:id`, `POST /items`, `PUT /items/:id`, `DELETE /items/:id` |
| Photos | `GET /photos/:key` (bundled keys begin with `seed/`) |
| Cart | `GET /cart`, `PUT /cart/:id` with `quantity` and optional `add: true`, `DELETE /cart/:id` |
| Favorites | `GET /favorites`, `PUT /favorites/:id`, `DELETE /favorites/:id` |
| Orders | `POST /checkout`, `GET /orders`, `GET /orders/:id` |

Listing writes accept multipart form data with `name`, `title`, `description`, `price`, `category_id`, `stock`, optional repeated `photos` files, and optional repeated `remove_photos` storage keys on edit.

See [CLOUD.md](CLOUD.md) for the planned Google Cloud architecture.

## Run the Cloud Run function locally

The regular Angular and Express development workflow remains on ports 9090 and 3000. To exercise the packaged function with the local database, use Node.js 24 and run these from the project root after initializing the local database:

```bash
npm run build:function
PHOTO_STORAGE=local COOKIE_SECURE=false npm run dev:function
# In another terminal
SMOKE_URL=http://localhost:8080 npm run smoke
```

Leave both `INSTANCE_CONNECTION_NAME` and `DATABASE_URL` unset for PostgreSQL on Docker. Running from the repository root lets the function read the root `.env` and serve the bundled local seed photos. The function listens on port 8080 by default. Set `PORT=8080` when your environment defines a different port. Check `http://localhost:8080/api/health` for connectivity.

The console-ready files are `cloud-function/index.js` and `cloud-function/package.json`. Run `npm run build:function` to regenerate them and `npm install --prefix cloud-function --package-lock-only` to refresh the function lockfile when its dependencies change. The deployable function uses the Google Cloud Storage backend. See [CLOUD.md](CLOUD.md) for cloud configuration.

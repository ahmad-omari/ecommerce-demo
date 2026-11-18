# Local PostgreSQL scripts

Use the existing PostgreSQL 18 container named `ecommerce-postgres` and the existing `ecommerce` database.

```bash
docker start ecommerce-postgres
npm run db:init
npm run db:seed
```

The npm commands use `psql` inside Docker. From the repository root, the equivalent commands are:

```bash
docker exec -i ecommerce-postgres psql -X -U postgres -d ecommerce -v ON_ERROR_STOP=1 < database/01_schema.sql
docker exec -i ecommerce-postgres psql -X -U postgres -d ecommerce -v ON_ERROR_STOP=1 < database/02_seed.sql
```

- `01_schema.sql` creates the marketplace tables and indexes in `public` with `IF NOT EXISTS`.
- `02_seed.sql` uses stable UUIDs and conflict-safe inserts. Reruns preserve existing listing edits, stock, orders, and carts. A removed sample favorite can be added back on a rerun.
- Both scripts run in transactions. Every application table, index, and named constraint starts with the exact quoted prefix `"AH_`. PostgreSQL folds unquoted identifiers to lowercase.
- Sample orders hold purchase-time item names, seller names, and prices. Current seed stock represents stock after the sample order history.

On the shared cloud database, review the schema and run it under a role scoped to this project's objects. Apply only changes to the quoted `"AH_..."` objects owned by this project and leave other students' data and schema intact.

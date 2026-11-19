# Deploy My Marketplace as one HTTP function

Build from the repository root with Node.js 24:

```bash
npm ci
npm run build:function
```

In Google Cloud Console, select project `ualr-advanced-cloud-computing` and region `us-central1`. Use a single HTTP Cloud Run function with runtime **Node.js 24** and entry point **`ahMarketplaceApi`**. Copy `cloud-function/index.js` and `cloud-function/package.json` into the source editor. If uploading a source directory instead, include `cloud-function/package-lock.json` for pinned transitive dependencies. The maintained entry point is `server/function.ts`. The build bundles the TypeScript application and declares external dependencies in its own manifest. Keep source credentials, Angular files, local photos, and `node_modules` outside the function payload. [Cloud Run function source](https://docs.cloud.google.com/run/docs/write-functions)

| Variable | Cloud value |
| --- | --- |
| `INSTANCE_CONNECTION_NAME` | Leave unset for direct PostgreSQL. Set to `ualr-advanced-cloud-computing:us-central1:class-sql` only to select the connector |
| `DATABASE_URL` | Expose the existing Secret Manager secret `class-database-url` as this environment variable |
| `PGDATABASE` | `postgres` |
| `PGUSER` | Optional override for the username from `DATABASE_URL` |
| `PGPASSWORD` | Optional override for the password from `DATABASE_URL` |
| `PHOTO_STORAGE` | `gcs` |
| `GCS_BUCKET` | `thompson-bucket` |
| `GCS_PREFIX` | `ahmad/` |
| `COOKIE_SECURE` | `false` for the initial HTTP VM demo, `true` when the storefront uses HTTPS |

## Direct PostgreSQL and networking

- Expose the existing `class-database-url` secret as `DATABASE_URL` and give the runtime identity access to that secret. Leave `INSTANCE_CONNECTION_NAME` unset. The application uses the URI's host and port (default 5432) with PostgreSQL authentication, so this path requires zero Cloud SQL Admin API calls or Cloud SQL Client IAM permissions. Explicit nonempty `PGDATABASE`, `PGUSER`, and `PGPASSWORD` override the corresponding decoded URI values. [Cloud Run secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- Configure Direct VPC egress with `class-vpc`, subnet `ahmad-private-subnet` (`10.0.4.0/24`), and private ranges only. Verify the URI's host resolves to the intended private destination and the VPC can reach the URI's port. The confirmed Cloud SQL private address is `10.82.192.3`. [Direct VPC egress](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc) · [Cloud SQL networking](https://docs.cloud.google.com/sql/docs/postgres/connect-compute-engine)
- The shared URI's `sslmode=require` follows libpq compatibility semantics. Without a configured CA, it encrypts the connection without verifying the server certificate. With `sslrootcert`, it verifies the certificate chain. `verify-ca` requires a readable CA file, and `verify-full` verifies both the chain and server identity. If the URI omits `sslmode`, the app defaults to `verify-full`. Direct connections always require TLS. [PostgreSQL SSL modes](https://www.postgresql.org/docs/current/libpq-ssl.html)
- Setting `INSTANCE_CONNECTION_NAME` selects the existing connector first. It supplies the private network transport and verified TLS, using `DATABASE_URL` only as a credential fallback. Connector mode requires the Cloud SQL Admin API, `roles/cloudsql.client`, TCP 3307 to the instance, and HTTPS access to the Cloud SQL Admin API. With both variables unset, the application uses the local Docker `PG*` settings. Each function instance can use up to five PostgreSQL connections. [Cloud SQL access](https://docs.cloud.google.com/sql/docs/postgres/connect-run) · [Node.js connector](https://github.com/GoogleCloudPlatform/cloud-sql-nodejs-connector)
- The shared database already contains the quoted `"AH_..."` tables and seed records. Leave the existing data in place and skip the SQL initialization and seed commands for cloud.

## Private photos

Give the runtime identity object read, create, and delete permissions scoped to `projects/_/buckets/thompson-bucket/objects/ahmad/`. Keep the bucket private. The backend reads and writes only validated keys under the configured prefix. To show seeded photos, the JPEGs referenced by the seed records must exist under `ahmad/seed/` in the bucket. For example, copy `public/seed/item-1.jpg` to `ahmad/seed/item-1.jpg` when preparing assets. Database keys and URLs stay the same, such as `seed/item-1.jpg` and `/api/photos/seed/item-1.jpg`. [Cloud Storage IAM conditions](https://docs.cloud.google.com/storage/docs/access-control/iam)

## Angular, API Gateway, and HTTPS

For the initial HTTP demo, run `npm run package:vm` locally to create `marketplace-ah-vm.tar.gz` in the project root. The script builds `dist/ecommerce-demo/browser` and verifies the pinned Linux amd64 Caddy release archive against the official checksums before extracting the binary. Upload the bundle and follow the [VM installer instructions](deploy/vm/README.md). Caddy serves HTTP on port 9090 and proxies `/api` and `/api/*` over HTTPS with unchanged routes, query strings, cookies, and response `Set-Cookie` headers. Configure the gateway to forward requests to the function and use an ID token with the function URL as its audience. Grant `roles/run.invoker` on the backing Cloud Run service to the gateway's service account and use ingress that admits gateway traffic. IAM authorizes the gateway to invoke the function. The application separately authenticates the shopper using its PostgreSQL-backed session cookie. [Backend authorization](https://docs.cloud.google.com/api-gateway/docs/securing-backend-services) · [Cloud Run function invocation](https://docs.cloud.google.com/functions/docs/securing/authenticating)

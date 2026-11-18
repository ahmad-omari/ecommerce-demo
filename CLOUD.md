# Deploy My Marketplace as one HTTP function

Build from the repository root with Node.js 24:

```bash
npm ci
npm run build:function
```

In Google Cloud Console, select project `ualr-advanced-cloud-computing` and region `us-central1`. Use a single HTTP Cloud Run function with runtime **Node.js 24** and entry point **`ahMarketplaceApi`**. Copy `cloud-function/index.js` and `cloud-function/package.json` into the source editor. If uploading a source directory instead, include `cloud-function/package-lock.json` for pinned transitive dependencies. The maintained entry point is `server/function.ts`. The build bundles the TypeScript application and declares external dependencies in its own manifest. Keep source credentials, Angular files, local photos, and `node_modules` outside the function payload. [Cloud Run function source](https://docs.cloud.google.com/run/docs/write-functions)

| Variable | Cloud value |
| --- | --- |
| `INSTANCE_CONNECTION_NAME` | `ualr-advanced-cloud-computing:us-central1:class-sql` |
| `PGDATABASE` | `postgres` |
| `PGUSER` | Existing PostgreSQL user with access to the application tables |
| `PGPASSWORD` | Password for that user, supplied from Secret Manager |
| `PHOTO_STORAGE` | `gcs` |
| `GCS_BUCKET` | `thompson-bucket` |
| `GCS_PREFIX` | `ahmad/` |
| `COOKIE_SECURE` | `true` |

## Cloud SQL and networking

- Configure Direct VPC egress with `class-vpc`, subnet `ahmad-private-subnet` (`10.0.4.0/24`), and private ranges only. The Cloud SQL connector selects the instance's private IP (`10.82.192.3`) via the instance connection name and verifies its TLS certificate. This uses the connector's path over TCP 3307, with HTTPS access to the Cloud SQL Admin API over TCP 443. Leave `PGHOST` and `PGPORT` unset for the function. Verify that the VPC and firewall permit the private IP path. [Direct VPC egress](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc) · [Connector networking](https://docs.cloud.google.com/sql/docs/postgres/connect-compute-engine) · [Node.js connector](https://github.com/GoogleCloudPlatform/cloud-sql-nodejs-connector)
- Verify the Cloud SQL Admin API is enabled and the function runtime identity has `roles/cloudsql.client`. Give the identity access to the required Secret Manager secret. It uses Application Default Credentials from the Cloud Run runtime. Each instance can use up to five PostgreSQL connections, so set the function's maximum instances with the shared database capacity in mind. [Cloud SQL access](https://docs.cloud.google.com/sql/docs/postgres/connect-run) · [Cloud Run secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- The shared database already contains the quoted `"AH_..."` tables and seed records. Leave the existing data in place and skip the SQL initialization and seed commands for cloud.

## Private photos

Give the runtime identity object read, create, and delete permissions scoped to `projects/_/buckets/thompson-bucket/objects/ahmad/`. Keep the bucket private. The backend reads and writes only validated keys under the configured prefix. To show seeded photos, the JPEGs referenced by the seed records must exist under `ahmad/seed/` in the bucket. For example, copy `public/seed/item-1.jpg` to `ahmad/seed/item-1.jpg` when preparing assets. Database keys and URLs stay the same, such as `seed/item-1.jpg` and `/api/photos/seed/item-1.jpg`. [Cloud Storage IAM conditions](https://docs.cloud.google.com/storage/docs/access-control/iam)

## Angular, API Gateway, and HTTPS

Serve `dist/ecommerce-demo/browser` on the public web VM over HTTPS with an Angular route fallback to `index.html`. Reverse proxy `/api/**` through API Gateway with unchanged routes, query strings, cookies, and response `Set-Cookie` headers. Configure the gateway to forward requests to the function and use an ID token with the function URL as its audience. Grant `roles/run.invoker` on the backing Cloud Run service to the gateway's service account and use ingress that admits gateway traffic. IAM authorizes the gateway to invoke the function. The application separately authenticates the shopper using its PostgreSQL-backed session cookie. [Backend authorization](https://docs.cloud.google.com/api-gateway/docs/securing-backend-services) · [Cloud Run function invocation](https://docs.cloud.google.com/functions/docs/securing/authenticating)

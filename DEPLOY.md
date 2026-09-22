# Deploying ARA Workspace to Azure

One Linux **App Service** runs the Node API and serves the built React app from the same URL.
Data lives in **Azure Database for MySQL – Flexible Server**; task images stay in the existing Blob container.

```
Browser ──HTTPS──> App Service (node backend/src/server.js)
                     ├── /api/*   Express
                     ├── /*       frontend/dist (SPA fallback)
                     ├── MySQL Flexible Server (SSL)
                     └── Blob Storage (amalrajcontainer / ara_workspace)
```

## 1. Push the code

GitHub Actions deploys whatever is on `main`. Commit and push everything first.

## 2. MySQL Flexible Server

Azure Portal → **Create a resource → Azure Database for MySQL flexible server**

| Setting | Value |
| --- | --- |
| Workload | Development (Burstable, B1ms) |
| MySQL version | 8.0 |
| Admin username / password | choose; keep them for step 4 |
| Networking | Public access · tick **Allow public access from any Azure service** · add your own IP as a firewall rule |

After it is created:

1. **Databases → Add** → name `ara_workspace`.
2. Server parameters → `require_secure_transport` stays **ON** (the app sets `DB_SSL=true`).

### Move the data

Easiest: copy your working local database.

1. MySQL Workbench → **Server → Data Export** → schema `ara_workspace` → *Export to Self-Contained File* → tick *Include Create Schema* → Start Export.
2. Workbench → new connection: host `<server>.mysql.database.azure.com`, port 3306, the admin user, **SSL → Use SSL: Require**.
3. On that connection: **Server → Data Import** → *Import from Self-Contained File* → Start Import.

Fresh install instead: run `backend/database/migrations/01…15` in order on the Azure server, then `node database/seed_admin.js` with the Azure connection values in your environment.

## 3. App Service

Azure Portal → **Create a resource → Web App**

| Setting | Value |
| --- | --- |
| Publish | Code |
| Runtime stack | Node 22 LTS |
| OS | Linux |
| Region | same as the database |
| Plan | Basic B1 (Always On needs Basic or higher) |

After it is created, open the app and set:

**Settings → Environment variables → App settings** (Add each, then *Apply*):

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://<app-name>.azurewebsites.net` |
| `DB_HOST` | `<server>.mysql.database.azure.com` |
| `DB_PORT` | `3306` |
| `DB_USER` | the MySQL admin username |
| `DB_PASSWORD` | its password |
| `DB_NAME` | `ara_workspace` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | a new value: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `STORAGE_DRIVER` | `azure` |
| `AZURE_STORAGE_CONNECTION_STRING` | from Storage account → Access keys |
| `AZURE_STORAGE_CONTAINER` | `amalrajcontainer` |
| `AZURE_STORAGE_PREFIX` | `ara_workspace` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` |

**Settings → Configuration → General settings**

- Startup Command: `node backend/src/server.js`
- Always On: **On**
- SCM Basic Auth Publishing Credentials: **On** (needed to download the publish profile)

**Monitoring → Health check**: Enable, path `/api/health`.

## 4. Connect GitHub Actions

1. App Service → **Overview → Download publish profile** (a `.PublishSettings` file).
2. GitHub repo → **Settings → Secrets and variables → Actions**
   - *Secrets* → New repository secret → `AZURE_WEBAPP_PUBLISH_PROFILE` → paste the whole file contents.
   - *Variables* → New repository variable → `AZURE_WEBAPP_NAME` → the app name (without `.azurewebsites.net`).
3. Push to `main` (or Actions → *Deploy to Azure App Service* → Run workflow).

The workflow (`.github/workflows/deploy-azure.yml`) builds the frontend, installs backend production dependencies, and ships `backend/` + `frontend/dist/` as one package.

## 5. Check it

- `https://<app-name>.azurewebsites.net/api/health` → `{"message":"ARA Workspace API is running"}`
- `https://<app-name>.azurewebsites.net` → sign-in page.
- Problems: App Service → **Monitoring → Log stream** shows `MySQL connected successfully` / the error. The process exits on a database failure, so a wrong `DB_*` value shows up there immediately.

## 6. After it works

- Rotate the storage key that was ever pasted into chat or a file (Storage account → Access keys → Rotate), then update `AZURE_STORAGE_CONNECTION_STRING`.
- Custom domain: App Service → Custom domains → add, then enable the free managed certificate. Add the new origin to `CLIENT_URL` (comma-separated).
- Tighten the MySQL firewall to Azure services only once you no longer need Workbench access from your PC.

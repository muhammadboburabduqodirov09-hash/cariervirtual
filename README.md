# Mening Virtual Karyeram

A family workspace for career exploration, financial literacy and shared goals, with separate parent, child and administrator sign-in paths.

## Accounts and features

- **Parent:** create a family workspace, invite one child with a family code, assign career or growth tasks with rewards and optional due dates, review quiz completions, and approve or return work for another attempt.
- **Child:** join a parent's workspace with the invite code, complete tasks and skill quizzes, and track wallet balances and savings goals. Each workspace links one child account.
- **Administrator:** review user and family-workspace totals, search and filter accounts by role or status, inspect linked family/workspace summaries, export the current account page to CSV, suspend or restore access, and review the latest account-status changes.
- **Sign-in:** email/password accounts use server-side sessions and bcrypt password hashes. Family workspaces are stored in MongoDB and shared between the linked parent and child account.
- **Personalization:** parent, child, and administrator accounts can choose a green, blue, or yellow accent, enable dark mode, and upload a profile photo from the workspace settings drawer. Preferences are saved in that browser for the signed-in account and are not part of the shared family workspace.
- **Guided tour:** a first-visit dashboard tour explains navigation, task review, and how child rewards are earned. Replay it from Settings at any time.
- **Monthly reward limit:** parents set a family task-reward budget. Tasks posted during the current UTC calendar month count against the limit; the server rejects new tasks that would exceed it. Raise the limit from Family Controls to keep assigning tasks.
- **Family rules:** parents can temporarily reduce future approved task rewards to 50% or 25%, or pause voucher requests for a fixed period or until manually re-enabled. These rules do not remove money already earned.
- **Vouchers:** parents create and manage family-approved privileges. Children request them from their spendable balance; the parent reviews each request, and the server deducts the price only once on approval.
- **Private messages:** linked parents and children can message each other. Administrators can search for and privately message individual non-admin accounts. Conversations are stored in MongoDB.
- **Icons:** career, task, savings-goal, and profile choices use Lucide professional icons; older saved icon/emoji identifiers remain supported for compatibility.
- **Mongoose:** installed and used by the Express API for MongoDB models, indexes and queries.

This project does not send real money. Rewards are virtual learning balances. This demo does not include email verification or password-reset email delivery.

## Configure MongoDB and the server

Use a local MongoDB server or create a database with MongoDB Atlas and copy its connection URI. Server settings must stay in `.env` and must never use a `VITE_` prefix.

Copy `.env.example` to `.env` the first time you configure the project. If a `.env` already exists, keep it and add the server settings from the example; do not overwrite existing keys. Set:

- `MONGODB_URI` — your local or Atlas connection string.
- `SESSION_SECRET` — a private random value of at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — the initial administrator login. Use a unique password of at least 12 characters. The admin account is created the first time the server starts; admin accounts cannot be registered from the website.
- `API_PORT` — optional; defaults to `3001`.

`MONGODB_URI` accepts a MongoDB local URI (`mongodb://...`) or Atlas SRV URI (`mongodb+srv://...`). MongoDB Compass is a desktop client, not a database server: connect Compass to the same database URI to inspect the collections while the app connects through Mongoose. For Atlas, make sure the database user's password is URL-encoded in the connection string, and that the database network access list permits your development IP.

## Run locally

Open two terminals in the project directory:

```bash
npm run server   # Express API at http://localhost:3001
npm run dev      # Vite site at http://localhost:5173; /api requests are proxied to Express
```

The API must be running and connected to MongoDB for account registration, sign-in and admin features to work. To create a parent account, choose **Parent space** and register. Copy the family code from the parent overview, then register the child's account under **Child space** using that code. Use the configured admin email and password from **Administrator sign in**.

If registration reports a 404, open `http://localhost:3001/api/health` and confirm it returns JSON with `"ok": true` and `"database": true`. Start `npm run server` in a separate terminal and resolve any startup error before using the website. Open the Vite website at `http://localhost:5173`; its `/api` proxy uses `PORT`, then `API_PORT`, then `3001`, matching the API server. The Vite proxy is development-only; deployed sites must proxy `/api` to the Express server as described below.

```bash
npm run build    # production frontend build in dist/
```

Production deployments must serve the frontend and `/api` from the same site (or configure an equivalent secure same-origin reverse proxy), set `NODE_ENV=production`, and provide the server-only secrets through the deployment environment.

## Optional AI quizzes

Quizzes work offline. To generate scenario questions with DeepSeek, set `VITE_DEEPSEEK_API_KEY` in `.env`. `VITE_` values are bundled into browser code, so use a server-side proxy for production secrets.

## Data notes

- Rewards and wallet balances are virtual, educational values—not payments or financial records.
- Amounts are stored canonically in UZS; exchange rates in `src/lib/data.js` are approximate.
- User credentials and family workspaces are stored in MongoDB. The browser keeps a local workspace cache; MongoDB is authoritative after sign-in.

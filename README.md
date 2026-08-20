# Titan Interio Stock Manager

A full multi-user inventory management web app for Titan Interio's aluminium
fabrication & modular kitchen business — built with React, Tailwind CSS, and
Supabase (Postgres + Auth). Runs entirely on **free tiers**.

Pre-loaded with your **710 products across 61 categories** from the product sheet.

---

## What you get

- **Multi-user login** with 3 roles: Admin, Store Manager, Operator
- **Inventory master** — add/edit items, categories, and suppliers directly from the site
- **Stock In / Stock Out** forms with full transaction audit trail
- **Dashboard** — stock value, low-stock alerts, recent activity
- **Reports** — stock valuation by category, top consumed items, CSV export
- **Transaction history** — filterable, exportable
- **Your branding** — Titan Interio logo + gold/charcoal theme throughout

---

## Step-by-step setup (all free, ~20–30 minutes total)

### 1. Create your accounts (5 min)
- [github.com](https://github.com) — free account, to hold the code
- [supabase.com](https://supabase.com) — free account, for the database
- [vercel.com](https://vercel.com) — free account, to host the live site (sign up with your GitHub account to make step 4 easier)

### 2. Set up the database (10 min)

1. In Supabase, click **New Project**. Pick any name/password/region (keep the DB password somewhere safe).
2. Once the project is ready, open the **SQL Editor** (left sidebar).
3. Open `supabase/schema.sql` from this folder, copy its **entire contents**, paste into the SQL Editor, and click **Run**. This creates all tables, security rules, and the auto-stock-calculation logic.
4. Now run the seed files to load your product catalog — in the same SQL Editor:
   - Open `supabase/seed_categories.sql`, paste, click **Run** (loads your 61 categories)
   - Open `supabase/seed_items.sql`, paste, click **Run** (loads all 710 products)
5. Go to **Project Settings → API** (left sidebar, gear icon). You'll need two values in the next step:
   - **Project URL**
   - **anon public** key

### 3. Configure the app with your Supabase keys (2 min)

1. In this project folder, copy `.env.example` to a new file named `.env`
2. Paste in your Project URL and anon key from step 2.5 above

### 4. Deploy to Vercel (10 min)

**Option A — via GitHub (recommended, auto-deploys on future changes):**
1. Create a new empty repository on GitHub (e.g. `titan-interio-stock-manager`)
2. Upload this entire folder's contents to that repo (drag-and-drop on GitHub's web UI works fine, or use `git push` if you're comfortable with Git)
3. In Vercel, click **Add New → Project**, select your repo
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**. In ~1 minute you'll get a live URL like `titan-interio-stock-manager.vercel.app`

**Option B — quick CLI deploy (if you have Node.js installed locally):**
```bash
npm install -g vercel
cd titan-interio-stock-manager
npm install
vercel
# follow prompts, then add env vars when asked (or via the Vercel dashboard)
vercel --prod
```

### 5. Create your Admin account (2 min)

1. Visit your live site URL
2. Click **Create Account**, sign up with your own email/password
3. Every new signup starts as "Operator" — you need to make yourself Admin manually, **once**:
   - Go back to Supabase → **SQL Editor**, run:
     ```sql
     update profiles set role = 'admin' where email = 'your-email@example.com';
     ```
   - Replace with the email you signed up with
4. Sign out and back in on the site — you'll now see the full Admin menu (Users, Settings, Suppliers, Reports)

### 6. Add your staff

Once you're Admin, have each staff member visit the site and use **Create Account**.
Then go to the **Users** page and change their role from Operator to Store Manager
(or leave as Operator) as appropriate.

---

## Using the app

- **Inventory** — add new items, or edit any of the 710 pre-loaded ones. You can create new categories and suppliers right from the "Add Item" form, or from the Suppliers/Settings pages.
- **Stock In** — record material received from a supplier (updates stock automatically)
- **Stock Out** — record material issued to a job/production (updates stock automatically)
- **All pre-loaded items start at 0 stock** (as agreed) — use Stock In to enter your real opening quantities whenever you're ready. You don't have to do this in Supabase — the app handles it entirely.
- **Dashboard** shows real-time totals and flags anything below its reorder level (edit reorder levels per item in Inventory)

---

## About backups (important — read this)

Supabase's free tier does **not** include automatic backups. To cover this, the app has a
**"Download Full Backup"** button on the Settings page (Admin only) — it exports everything
(items, categories, suppliers, all stock transactions, users) as a single JSON file you can save
anywhere (email, Google Drive, a USB drive). **Recommended: do this weekly**, or before any bulk
changes. This costs nothing and takes 10 seconds.

The free tier also pauses a project after 7 days with zero activity — it wakes up automatically
(with a short delay) the next time anyone visits the site, with no data loss. Since your staff
will be using the app regularly, this is unlikely to ever trigger in practice.

## Setting up email alerts (low stock / out of stock)

This is optional but recommended — sends you (and any staff you add) an email listing
low-stock and out-of-stock items on a schedule you control (every 6 hours, daily, or weekly).
Fully configurable from the **Settings** page once set up — no code needed after this.

### What you need
- A free **Brevo** account (brevo.com) — for sending the emails
- The **Supabase CLI** installed on your computer (one-time, free) — to deploy the alert function
- Node.js installed on your computer (needed to run the Supabase CLI)

### 1. Create your Brevo account & get credentials (10 min)
1. Sign up free at [brevo.com](https://www.brevo.com)
2. Go to **Senders, Domains & Dedicated IPs → Senders** → add a sender using an email address you own (e.g. your Gmail) → verify it via the confirmation email Brevo sends. This is your `BREVO_SENDER_EMAIL`.
   - No domain needed for this — just proving you own that one email address.
3. Go to **Settings → SMTP & API → API Keys** → generate a new API key. Copy it — this is your `BREVO_API_KEY`.

### 2. Deploy the Edge Function (15 min)
Open a terminal in this project folder and run:
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF   # found in Supabase dashboard URL or Settings > General
supabase functions deploy send-stock-alert
```

Then set the secrets it needs (replace with your real values):
```bash
supabase secrets set BREVO_API_KEY=your_brevo_api_key
supabase secrets set BREVO_SENDER_EMAIL=your_verified_sender@example.com
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
Find `SUPABASE_SERVICE_ROLE_KEY` in Supabase → Project Settings → API (the "service_role" key — keep this secret, it has full database access).

`SUPABASE_URL` is set automatically by Supabase for Edge Functions, no action needed.

### 3. Run the alert database setup (5 min)
1. Open `supabase/alerts_setup.sql` from this project
2. In it, replace `YOUR_PROJECT_REF` and `YOUR_ANON_KEY` (from Project Settings → API) with your real values
3. Paste the whole file into Supabase's **SQL Editor** and click **Run**

This creates the settings table and schedules the checker to run every hour (it only actually
sends when your configured time/frequency matches — running hourly just lets it check).

### 4. Configure alerts from the app (2 min)
1. Sign in as Admin, go to **Settings**
2. Add recipient email(s), toggle **Enabled**, set frequency/time
3. Click **Send Test Email Now** to confirm it works before relying on the schedule

### Notes
- Brevo's free plan gives 300 emails/day — far more than a daily/weekly alert needs
- If "Send Test Email Now" fails, check: Edge Function deployed successfully, all 3 secrets set correctly, and your Brevo sender is verified
- All times are IST (India Standard Time)

## Costs

Everything above is **$0/month** on free tiers:
- Vercel free tier: generous bandwidth/build limits, plenty for a small team
- Supabase free tier: 500MB database, 50k monthly active users, 1GB file storage

If you later want a custom domain (e.g. `stock.titaninterio.com`) instead of the
free `.vercel.app` one, that's roughly $10–15/year for the domain itself — everything
else stays free.

---

## What's next (not included in this version, easy to add later)

- Barcode/QR scanning for stock in/out (you asked to skip this for now)
- Purchase order workflow
- Email alerts for low stock
- Multi-warehouse support

Just ask if you'd like any of these added.

---

## Folder structure

```
titan-interio-stock-manager/
├── supabase/
│   ├── schema.sql            ← run first (tables, security, auto-stock logic)
│   ├── seed_categories.sql   ← run second (61 categories)
│   ├── seed_items.sql        ← run third (710 products)
│   ├── alerts_setup.sql      ← run after deploying the alert Edge Function
│   └── functions/
│       └── send-stock-alert/ ← Edge Function for email alerts (see "Setting up email alerts")
├── src/
│   ├── pages/               ← one file per screen
│   ├── components/          ← sidebar layout, route guard
│   ├── context/              ← auth/session logic
│   └── lib/supabase.js      ← Supabase connection
├── public/logo.png          ← your logo
├── .env.example             ← copy to .env and fill in your Supabase keys
└── package.json
```



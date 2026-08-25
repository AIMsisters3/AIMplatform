# AIMsisters Ministry Platform

Full-stack scaffold: React/Vite/Tailwind frontend (public site + admin CMS) and a PHP 8 REST API backend on MySQL, built for local development with XAMPP.

## 1. Backend setup (XAMPP)

1. Copy the `Backend/` folder into your XAMPP `htdocs`, e.g.:
   `C:\xampp\htdocs\AIMTech\Backend` (Windows) or `/Applications/XAMPP/htdocs/AIMTech/Backend` (Mac).
2. Start **Apache** and **MySQL** in the XAMPP control panel.
3. Open phpMyAdmin (`http://localhost/phpmyadmin`) → **Import**, and import these files **in order**:
   1. `Backend/database/schema.sql` — creates the `aimsisters_db` database, all base tables, and seeds
      the default categories.
   2. `Backend/database/migrations/001_roles_permissions.sql` — adds the roles/permissions system
      (see §4a below).
   3. `Backend/database/migrations/002_soft_deletes_and_indexes.sql` — adds soft deletes + query indexes.
   4. `Backend/database/migrations/003_newsletter_subscribers.sql` — adds the newsletter table (this one
      isn't optional — without it, newsletter signup throws a fatal SQL error; see §5).

   Each migration file's header comment explains what it does and why. They're safe to run once each;
   re-running is a no-op error on the `ADD COLUMN`/`ADD INDEX` lines (that just means it already applied).
4. Secrets (DB password, JWT signing secret, SMTP credentials) now live in `Backend/.env`, which is
   git-ignored and **never committed** — see `Backend/.env.example` for the full list. On a fresh local
   checkout you don't need to create it yourself: the first request auto-generates a working `.env` with
   a random JWT secret and the standard XAMPP defaults (`root` / empty password). If your MySQL root
   password isn't empty, copy `.env.example` to `.env` and fill in `DB_USER`/`DB_PASS` yourself.
5. **Important:** the seed super-admin row in `schema.sql` has a placeholder password (it cannot be logged
   into as-is). Set a real one by running the bootstrap script:
   ```bash
   cd Backend/database
   php seed_admin.php
   # or with your own credentials:
   php seed_admin.php you@example.com "SomeOtherPassword!" "Your Name"
   ```
   No CLI PHP handy? Visit `http://localhost/AIMTech/Backend/database/seed_admin.php` in a browser instead
   (optionally add `?email=...&password=...&name=...`). Either way this hashes the password correctly with
   PHP's `password_hash()` — no more copy-pasting hashes into phpMyAdmin. Delete or move the script out of
   the web root once you're done with it; you can re-run it any time to reset the admin password.
   **After running migration 001**, also give that seeded admin a real role — it's created directly by
   `schema.sql`'s INSERT, before roles existed, so it has no `role_id` yet:
   ```sql
   UPDATE users u JOIN roles r ON r.slug = 'superadmin' SET u.role_id = r.id WHERE u.email = 'admin@aimsisters.org';
   ```
6. Test the API is live: visit `http://localhost/AIMTech/Backend/api/content` — you should get a JSON response.

## 2. Frontend setup

```bash
cd Frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` and proxies `/api/*` requests to
`http://localhost/AIMTech/Backend` (configured in `vite.config.js`).

- Public site: `http://localhost:5173/`
- Admin CMS: `http://localhost:5173/admin/login`

## 3. Project structure

```
AIMTech/
├── Backend/            PHP 8 REST API (XAMPP/Apache)
│   ├── config/          DB + app config (env.php loads Backend/.env — see §1)
│   ├── controllers/     Request handlers
│   ├── models/          PDO data access
│   ├── middleware/      JWT auth guard (require_auth/require_role/optional_auth)
│   ├── helpers/         JSON responses, JWT, permissions (RBAC), rate limiting
│   ├── lib/Payments/    Payment gateway abstraction (see §4b)
│   ├── routes/          API router
│   ├── database/        schema.sql + migrations/ (run in order — see §1)
│   └── uploads/         uploaded media (created automatically; .htaccess blocks script execution)
└── Frontend/            React + Vite + Tailwind
    └── src/
        ├── Components/  Public site components (Navbar, Footer, cards)
        ├── Pages/        Public site pages
        ├── Admin/        Admin CMS (separate layout, no public nav/footer)
        ├── context/      Auth context (JWT stored in localStorage)
        └── api/          Axios instance
```

## 4. What's implemented vs. scaffolded

**Fully wired:** authentication (register/login/JWT) with role-based permissions enforced
server-side, content CRUD (bible studies, videos, articles, devotions, news, gallery) with soft
delete, categories, products with soft delete, checkout/orders with a swappable payment gateway,
notifications, comments with a moderation queue, newsletter subscribe + confirm, file uploads
(extension + MIME-sniffed), bulk actions (publish/archive/delete), content duplication, admin
dashboard, media library.

**UI scaffolded, backend not yet wired (marked disabled in the UI):** AI Assistant generation
(needs an OpenAI API key + a small `/api/ai/*` controller — the button placeholders show exactly
where to plug it in), a real payment processor (Stripe/PayPal — see §4b, checkout works today via
the manual/pay-offline method), coupon **application in the storefront UI** (the backend already
validates and prices coupons — see `Order::create`), product reviews, wishlists, analytics charts,
calendar/scheduled posts, and a cart/checkout page in the Frontend (`OrderController`'s API is
ready; `Pages/Shop.jsx` doesn't call it yet).

### 4a. Roles & permissions (RBAC)

Every account has one of five roles — **User, Moderator, Editor, Admin, Super Admin** — from
`database/migrations/001_roles_permissions.sql`. "Visitor" from the original spec's role list is
simply an unauthenticated request; it isn't a row in `roles`. Each role grants a set of
permission slugs (`content.create`, `orders.manage`, `comments.moderate`, ...) via the
`role_permissions` table — see that migration's seed data for the full default matrix. Grant or
revoke a permission from a role by editing `role_permissions` directly (no code change, no
redeploy, takes effect on that role's very next request); a future admin screen can do the same
thing over `GET/POST` on `roles`/`permissions` (the `Role` model already has the read-side methods
it would need — `allWithPermissions()`, `allPermissions()`). Controllers call
`require_permission('the.permission')` (see `helpers/permissions.php`) instead of hard-coding role
name checks. Super Admin always passes every check regardless of `role_permissions` content.

### 4b. Payments

`Backend/lib/Payments/` defines a `PaymentGatewayInterface` so `OrderController`/`Order` never talk
to a specific processor's SDK directly (spec §26). The only implementation today is
`ManualPaymentGateway` — a real, working "pay offline" flow (bank transfer, cash/EFT, mobile money
screenshot) where the order is placed as `pending` and an admin confirms it via
`POST /api/orders/{id}/status`. To add Stripe/PayPal later: implement the interface, add a `case`
to `PaymentGatewayFactory::resolve()`, and add the new method's slug to `availableMethods()` — no
change needed anywhere else (routes, `Order` model, schema).

## 5. Fixes applied in this pass

The scaffold had bugs that would have stopped it from actually running, and one that made a whole
feature silently impossible to use. All are fixed now:

- **Fatal error on every public page** — `optional_auth()` was accidentally declared *inside* `require_role()`
  in `middleware/auth.php`, so PHP hadn't defined it yet the first time a public page (any content page, via
  `CommentController::index`) needed it. Moved it back out to its own top-level function.
- **Every content listing failed** — `Content::all()` had a missing comma in its `SELECT`, which is a SQL
  syntax error. This broke the home page, `/content`, Bible Studies, Devotions, News, and Gallery — i.e. almost
  the whole public site. Fixed.
- **Comment "like" button silently failed** — the router matched `POST /comments/{id}/like` to the generic
  "create a comment" handler before it ever reached the like handler. Reordered the routes so likes resolve
  correctly.
- **Comments table didn't match the code** — `schema.sql` defined a generic polymorphic `comments` table, but
  the models expected `content_id`/`parent_id` columns and a `comment_likes` table that didn't exist at all.
  Rewrote the schema to match what `Comment.php`/`CommentController.php` actually use, and changed new
  comments to default to `approved` (there's no moderation-approval UI in this build, so `pending` meant new
  comments would never appear).
- **Admin "Manage Content" couldn't see drafts** — the content list endpoint never read a `status` filter, so
  admins only ever saw published items. It now honors `status` (including `all`) for any signed-in account
  that can create/edit/publish content; public requests are unaffected and still only ever see published content.
- **Seed admin password was unusable** — the hash baked into `schema.sql` wasn't a real bcrypt hash. Replaced
  it with a harmless placeholder plus a small `Backend/database/seed_admin.php` bootstrap script (§1 step 5)
  that hashes a real password correctly.
- **Newsletter signup was completely broken** — `models/Subscriber.php` and `newsletter_confirm.php` were
  already fully wired to a `newsletter_subscribers`/`subscribers` table that never existed anywhere in
  `schema.sql`. Every `POST /api/newsletter/subscribe` threw a fatal SQL error. Added
  `migrations/003_newsletter_subscribers.sql` and pointed the model at the new table.
- **A live Gmail App Password and JWT signing secret were committed in plaintext** in `config/config.php`.
  Rotate that Gmail App Password immediately if this repository was ever pushed anywhere with the old value
  — treat it as compromised. Secrets now load from `Backend/.env` (git-ignored; see §1) instead of being
  hardcoded in a tracked file.
- **SQL string literals used double quotes** (`status = "approved"`) in `Comment.php`, `Testimonial.php`,
  and `Subscriber.php` — MySQL accepts that under its default `sql_mode`, but it's invalid ANSI SQL and
  breaks under `ANSI_QUOTES` or on another engine. Switched to single-quoted literals throughout.
- **Uploaded files were only checked by extension** — added a `finfo`-based real MIME-type check
  (`UploadController::contentMatchesExtension`) so a script renamed to `.jpg` is rejected, plus an
  `uploads/.htaccess` that refuses to execute any script in that directory as defense in depth.
- **No brute-force/abuse protection** on login, registration, or newsletter signup. Added a dependency-free
  file-based rate limiter (`helpers/rate_limit.php`) — see that file's docblock for the design.
- **Hard deletes everywhere** — an accidental "Delete" on content or a product was unrecoverable. Both now
  soft-delete (`deleted_at`) via `migrations/002_soft_deletes_and_indexes.sql`; a future admin "Trash" view
  can restore or permanently purge.
- Removed a stray empty directory and an empty junk file (`Backend/Open it and paste`) left over from the
  scaffold, cleaned up a duplicate route block/`require`, and fixed a couple of CSS class typos and an admin
  form UX gap (see Frontend notes below).

**How this pass was verified:** every touched/added PHP file passes `php -l`; the full `routes/api.php`
require-chain (every controller, every route) loads without a fatal error; and the RBAC, content
soft-delete, order/payment/stock/coupon, comment moderation, and newsletter-subscribe code paths were
each exercised against a real database with 30+ functional assertions (server-side pricing can't be
spoofed by the client, over-stock orders roll back cleanly and leave stock untouched, revoking a
permission from a role takes effect without re-issuing any token, etc.) before this pass was written up.

## 6. Next steps

- Wire `Pages/Shop.jsx` (Frontend) to a cart + `POST /api/orders` — the backend checkout flow is done
  and tested (§4b); only the storefront cart UI is missing.
- Wire the AI Assistant panel to the OpenAI API (or another provider) via a new `AIController.php`.
- Add a real payment gateway (Stripe/PayPal) alongside the manual one — see §4b for exactly where it plugs in.
- Consider swapping the hand-rolled JWT helper for `firebase/php-jwt` via Composer for production use.
- Build the admin screens the new backend capabilities are ready for: roles/permissions editor
  (`Role::allWithPermissions()`), comment moderation queue (`GET /api/comments/moderation`), order
  management (`GET /api/orders?all=1`, `POST /api/orders/{id}/status`), newsletter subscriber list
  (`GET /api/newsletter/subscribers`).
- The content library is still one generic `content` table with a `content_type` column rather than the
  fully separate Bible Study / Series-Episodes architecture the long-term spec describes (dedicated
  progress tracking, notes, quizzes, series/season/episode structure). That's a bigger, deliberate
  architectural project of its own — not attempted in this pass, which focused on hardening what already
  existed.

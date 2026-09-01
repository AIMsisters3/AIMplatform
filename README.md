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
   5. `Backend/database/migrations/004_bible_studies.sql` — Bible Study as its own entity: format,
      study guide, per-user progress, and private notes (see §4c below).
   6. `Backend/database/migrations/005_series_episodes.sql` — Series → Season → Episode structure.
   7. `Backend/database/migrations/006_bookmarks_watch_history.sql` — centralized bookmarks +
      per-item watch progress ("Continue Watching" / "Continue Studying").
   8. `Backend/database/migrations/007_section_media_language.sql` — splits `content_type` into
      independent `section` (where it appears), `media_type` (what kind of media it is), and a
      `transcript` column, plus a `languages` lookup table so Language is a real dropdown instead of
      free text (see §4d below).

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

**Fully wired, frontend included:** authentication (register/login/JWT) with role-based
permissions enforced server-side, content CRUD (videos, articles, devotions, news, gallery) with
soft delete, categories, products with soft delete, a full cart → checkout → order flow with a
swappable payment gateway, a "My Orders" page, notifications (bell with unread badge + mark
read/read-all), global search (content + products, with a results page), bookmarks ("My
Bookmarks"), comments with a moderation queue, newsletter subscribe + confirm, file uploads
(extension + MIME-sniffed), bulk actions (publish/archive/delete), content duplication, admin
dashboard, media library, **Bible Study as its own section** (format filter, "Continue Studying",
per-user progress, private notes, bookmarking — §4c), and **Series → Season → Episode** browsing
(§4c). Admin now also has dedicated screens for Orders, Comments Moderation, Newsletter
subscribers, Roles & Users, and Series/episode management.

**UI scaffolded, backend not yet wired (marked disabled in the UI):** AI Assistant generation
(needs an OpenAI API key + a small `/api/ai/*` controller — the button placeholders show exactly
where to plug it in), a real payment processor (Stripe/PayPal — see §4b, checkout works today via
the manual/pay-offline method), coupon **application in the storefront checkout UI** (the field is
there and the backend already validates/prices coupons via `Order::create` — it's just not shown
back to the shopper as a live discount preview before they submit), product reviews, wishlists
(distinct from bookmarks), and analytics charts.

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

### 4c. Bible Study & Series architecture

Both of these still live in the shared `content` table (title/slug/description/thumbnail/
media_url/language/status/comments/soft-delete all keep working exactly as they do for every
other content type) — nothing is duplicated. Each adds a thin, purpose-built layer on top:

- **Bible Study** (`content_type = 'bible_study'`) gets a 1:1 `bible_studies` row (format —
  Short Film / Video / Sermon / Panel / Audio / Animated / Documentary / PDF-Notes — plus an
  optional study guide URL), a `bible_study_progress` row per user per study (status/percent/last
  position — powers "Continue Studying"), and private `bible_study_notes` (only the author can
  ever read their own notes — there is no admin or "public notes" read path for this table at
  all). Creating or editing a Bible Study through the normal `POST/PUT /api/content` endpoint
  automatically keeps the `bible_studies` extension row in sync — see
  `ContentController::store()`/`update()`.
- **Series → Season → Episode**: a `series` table (its own title/slug/description/cover/status/
  soft-delete), and three nullable columns added directly to `content` — `series_id`,
  `season_number`, `episode_number`. An episode is a completely ordinary `content` row (usually
  `content_type = 'video'`); it reuses the same player, comments, bookmarks, and watch-history
  machinery every other video already has. Attach an existing content item to a series from
  **Admin → Manage Series**.
- **Bookmarks & Watch History** are both centralized (`bookmarks`, `watch_history`) rather than
  per-content-type, so "save for later" and "% watched" work identically across every content
  type, including Bible Studies and Series episodes.

### 4d. Section / Media Type / Category / Language are four separate fields

These four are independent concepts and are never conflated in the admin form or the data model:

- **Section** (`content.section`) — WHERE the item appears on the website: `media_library`
  (Content / Media Library), `news`, `gallery`, `bible_study`, or `devotions`.
- **Media Type** (`content.media_type`) — WHAT KIND of media it is (Video, Movie, Short Film,
  Cartoon, Animation, Sermon, Panel, Interview, Documentary, Audio, Music, Podcast, PDF, Image,
  Article, News Article, Devotional, Photo Gallery, or — for Bible Study specifically — its study
  format). The set of valid Media Types depends on the selected Section (e.g. Gallery only offers
  "Photo Gallery"); `ContentController::SECTION_MEDIA_TYPES` is the server-side source of truth
  and re-validates the pairing on every create/update, so the admin can never save a nonsensical
  combination even if the frontend were bypassed.
- **Category** (`content.category_id`) — the ministry/topic area (Prophecy, Youth Ministry, Health
  Reform, ...), completely independent of Section: the same category can be attached to items in
  different Sections (a Prophecy short film in the Media Library and a separate Prophecy Bible
  Study are both just "Prophecy", in different Sections).
- **Language** (`content.language`) — a controlled dropdown backed by the new `languages` lookup
  table (`code`, `name`), not free text. Seeded with `en` (English) and `ng` (Oshiwambo); adding a
  language later (Afrikaans, Portuguese, ...) is a single `INSERT INTO languages` — no schema
  change, no redeploy beyond the admin form re-fetching `GET /api/languages`. Gallery items don't
  have a language at all (the field is hidden and sent as `null` — "Not applicable" per spec).

The admin's **Upload Content** form (`Frontend/src/Admin/Pages/UploadContent.jsx`) only ever asks
for Section and Media Type — never the legacy `content_type` directly. `content_type` still exists
and keeps its original 6-value enum, because every public route/alias (`/news`, `/devotions`,
`/gallery`, `/videos`, `/articles`), `Content::all()`'s `type` filter, and the Bible Study
extension-table sync all key off it; `ContentController::deriveContentType()` derives it
automatically from (Section, Media Type) on every save so those existing consumers keep working
unchanged while Section/Media Type are the source of truth going forward.

**Body vs. Description vs. Transcript** — the form only shows the Body field for Media Types whose
primary content *is* substantial written text: Article, News Article, and Devotional
(`ContentController::BODY_REQUIRED_MEDIA_TYPES`). Every other Media Type (Video, Movie, Sermon,
Audio, Podcast, Photo Gallery, ...) is media-first: Body is hidden, and the server nulls out any
stray `body` value sent for it (e.g. leftover from switching Media Type mid-edit), so it can never
end up half-populated behind a hidden field. Those items instead get an optional
**Transcript / Notes** field (`content.transcript`) — for a written transcript or study notes,
distinct from the short-summary **Description** field, which stays available for every content
type as the text used on cards, search results, and previews.

### 4e. Large media uploads (e.g. a full-length ~2 hour video)

An upload can be rejected at three independent layers, and all three have to allow it or the
smallest one wins silently:

1. **PHP's own `upload_max_filesize`/`post_max_size`** — stock PHP defaults (2M/8M) reject
   anything over a few MB before the application ever sees the request. `Backend/.user.ini` sets
   these to 8192M/8200M (honored by mod_php and CGI/FastCGI); `Backend/.htaccess` carries a
   redundant `<IfModule mod_php.c>`-guarded copy of the same values as a safety net (a no-op,
   not a 500, if this server runs PHP via CGI/FastCGI instead of mod_php). XAMPP on Windows uses
   mod_php by default, so both apply. Apache/PHP-FPM re-read `.user.ini` periodically
   (`user_ini.cache_ttl`, default 300s) rather than instantly — restart Apache after editing it if
   a change doesn't seem to take effect. If neither takes effect on your setup, edit your real
   `php.ini` directly (same two directives) and restart Apache — that always works.
2. **The application's own `MAX_UPLOAD_SIZE_MB`** (`Backend/config/config.php`, default 8000 =
   ~8GB) — `UploadController` checks this after PHP's own limits, and now reports which of the two
   layers actually blocked an oversized file (previously both just produced the same generic "No
   file uploaded or upload error occurred." error, which didn't help anyone tell them apart).
   Override it via `MAX_UPLOAD_SIZE_MB` in `Backend/.env`.
3. **The frontend's size hint/early check** — `GET /api/upload/limits` (new) now exposes the real
   server-configured ceiling and allowed extensions, and `UploadContent.jsx` fetches it instead of
   hardcoding a number, so the dropzone hint text and the friendly early size check can never drift
   out of sync with what the server will actually accept.

Not covered by any of the above: Apache's own `Timeout` directive (`httpd.conf`, default 300s) can
still drop a very slow upload before PHP sees it. Not usually a problem testing locally over
loopback, but worth knowing if this is ever deployed somewhere with a slow real network path to the
server — raise `Timeout` there too if large uploads start failing partway through on a slow
connection.

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

### 5a. Fixes applied while building Bible Study / Series / cart+checkout / admin screens

- **A partial content update could silently wipe a Bible Study's study guide URL** —
  `ContentController::update()` fell back to `$existing['study_guide_url']` when only `format` was
  sent, but `$existing` comes from `Content::find()`, which never has that column (it lives on the
  `bible_studies` extension row). Sending `{format: "sermon"}` alone nulled out an already-saved
  study guide URL. Fixed to read the current extension row (`BibleStudy::findByContentId()`) as the
  fallback instead. Caught by an end-to-end test that created a study with a guide URL, sent a
  format-only update, and checked the guide URL survived.
- **`GET /api/comments/moderation` with no `?status=` threw a PHP warning** (`Undefined array key
  "status"`) — the ternary's true-branch re-read `$_GET['status']` directly instead of the
  already-defaulted value it had just checked with `in_array()`. Harmless when a status was passed,
  but broke the moderation queue's default view (exactly what **Admin → Comments** loads first).
  Fixed in `CommentController::moderationQueue()`.
- Both of the above were found by running the real HTTP router end-to-end (`php -S` + `curl`)
  against every new/changed route — including auth-gated ones with a real signed JWT, and
  ownership checks (a non-owner correctly gets 403 deleting someone else's private Bible Study
  note) — rather than only unit-testing the model layer.

## 6. Next steps

- Wire the AI Assistant panel to the OpenAI API (or another provider) via a new `AIController.php`.
- Add a real payment gateway (Stripe/PayPal) alongside the manual one — see §4b for exactly where it plugs in.
- Consider swapping the hand-rolled JWT helper for `firebase/php-jwt` via Composer for production use.
- Show the coupon discount as a live preview in the checkout UI before the shopper submits (the
  backend already computes and applies it correctly — see §4).
- Product reviews and a wishlist system distinct from bookmarks (spec calls out both separately).
- Analytics/reporting charts for the admin dashboard.
- Quizzes / knowledge checks at the end of a Bible Study (the `bible_studies`/`bible_study_progress`
  tables have room to grow into this; not attempted in this pass).
- A proper Album → Images structure for Gallery (spec §9): today a Gallery item is still one
  `content` row with a single thumbnail, same as every other content type. A real multi-image
  album needs its own `gallery_images` extension table (content_id, image_url, caption,
  sort_order), a small controller for uploading/reordering/removing images within an album, and a
  `Gallery.jsx` rewrite to render a photo grid instead of one image per item — following the same
  "content row + extension table" pattern §4c already established for Bible Study. Deliberately not
  attempted in this pass, which focused on separating Section/Media Type/Category/Language and
  making the admin form's Body/Transcript fields dynamic (§4d).

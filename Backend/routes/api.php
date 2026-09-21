<?php
/**
 * AIMsisters - REST API router
 * Simple path-based router matched against $method and $path.
 */

require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/ContentController.php';
require_once __DIR__ . '/../controllers/CommentController.php';
require_once __DIR__ . '/../controllers/ProductController.php';
require_once __DIR__ . '/../controllers/CategoryController.php';
require_once __DIR__ . '/../controllers/UploadController.php';
require_once __DIR__ . '/../controllers/ChunkUploadController.php';
require_once __DIR__ . '/../controllers/NewsletterController.php';
require_once __DIR__ . '/../controllers/TestimonialController.php';
require_once __DIR__ . '/../controllers/OrderController.php';
require_once __DIR__ . '/../controllers/NotificationController.php';
require_once __DIR__ . '/../controllers/BibleStudyController.php';
require_once __DIR__ . '/../controllers/NoteController.php';
require_once __DIR__ . '/../controllers/SeriesController.php';
require_once __DIR__ . '/../controllers/BookmarkController.php';
require_once __DIR__ . '/../controllers/WatchHistoryController.php';
require_once __DIR__ . '/../controllers/SearchController.php';
require_once __DIR__ . '/../controllers/UserController.php';
require_once __DIR__ . '/../controllers/LanguageController.php';
require_once __DIR__ . '/../controllers/DashboardController.php';
require_once __DIR__ . '/../controllers/DeliveryAreaController.php';
require_once __DIR__ . '/../controllers/CronController.php';
require_once __DIR__ . '/../controllers/PaymentController.php';
require_once __DIR__ . '/../controllers/SettingController.php';
require_once __DIR__ . '/../controllers/RefundController.php';
require_once __DIR__ . '/../controllers/ReviewController.php';
require_once __DIR__ . '/../controllers/WishlistController.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/permissions.php';


function route(string $method, string $path)
{
    // Remove any accidental extra leading slashes
    $path = '/' . ltrim($path, '/');

    $segments = array_values(array_filter(explode('/', trim($path, '/'))));

    // Expect: api/{resource}/{id?}/{action?}/{subId?}
    array_shift($segments); // drop leading "api"

    $resource = $segments[0] ?? '';
    $id       = $segments[1] ?? null;
    $action   = $segments[2] ?? null;
    // 4th segment — only a couple of nested sub-resources need it (e.g.
    // /products/{id}/images/{imageId}); every other resource below simply
    // never reads it.
    $subId    = $segments[3] ?? null;

    // ---------- AUTH ----------
    if ($resource === 'auth') {
        $auth = new AuthController();
        if ($id === 'register' && $method === 'POST') return $auth->register();
        if ($id === 'login' && $method === 'POST') return $auth->login();
        if ($id === 'me' && $method === 'GET') return $auth->me();
        json_error('Auth route not found.', 404);
    }

    // ---------- CONTENT ----------
    if ($resource === 'content') {
        $ctrl = new ContentController();

        if ($id === 'bulk' && $method === 'POST') return $ctrl->bulk();
        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id === null && $method === 'POST') return $ctrl->store();
        if ($id !== null && $action === 'duplicate' && $method === 'POST') return $ctrl->duplicate((int) $id);
        // Every content item's own comments live at this same path (GET to
        // read, POST to create) — checked before the generic show()/update()/
        // destroy() rules below, which only apply when there's no action
        // segment at all (a bare /content/{id}).
        if ($id !== null && $action === 'comments' && $method === 'GET') return (new CommentController())->index((int) $id);
        if ($id !== null && $action === 'comments' && $method === 'POST') return (new CommentController())->store((int) $id);
        if ($id !== null && $action === null && $method === 'GET') return $ctrl->show($id);
        if ($id !== null && $action === null && $method === 'PUT') return $ctrl->update((int) $id);
        if ($id !== null && $action === null && $method === 'DELETE') return $ctrl->destroy((int) $id);
        json_error('Content route not found.', 404);
    }

    // ---------- COMMENTS ----------
    // (moderation/like/status are checked first since they share the /comments/{id}/... shape)
    if ($resource === 'comments') {
        $ctrl = new CommentController();

        if ($id === 'moderation' && $method === 'GET') return $ctrl->moderationQueue();
        if ($id !== null && $action === 'like' && $method === 'POST') return $ctrl->like((int) $id);
        if ($id !== null && $action === 'status' && $method === 'POST') return $ctrl->updateStatus((int) $id);
        if ($id !== null && $action === null && $method === 'GET') return $ctrl->index((int) $id);
        if ($id !== null && $action === null && $method === 'DELETE') return $ctrl->destroy((int) $id);

        json_error('Comment route not found.', 404);
    }

    // ---------- PRODUCTS ----------
    if ($resource === 'products') {
        $ctrl = new ProductController();

        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id === null && $method === 'POST') return $ctrl->store();

        if ($id !== null && $action === 'images' && $subId === 'reorder' && $method === 'POST') return $ctrl->reorderImages((int) $id);
        if ($id !== null && $action === 'images' && $subId !== null && $method === 'DELETE') return $ctrl->deleteImage((int) $id, (int) $subId);
        if ($id !== null && $action === 'images' && $subId === null && $method === 'POST') return $ctrl->addImage((int) $id);

        if ($id !== null && $action === 'variants' && $subId !== null && $method === 'PUT') return $ctrl->updateVariant((int) $id, (int) $subId);
        if ($id !== null && $action === 'variants' && $subId !== null && $method === 'DELETE') return $ctrl->deleteVariant((int) $id, (int) $subId);
        if ($id !== null && $action === 'variants' && $subId === null && $method === 'POST') return $ctrl->addVariant((int) $id);

        if ($id !== null && $action === 'stock' && $method === 'POST') return $ctrl->adjustStock((int) $id);
        if ($id !== null && $action === 'stock-movements' && $method === 'GET') return $ctrl->stockMovements((int) $id);

        if ($id !== null && $action === 'reviews' && $subId === 'eligibility' && $method === 'GET') return (new ReviewController())->eligibility((int) $id);
        if ($id !== null && $action === 'reviews' && $method === 'GET') return (new ReviewController())->forProduct((int) $id);
        if ($id !== null && $action === 'reviews' && $method === 'POST') return (new ReviewController())->store((int) $id);

        if ($id !== null && $action === null && $method === 'GET') return $ctrl->show($id);
        if ($id !== null && $action === null && $method === 'PUT') return $ctrl->update((int) $id);
        if ($id !== null && $action === null && $method === 'DELETE') return $ctrl->destroy((int) $id);

        json_error('Product route not found.', 404);
    }

    // ---------- CATEGORIES ----------
    if ($resource === 'categories') {
        $ctrl = new CategoryController();

        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id === null && $method === 'POST') return $ctrl->store();
        if ($id !== null && $method === 'DELETE') return $ctrl->destroy((int) $id);

        json_error('Category route not found.', 404);
    }

    // ------
    // ---- UPLOAD ----------
    // Small/single files (thumbnails, Media Library) use the plain
    // single-shot endpoint. Large media (video/audio/PDF from the Upload
    // Content page) uses the chunked endpoints below instead, so a single
    // HTTP request never has to carry more than one small chunk.
    if ($resource === 'upload') {
        $ctrl = new UploadController();
        if ($id === 'limits' && $method === 'GET') return $ctrl->limits();
        if ($id === 'chunk' && $method === 'POST') return (new ChunkUploadController())->receiveChunk();
        if ($id === 'chunk' && $method === 'GET') return (new ChunkUploadController())->status();
        if ($id === 'chunk' && $method === 'DELETE') return (new ChunkUploadController())->cancel();
        if ($id === 'finalize' && $method === 'POST') return (new ChunkUploadController())->finalize();
        if ($method === 'POST') return $ctrl->store();
        json_error('Upload route not found.', 404);
    }
    
    //-----------NEWSLETTER----------
    if ($resource === 'newsletter') {
        $ctrl = new NewsletterController();
        if ($id === 'subscribe' && $method === 'POST') return $ctrl->subscribe();
        if ($id === 'subscribers' && $method === 'GET') return $ctrl->adminList();
        if ($id !== null && ctype_digit($id) && $action === 'deactivate' && $method === 'POST') return $ctrl->adminDeactivate((int) $id);
        json_error('Newsletter route not found.', 404);
    }
 
        // ---------- TESTIMONIALS ----------
    if ($resource === 'testimonials') {
        $ctrl = new TestimonialController();

        if ($id === 'admin' && $method === 'GET') return $ctrl->adminIndex();
        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id === null && $method === 'POST') return $ctrl->store();
        if ($id !== null && $action === 'approve' && $method === 'POST') return $ctrl->approve((int) $id);
        if ($id !== null && $action === 'reject' && $method === 'POST') return $ctrl->reject((int) $id);
        if ($id !== null && $action === null && $method === 'DELETE') return $ctrl->destroy((int) $id);

        json_error('Testimonial route not found.', 404);
    }
    
    // ---------- ORDERS ----------
    if ($resource === 'orders') {
        $ctrl = new OrderController();

        if ($id === 'payment-methods' && $method === 'GET') return $ctrl->paymentMethods();
        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id === null && $method === 'POST') return $ctrl->store();
        if ($id !== null && $action === 'status' && $method === 'POST') return $ctrl->updateStatus((int) $id);
        if ($id !== null && $action === 'cancel' && $method === 'POST') return $ctrl->cancel((int) $id);
        if ($id !== null && $action === 'pay-later' && $subId === 'approve' && $method === 'POST') return $ctrl->approvePayLater((int) $id);
        if ($id !== null && $action === 'pay-later' && $subId === 'decline' && $method === 'POST') return $ctrl->declinePayLater((int) $id);
        if ($id !== null && $action === 'deposit' && $method === 'POST') return $ctrl->setDeposit((int) $id);
        if ($id !== null && $action === 'item-procurement' && $subId !== null && $method === 'POST') return $ctrl->updateItemProcurement((int) $id, (int) $subId);
        if ($id !== null && $action === 'payments' && $method === 'POST') return (new PaymentController())->submit((int) $id);
        if ($id !== null && $action === 'payments' && $method === 'GET') return (new PaymentController())->forOrder((int) $id);
        if ($id !== null && $action === 'refunds' && $method === 'POST') return (new RefundController())->request((int) $id);
        if ($id !== null && $action === 'refunds' && $method === 'GET') return (new RefundController())->forOrder((int) $id);
        if ($id !== null && $action === null && $method === 'GET') return $ctrl->show((int) $id);

        json_error('Order route not found.', 404);
    }

    // ---------- REVIEWS (moderation) ----------
    if ($resource === 'reviews') {
        $ctrl = new ReviewController();

        if ($id === 'moderation' && $method === 'GET') return $ctrl->moderationQueue();
        if ($id !== null && $action === 'status' && $method === 'POST') return $ctrl->updateStatus((int) $id);
        if ($id !== null && $action === 'respond' && $method === 'POST') return $ctrl->respond((int) $id);
        if ($id !== null && $action === null && $method === 'DELETE') return $ctrl->destroy((int) $id);

        json_error('Review route not found.', 404);
    }

    // ---------- REFUNDS ----------
    if ($resource === 'refunds') {
        $ctrl = new RefundController();

        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id !== null && $action === 'decide' && $method === 'POST') return $ctrl->decide((int) $id);
        if ($id !== null && $action === 'process' && $method === 'POST') return $ctrl->process((int) $id);

        json_error('Refund route not found.', 404);
    }

    // ---------- PAYMENTS (verification queue) ----------
    if ($resource === 'payments') {
        $ctrl = new PaymentController();

        if ($id === 'queue' && $method === 'GET') return $ctrl->queue();
        if ($id !== null && $action === 'verify' && $method === 'POST') return $ctrl->verify((int) $id);
        if ($id !== null && $action === 'reject' && $method === 'POST') return $ctrl->reject((int) $id);
        if ($id !== null && $action === 'proof' && $method === 'GET') return $ctrl->downloadProof((int) $id);

        json_error('Payment route not found.', 404);
    }

    // ---------- NOTIFICATIONS ----------
    if ($resource === 'notifications') {
        $ctrl = new NotificationController();

        if ($id === 'read-all' && $method === 'POST') return $ctrl->markAllRead();
        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id !== null && $action === 'read' && $method === 'POST') return $ctrl->markRead((int) $id);

        json_error('Notification route not found.', 404);
    }

    // ---------- DASHBOARD ----------
    if ($resource === 'dashboard') {
        $ctrl = new DashboardController();

        if ($id === 'summary' && $method === 'GET') return $ctrl->summary();

        json_error('Dashboard route not found.', 404);
    }

    // ---------- BIBLE STUDIES ----------
    // (its own dedicated controller — spec §7 — not a generic content alias,
    // since it needs the format filter and per-user progress/notes)
    if ($resource === 'bible-studies') {
        $ctrl = new BibleStudyController();

        if ($id === 'continue' && $method === 'GET') return $ctrl->continueStudying();
        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id !== null && $action === 'progress' && $method === 'GET') return $ctrl->getProgress((int) $id);
        if ($id !== null && $action === 'progress' && $method === 'POST') return $ctrl->updateProgress((int) $id);
        if ($id !== null && $action === 'notes' && $method === 'GET') return $ctrl->listNotes((int) $id);
        if ($id !== null && $action === 'notes' && $method === 'POST') return $ctrl->createNote((int) $id);
        if ($id !== null && $action === null && $method === 'GET') return $ctrl->show($id);

        json_error('Bible study route not found.', 404);
    }

    // ---------- NOTES (single-note edit/delete, owner-only) ----------
    if ($resource === 'notes') {
        $ctrl = new NoteController();

        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id !== null && $action === null && $method === 'GET') return $ctrl->show((int) $id);
        if ($id !== null && $method === 'PUT') return $ctrl->update((int) $id);
        if ($id !== null && $method === 'DELETE') return $ctrl->destroy((int) $id);

        json_error('Note route not found.', 404);
    }

    // ---------- SERIES & EPISODES ----------
    if ($resource === 'series') {
        $ctrl = new SeriesController();

        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id === null && $method === 'POST') return $ctrl->store();
        if ($id !== null && $action === 'episodes' && $subId === null && $method === 'POST') return $ctrl->attachEpisode((int) $id);
        if ($id !== null && $action === 'episodes' && $subId !== null && $method === 'DELETE') return $ctrl->detachEpisode((int) $id, (int) $subId);
        if ($id !== null && $action === null && $method === 'GET') return $ctrl->show($id);
        if ($id !== null && $action === null && $method === 'PUT') return $ctrl->update((int) $id);
        if ($id !== null && $action === null && $method === 'DELETE') return $ctrl->destroy((int) $id);

        json_error('Series route not found.', 404);
    }

    // ---------- BOOKMARKS ----------
    if ($resource === 'bookmarks') {
        $ctrl = new BookmarkController();

        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id !== null && $method === 'POST') return $ctrl->toggle((int) $id);

        json_error('Bookmark route not found.', 404);
    }

    // ---------- WATCH HISTORY ----------
    if ($resource === 'watch-history') {
        $ctrl = new WatchHistoryController();

        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id !== null && $method === 'POST') return $ctrl->record((int) $id);

        json_error('Watch history route not found.', 404);
    }

    // ---------- SEARCH ----------
    if ($resource === 'search') {
        if ($method === 'GET') return (new SearchController())->index();
        json_error('Search route not found.', 404);
    }

    // ---------- USERS (admin "Manage Roles" screen) ----------
    if ($resource === 'users') {
        $ctrl = new UserController();

        if ($id === 'roles' && $method === 'GET') return $ctrl->roles();
        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id !== null && $action === 'role' && $method === 'POST') return $ctrl->updateRole((int) $id);
        if ($id !== null && $action === 'status' && $method === 'POST') return $ctrl->updateStatus((int) $id);

        json_error('User route not found.', 404);
    }

    // ---------- WISHLIST (Shop products — distinct from /bookmarks, which is for ministry content) ----------
    if ($resource === 'wishlist') {
        $ctrl = new WishlistController();

        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id !== null && $method === 'POST') return $ctrl->toggle((int) $id);

        json_error('Wishlist route not found.', 404);
    }

    // ---------- SETTINGS ----------
    if ($resource === 'settings') {
        $ctrl = new SettingController();

        if ($id === 'shop' && $method === 'GET') return $ctrl->shop();
        if ($id === 'shop' && $method === 'PUT') return $ctrl->updateShop();

        json_error('Settings route not found.', 404);
    }

    // ---------- CRON (shared-secret auth, not a user session — see CronController) ----------
    if ($resource === 'cron') {
        if ($id === 'run-due-tasks' && $method === 'POST') return (new CronController())->runDueTasks();
        json_error('Cron route not found.', 404);
    }

    // ---------- DELIVERY AREAS ----------
    if ($resource === 'delivery-areas') {
        $ctrl = new DeliveryAreaController();

        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id === null && $method === 'POST') return $ctrl->store();
        if ($id !== null && $method === 'PUT') return $ctrl->update((int) $id);
        if ($id !== null && $method === 'DELETE') return $ctrl->destroy((int) $id);

        json_error('Delivery area route not found.', 404);
    }

    // ---------- LANGUAGES ----------
    if ($resource === 'languages') {
        if ($method === 'GET') return (new LanguageController())->index();
        json_error('Language route not found.', 404);
    }

    // ---------- KIDS (alias into ContentController, filtered by section) ----------
    // Its own dedicated, safe area (spec: "not just another category") -
    // reuses the generic content model/table exactly like every other
    // section rather than a parallel Kids-specific backend.
    if ($resource === 'kids' && $method === 'GET') {
        $_GET['section'] = 'kids';
        return (new ContentController())->index();
    }

    // ---------- SONGS (alias into ContentController, filtered by section) ----------
    // Same pattern as Kids above - a dedicated destination, still backed by
    // the shared content table rather than a parallel model.
    if ($resource === 'songs' && $method === 'GET') {
        $_GET['section'] = 'songs';
        return (new ContentController())->index();
    }

     // ---------- Convenience aliases matching the spec ----------
    // GET /api/news, /api/devotions -> content filtered by type
    // (bible-studies has its own dedicated controller/routes above)
    $typeAliases = ['news' => 'news', 'devotions' => 'devotion', 'videos' => 'video', 'articles' => 'article', 'gallery' => 'gallery'];
    if (array_key_exists($resource, $typeAliases) && $method === 'GET') {
        $_GET['type'] = $typeAliases[$resource];
        return (new ContentController())->index();
    }

    json_error('Route not found: ' . $method . ' ' . $path, 404);
}

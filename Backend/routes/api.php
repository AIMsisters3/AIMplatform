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
require_once __DIR__ . '/../controllers/NewsletterController.php';
require_once __DIR__ . '/../controllers/TestimonialController.php';
require_once __DIR__ . '/../controllers/OrderController.php';
require_once __DIR__ . '/../controllers/NotificationController.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/permissions.php';


function route(string $method, string $path)
{
    // Remove any accidental extra leading slashes
    $path = '/' . ltrim($path, '/');

    $segments = array_values(array_filter(explode('/', trim($path, '/'))));

    // Expect: api/{resource}/{id?}/{action?}
    array_shift($segments); // drop leading "api"

    $resource = $segments[0] ?? '';
    $id       = $segments[1] ?? null;
    $action   = $segments[2] ?? null;

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
        if ($id !== null && $method === 'GET') return $ctrl->show($id);
        if ($id !== null && $method === 'PUT') return $ctrl->update((int) $id);
        if ($id !== null && $method === 'DELETE') return $ctrl->destroy((int) $id);
        if ($id !== null && $action === 'comments' && $method === 'POST') return (new CommentController())->store((int) $id);
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
        if ($id !== null && $method === 'GET') return $ctrl->show((int) $id);
        if ($id !== null && $method === 'PUT') return $ctrl->update((int) $id);
        if ($id !== null && $method === 'DELETE') return $ctrl->destroy((int) $id);

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
    if ($resource === 'upload') {
        $ctrl = new UploadController();
        if ($method === 'POST') return $ctrl->store();
        json_error('Upload route not found.', 404);
    }
    
    //-----------NEWSLETTER----------
    if ($resource === 'newsletter') {
        $ctrl = new NewsletterController();
        if ($id === 'subscribe' && $method === 'POST') return $ctrl->subscribe();
        if ($id === 'subscribers' && $method === 'GET') return $ctrl->adminList();
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
        if ($id !== null && $action === null && $method === 'GET') return $ctrl->show((int) $id);

        json_error('Order route not found.', 404);
    }

    // ---------- NOTIFICATIONS ----------
    if ($resource === 'notifications') {
        $ctrl = new NotificationController();

        if ($id === 'read-all' && $method === 'POST') return $ctrl->markAllRead();
        if ($id === null && $method === 'GET') return $ctrl->index();
        if ($id !== null && $action === 'read' && $method === 'POST') return $ctrl->markRead((int) $id);

        json_error('Notification route not found.', 404);
    }

     // ---------- Convenience aliases matching the spec ----------
    // GET /api/news, /api/devotions, /api/bible-studies -> content filtered by type
    $typeAliases = ['news' => 'news', 'devotions' => 'devotion', 'videos' => 'video', 'articles' => 'article', 'gallery' => 'gallery', 'bible-studies' => 'bible_study'];
    if (array_key_exists($resource, $typeAliases) && $method === 'GET') {
        $_GET['type'] = $typeAliases[$resource];
        return (new ContentController())->index();
    }

    json_error('Route not found: ' . $method . ' ' . $path, 404);
}

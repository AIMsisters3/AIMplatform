<?php

require_once __DIR__ . '/../models/Series.php';
require_once __DIR__ . '/../models/Content.php';
require_once __DIR__ . '/../models/BibleStudy.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../helpers/publish_notify.php';
require_once __DIR__ . '/../middleware/auth.php';

class SeriesController
{
    private Series $model;

    public function __construct()
    {
        $this->model = new Series();
    }

    /** GET /api/series?category_id=&search=&status=&section= */
    public function index(): void
    {
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 12));
        $filters = [
            'category_id' => $_GET['category_id'] ?? null,
            'search'      => $_GET['search'] ?? null,
            // e.g. ?section=bible_study - lets Bible Studies surface only
            // series flagged as belonging there, while the main Series
            // page (no filter) keeps showing every series as before.
            'section'     => $_GET['section'] ?? null,
            // ?sort=order_index - used by Explore Bible Topics/Prophecy,
            // which show in an admin-chosen order rather than "most
            // recently active series first" (the generic /series page's
            // default, unchanged).
            'sort'        => $_GET['sort'] ?? null,
        ];

        if (!empty($_GET['status'])) {
            $payload = optional_auth();
            if ($payload && user_has_permission($payload, 'content.create')) {
                $filters['status'] = $_GET['status'];
            }
        }

        json_ok(['items' => $this->model->all($filters, $limit, ($page - 1) * $limit)]);
    }

    /** GET /api/series/{slugOrId} — includes its episode list. */
    public function show(string $slugOrId): void
    {
        $series = ctype_digit($slugOrId) ? $this->model->find((int) $slugOrId) : $this->model->findBySlug($slugOrId);
        if (!$series) {
            json_error('Series not found.', 404);
        }
        json_ok(['item' => $series, 'episodes' => $this->model->episodes((int) $series['id'])]);
    }

    /** POST /api/series (requires content.create) */
    public function store(): void
    {
        require_permission('content.create');
        $body = get_json_body();

        if (empty($body['title'])) {
            json_error('Title is required.', 422);
        }
        $body['slug'] = $body['slug'] ?? (strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $body['title']), '-')) . '-' . substr(uniqid(), -5));

        $id = $this->model->create($body);
        json_created(['id' => $id], 'Series created.');
    }

    /** PUT /api/series/{id} (requires content.edit) */
    public function update(int $id): void
    {
        require_permission('content.edit');
        $series = $this->model->find($id);
        if (!$series) {
            json_error('Series not found.', 404);
        }
        // is_locked no longer blocks edits (redesign spec explicitly asks
        // for full Prophecy collection management - title/intro/cover/
        // references/order all editable). The column stays only as the
        // "this was one of the original seeded collections" marker; delete
        // protection below is independent of it.
        $this->model->update($id, get_json_body());
        json_ok(null, 'Series updated.');
    }

    /** DELETE /api/series/{id} (requires content.delete) */
    public function destroy(int $id): void
    {
        require_permission('content.delete');
        $series = $this->model->find($id);
        if (!$series) {
            json_error('Series not found.', 404);
        }
        $this->model->delete($id);
        json_ok(null, 'Series deleted.');
    }

    /** POST /api/series/{id}/episodes (requires content.edit) body: {content_id, season_number, episode_number} — assigns an existing content item as an episode of this series. */
    public function attachEpisode(int $seriesId): void
    {
        require_permission('content.edit');
        $body = get_json_body();
        $contentId = (int) ($body['content_id'] ?? 0);

        if (!$contentId || !$this->model->find($seriesId)) {
            json_error('A valid content_id and series are required.', 422);
        }

        $this->model->setEpisodePosition(
            $contentId,
            $seriesId,
            isset($body['season_number']) ? (int) $body['season_number'] : 1,
            isset($body['episode_number']) ? (int) $body['episode_number'] : 1
        );

        // Covers the "already published, then attached to a series" order
        // of operations — see maybe_notify_new_episode()'s docblock. Must
        // never break the attach itself if notifying fails.
        try {
            maybe_notify_new_episode(new Content(), $contentId);
        } catch (Throwable $e) {
            error_log('Episode notify failed for content ' . $contentId . ': ' . $e->getMessage());
        }

        json_ok(null, 'Episode attached to series.');
    }

    /** DELETE /api/series/{id}/episodes/{contentId} (requires content.edit) — detaches an episode without deleting the underlying content item. */
    public function detachEpisode(int $seriesId, int $contentId): void
    {
        require_permission('content.edit');
        if (!$this->model->find($seriesId)) {
            json_error('Series not found.', 404);
        }
        $this->model->setEpisodePosition($contentId, null, null, null);
        json_ok(null, 'Episode removed from series.');
    }

    /**
     * GET /api/series/{id}/chapters (requires content.edit) — every
     * chapter's content row(s) for the admin builder, drafts included.
     * A "chapter" (Prophecy/Explore Bible Topics spec) is up to two
     * content rows sharing one episode_number: one audio-format, one
     * pdf-format - the frontend groups this flat list by episode_number
     * itself, same way the public SeriesDetail.jsx already groups by
     * season_number.
     */
    public function chaptersAdmin(int $seriesId): void
    {
        require_permission('content.edit');
        if (!$this->model->find($seriesId)) {
            json_error('Series not found.', 404);
        }
        json_ok(['items' => $this->model->episodesAdmin($seriesId)]);
    }

    /**
     * PUT /api/series/{id}/chapters (requires content.edit) body:
     * {chapters: [{chapter_number, title, description, status,
     *   audio_content_id?, audio_url?, pdf_content_id?, pdf_url?}]}
     *
     * Saves the WHOLE chapter list in one request (same "whole set, one
     * form" pattern as ReadingPlan::saveDays()/Activity's question
     * builder) rather than one attach/detach call per file. For each
     * chapter, each of audio/pdf independently: an *_url present with no
     * matching *_content_id creates a new content row (format=audio/pdf)
     * and attaches it at that episode_number; present with a
     * *_content_id updates that row in place; a *_content_id with no
     * matching *_url (the admin removed that file) soft-deletes it. Any
     * existing chapter row whose episode_number isn't in the submitted
     * list at all (the admin deleted that whole chapter) is soft-deleted
     * too - so this is always the complete, authoritative chapter set
     * for the series after saving, never a partial merge.
     */
    public function saveChapters(int $seriesId): void
    {
        $payload = require_permission('content.edit');
        $series = $this->model->find($seriesId);
        if (!$series) {
            json_error('Series not found.', 404);
        }

        $body = get_json_body();
        $chapters = is_array($body['chapters'] ?? null) ? $body['chapters'] : [];

        $content = new Content();
        $bibleStudy = new BibleStudy();
        $db = Database::getConnection();

        $db->beginTransaction();
        try {
            $existing = $this->model->episodesAdmin($seriesId);
            $submittedNumbers = array_map(fn ($c) => (int) ($c['chapter_number'] ?? 0), $chapters);

            // Delete whole chapters no longer present at all.
            foreach ($existing as $row) {
                if (!in_array((int) $row['episode_number'], $submittedNumbers, true)) {
                    $content->delete((int) $row['id']);
                }
            }

            foreach ($chapters as $chapter) {
                $chapterNumber = (int) ($chapter['chapter_number'] ?? 0);
                if ($chapterNumber < 1) {
                    continue;
                }
                $status = in_array($chapter['status'] ?? null, ['draft', 'published'], true) ? $chapter['status'] : 'draft';
                $shared = [
                    'title'            => $chapter['title'] ?? ('Chapter ' . $chapterNumber),
                    'description'      => $chapter['description'] ?? null,
                    'bible_references' => $chapter['bible_references'] ?? null,
                    'status'           => $status,
                    'section'          => 'bible_study',
                    'author_id'        => $payload['sub'],
                ];

                $this->saveChapterFormat($content, $bibleStudy, $seriesId, $chapterNumber, $shared, 'audio', $chapter['audio_url'] ?? null, isset($chapter['audio_content_id']) ? (int) $chapter['audio_content_id'] : null);
                $this->saveChapterFormat($content, $bibleStudy, $seriesId, $chapterNumber, $shared, 'pdf', $chapter['pdf_url'] ?? null, isset($chapter['pdf_content_id']) ? (int) $chapter['pdf_content_id'] : null);
            }

            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            error_log('saveChapters failed for series ' . $seriesId . ': ' . $e->getMessage());
            json_error('Could not save chapters.', 500);
        }

        json_ok(null, 'Chapters saved.');
    }

    /** One format "slot" (audio or pdf) of one chapter - create, update, or remove, per saveChapters()'s own docblock. */
    private function saveChapterFormat(Content $content, BibleStudy $bibleStudy, int $seriesId, int $chapterNumber, array $shared, string $format, ?string $mediaUrl, ?int $contentId): void
    {
        if (empty($mediaUrl)) {
            if ($contentId) {
                $content->delete($contentId);
            }
            return;
        }

        $data = [...$shared, 'media_type' => $format, 'media_url' => $mediaUrl, 'content_type' => 'bible_study'];

        if ($contentId && $content->find($contentId)) {
            $content->update($contentId, $data);
            $id = $contentId;
        } else {
            // New row - needs a slug (create() has no fallback for it),
            // same slugify-plus-random-suffix pattern SeriesController::
            // store() already uses for series slugs.
            $data['slug'] = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $shared['title']), '-')) . '-' . substr(uniqid(), -5);
            $id = $content->create($data);
        }

        $bibleStudy->createExtension($id, $format, null);
        $this->model->setEpisodePosition($id, $seriesId, 1, $chapterNumber);
    }
}

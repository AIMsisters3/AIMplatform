<?php

require_once __DIR__ . '/../models/BibleStudy.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

/** Update/delete for a single bible_study_notes row — always owner-only, notes are private. */
class NoteController
{
    private BibleStudy $model;

    public function __construct()
    {
        $this->model = new BibleStudy();
    }

    /** GET /api/notes (owner only) — every note belonging to the signed-in user, across every study. Backs the "My Notes" list. */
    public function index(): void
    {
        $payload = require_auth();
        json_ok(['items' => $this->model->notesForUser((int) $payload['sub'])]);
    }

    /** GET /api/notes/{id} (owner only) — a single note plus its associated study, for the notebook detail/print page. */
    public function show(int $id): void
    {
        $payload = require_auth();
        $note = $this->model->findNoteWithStudy($id);

        if (!$note) {
            json_error('Note not found.', 404);
        }
        if ((int) $note['user_id'] !== (int) $payload['sub']) {
            json_error('You do not have permission to view this note.', 403);
        }

        json_ok(['item' => $note]);
    }

    /** PUT /api/notes/{id} (owner only) body: {body, title?} */
    public function update(int $id): void
    {
        $payload = require_auth();
        $note = $this->model->findNote($id);

        if (!$note) {
            json_error('Note not found.', 404);
        }
        if ((int) $note['user_id'] !== (int) $payload['sub']) {
            json_error('You do not have permission to edit this note.', 403);
        }

        $requestBody = get_json_body();
        $body = trim($requestBody['body'] ?? '');
        if ($body === '') {
            json_error('Note text is required.', 422);
        }
        if (mb_strlen($body) > 20000) {
            json_error('Note is too long (max 20,000 characters).', 422);
        }

        $titleProvided = array_key_exists('title', $requestBody);
        $title = $titleProvided ? trim((string) $requestBody['title']) ?: null : null;

        $this->model->updateNote($id, $body, $title, $titleProvided);
        json_ok(null, 'Note updated.');
    }

    /** DELETE /api/notes/{id} (owner only) */
    public function destroy(int $id): void
    {
        $payload = require_auth();
        $note = $this->model->findNote($id);

        if (!$note) {
            json_error('Note not found.', 404);
        }
        if ((int) $note['user_id'] !== (int) $payload['sub']) {
            json_error('You do not have permission to delete this note.', 403);
        }

        $this->model->deleteNote($id);
        json_ok(null, 'Note deleted.');
    }
}

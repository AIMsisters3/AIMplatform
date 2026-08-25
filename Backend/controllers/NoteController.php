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

    /** PUT /api/notes/{id} (owner only) body: {body} */
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

        $body = trim((get_json_body())['body'] ?? '');
        if ($body === '') {
            json_error('Note text is required.', 422);
        }

        $this->model->updateNote($id, $body);
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

<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/media_url.php';

/**
 * Backs activities / activity_questions / activity_options /
 * activity_attempts / activity_attempt_answers (migration 042).
 *
 * This is the one place that may ever read activity_options.is_correct/
 * correct_order/match_value for a PUBLIC request - every public-facing
 * method here either grades server-side (submit()) or explicitly strips
 * those columns before returning (forPlayer()). Nothing else in this
 * codebase should query activity_options directly.
 */
class Activity
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    private const SCORE_MESSAGES = [
        [100, 'Excellent! Well done! 🌟'],
        [80,  'Great work! 🎉'],
        [60,  'Good effort! Keep learning! 📖'],
        [0,   'Keep trying! You can do it! 💪'],
    ];

    public static function messageFor(int $percent): string
    {
        foreach (self::SCORE_MESSAGES as [$floor, $message]) {
            if ($percent >= $floor) {
                return $message;
            }
        }
        return 'Keep trying! You can do it! 💪';
    }

    // ---------------------------------------------------------
    // Listing / admin detail
    // ---------------------------------------------------------

    /** @param array $filters lesson_id,status,search */
    public function all(array $filters = [], int $limit = 50, int $offset = 0): array
    {
        $where = ['a.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where[] = 'a.status = :status';
            $params['status'] = $filters['status'];
        } elseif (empty($filters['status'])) {
            $where[] = "a.status = 'published'";
        }
        if (!empty($filters['lesson_id'])) {
            $where[] = 'a.lesson_id = :lesson_id';
            $params['lesson_id'] = $filters['lesson_id'];
        }
        if (!empty($filters['search'])) {
            $where[] = 'a.title LIKE :search1';
            $params['search1'] = '%' . $filters['search'] . '%';
        }

        $sql = 'SELECT a.*, l.title AS lesson_title,
                    (SELECT COUNT(*) FROM activity_questions q WHERE q.activity_id = a.id) AS question_count,
                    (SELECT COUNT(*) FROM activity_attempts at WHERE at.activity_id = a.id) AS attempt_count,
                    (SELECT ROUND(AVG(at2.score_percent)) FROM activity_attempts at2 WHERE at2.activity_id = a.id) AS average_score
                FROM activities a
                LEFT JOIN bible_lessons l ON l.id = a.lesson_id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY a.created_at DESC
                LIMIT :limit OFFSET :offset';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return array_map([self::class, 'decorateActivity'], $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT a.*, l.slug AS lesson_slug FROM activities a
             LEFT JOIN bible_lessons l ON l.id = a.lesson_id
             WHERE a.id = :id AND a.deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::decorateActivity($row) : null;
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT a.*, l.slug AS lesson_slug FROM activities a
             LEFT JOIN bible_lessons l ON l.id = a.lesson_id
             WHERE a.slug = :slug AND a.deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        return $row ? self::decorateActivity($row) : null;
    }

    /** Full question+option detail, correct answers included - admin builder/preview and the grading engine only. */
    public function questionsWithAnswers(int $activityId): array
    {
        $qStmt = $this->db->prepare('SELECT * FROM activity_questions WHERE activity_id = :id ORDER BY order_index ASC');
        $qStmt->execute(['id' => $activityId]);
        $questions = $qStmt->fetchAll();

        if ($questions === []) {
            return [];
        }

        $oStmt = $this->db->prepare('SELECT * FROM activity_options WHERE question_id = :id ORDER BY order_index ASC');
        foreach ($questions as &$question) {
            $question['image_url'] = normalize_media_url($question['image_url']);
            $oStmt->execute(['id' => $question['id']]);
            $question['options'] = array_map(function (array $opt): array {
                $opt['image_url'] = normalize_media_url($opt['image_url']);
                $opt['is_correct'] = (bool) $opt['is_correct'];
                return $opt;
            }, $oStmt->fetchAll());
        }
        unset($question);

        return $questions;
    }

    /**
     * Same shape as questionsWithAnswers(), with every answer-revealing
     * field stripped - what the player (GET before submit) receives.
     *
     * Stripping is_correct/correct_order/match_value alone isn't enough
     * for 'ordering' and 'matching': for those two types the admin
     * builder's own OPTION ORDER (or, for matching, each option's
     * match_value) *is* the answer, so returning options in storage
     * order would just hand the child the solved puzzle to look at.
     * 'ordering' options are shuffled before being sent; 'matching'
     * gets a separate, shuffled `match_pool` of plain right-hand-side
     * strings instead of each option carrying its own match_value, so
     * the child sees the set of possible matches without which belongs
     * to which left-hand item.
     */
    public function questionsForPlayer(int $activityId): array
    {
        $questions = $this->questionsWithAnswers($activityId);
        return array_map(function (array $q): array {
            $options = $q['options'];
            if ($q['type'] === 'ordering' || $q['type'] === 'multiple_choice' || $q['type'] === 'picture_choice') {
                shuffle($options);
            }
            if ($q['type'] === 'matching') {
                $q['match_pool'] = array_values(array_map(fn ($o) => $o['match_value'], $options));
                shuffle($q['match_pool']);
            }
            $q['options'] = array_map(function (array $opt): array {
                unset($opt['is_correct'], $opt['correct_order'], $opt['match_value']);
                return $opt;
            }, $options);
            unset($q['explanation']); // shown only after submission
            return $q;
        }, $questions);
    }

    // ---------------------------------------------------------
    // Admin builder
    // ---------------------------------------------------------

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO activities (lesson_id, title, slug, description, type, cover_image, status, publish_date, created_by)
             VALUES (:lesson_id, :title, :slug, :description, :type, :cover_image, :status, :publish_date, :created_by)'
        );
        $stmt->execute([
            'lesson_id'    => $data['lesson_id'] ?: null,
            'title'        => $data['title'],
            'slug'         => $data['slug'],
            'description'  => $data['description'] ?? null,
            'type'         => $data['type'] ?? 'multiple_choice',
            'cover_image'  => $data['cover_image'] ?? null,
            'status'       => $data['status'] ?? 'draft',
            'publish_date' => $data['publish_date'] ?? null,
            'created_by'   => $data['created_by'] ?? null,
        ]);
        $id = (int) $this->db->lastInsertId();

        if (isset($data['questions'])) {
            $this->replaceQuestions($id, $data['questions']);
        }

        return $id;
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];
        $allowed = ['lesson_id', 'title', 'slug', 'description', 'type', 'cover_image', 'status', 'publish_date'];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[$field] = $field === 'lesson_id' ? ($data[$field] ?: null) : $data[$field];
            }
        }
        if ($fields !== []) {
            $stmt = $this->db->prepare('UPDATE activities SET ' . implode(', ', $fields) . ' WHERE id = :id');
            $stmt->execute($params);
        }

        if (isset($data['questions'])) {
            $this->replaceQuestions($id, $data['questions']);
        }

        return true;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE activities SET deleted_at = NOW() WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    /** Wholesale replace, same rationale as BibleLesson::replaceSections() - the builder always sends the complete question list. */
    private function replaceQuestions(int $activityId, array $questions): void
    {
        $existing = $this->db->prepare('SELECT id FROM activity_questions WHERE activity_id = :id');
        $existing->execute(['id' => $activityId]);
        $existingIds = array_column($existing->fetchAll(), 'id');
        if ($existingIds !== []) {
            // ON DELETE CASCADE on activity_options takes the options with it.
            // activity_attempt_answers.question_id -> activity_questions has
            // no CASCADE (attempts must outlive a later question edit for
            // history purposes) - see migration 042's FK; a rebuilt question
            // set after attempts exist intentionally orphans old answer rows'
            // display of that specific question's text, same tradeoff any
            // quiz app with editable questions makes.
            $placeholders = implode(',', array_fill(0, count($existingIds), '?'));
            $this->db->prepare("DELETE FROM activity_questions WHERE id IN ($placeholders)")->execute($existingIds);
        }

        $qStmt = $this->db->prepare(
            'INSERT INTO activity_questions (activity_id, order_index, type, prompt, image_url, marks, explanation)
             VALUES (:activity_id, :order_index, :type, :prompt, :image_url, :marks, :explanation)'
        );
        $oStmt = $this->db->prepare(
            'INSERT INTO activity_options (question_id, order_index, label, image_url, match_value, is_correct, correct_order)
             VALUES (:question_id, :order_index, :label, :image_url, :match_value, :is_correct, :correct_order)'
        );

        foreach (array_values($questions) as $qi => $question) {
            $qStmt->execute([
                'activity_id' => $activityId,
                'order_index' => $qi,
                'type'        => $question['type'],
                'prompt'      => $question['prompt'],
                'image_url'   => $question['image_url'] ?? null,
                'marks'       => max(1, (int) ($question['marks'] ?? 1)),
                'explanation' => $question['explanation'] ?? null,
            ]);
            $questionId = (int) $this->db->lastInsertId();

            foreach (array_values($question['options'] ?? []) as $oi => $option) {
                $oStmt->execute([
                    'question_id'   => $questionId,
                    'order_index'   => $oi,
                    'label'         => $option['label'],
                    'image_url'     => $option['image_url'] ?? null,
                    'match_value'   => $option['match_value'] ?? null,
                    'is_correct'    => !empty($option['is_correct']) ? 1 : 0,
                    'correct_order' => isset($option['correct_order']) ? (int) $option['correct_order'] : null,
                ]);
            }
        }
    }

    // ---------------------------------------------------------
    // Taking an activity / grading (public)
    // ---------------------------------------------------------

    /**
     * Grades $answers server-side against this activity's stored correct
     * data and records the attempt. $answers is keyed by question_id =>
     * one of the shapes documented on each branch below - always
     * whatever the player actually submitted, never trusted as already
     * "correct" or "incorrect".
     *
     * Duplicate-submission safe: $submissionToken is a UNIQUE column
     * (activity_attempts.submission_token) generated by the player when
     * it first loaded the activity (see ActivityController::start()) and
     * echoed back unchanged on submit - a retried/double-clicked POST
     * with the same token hits the UNIQUE constraint and this method
     * returns the attempt that already exists instead of scoring twice.
     *
     * @throws RuntimeException if the activity has no questions.
     */
    public function submit(int $activityId, int $userId, string $submissionToken, array $answers): array
    {
        $existingAttemptId = $this->attemptIdForToken($submissionToken);
        if ($existingAttemptId) {
            return $this->resultFor($existingAttemptId);
        }

        $questions = $this->questionsWithAnswers($activityId);
        if ($questions === []) {
            throw new RuntimeException('This activity has no questions yet.');
        }

        $totalMarks = 0;
        $earnedMarks = 0;
        $correctCount = 0;
        $graded = [];

        foreach ($questions as $question) {
            $marks = (int) $question['marks'];
            $totalMarks += $marks;
            $submitted = $answers[$question['id']] ?? $answers[(string) $question['id']] ?? null;
            $isCorrect = self::gradeQuestion($question, $submitted);
            $awarded = $isCorrect ? $marks : 0;
            $earnedMarks += $awarded;
            if ($isCorrect) {
                $correctCount++;
            }
            $graded[] = [
                'question_id'   => $question['id'],
                'is_correct'    => $isCorrect,
                'awarded_marks' => $awarded,
                'answer_json'   => json_encode($submitted),
            ];
        }

        $scorePercent = $totalMarks > 0 ? (int) round($earnedMarks / $totalMarks * 100) : 0;

        $this->db->beginTransaction();
        try {
            $insertAttempt = $this->db->prepare(
                'INSERT INTO activity_attempts
                    (activity_id, user_id, submission_token, total_questions, correct_count, total_marks, earned_marks, score_percent)
                 VALUES (:activity_id, :user_id, :token, :total_questions, :correct_count, :total_marks, :earned_marks, :score_percent)'
            );
            $insertAttempt->execute([
                'activity_id'     => $activityId,
                'user_id'         => $userId,
                'token'           => $submissionToken,
                'total_questions' => count($questions),
                'correct_count'   => $correctCount,
                'total_marks'     => $totalMarks,
                'earned_marks'    => $earnedMarks,
                'score_percent'   => $scorePercent,
            ]);
            $attemptId = (int) $this->db->lastInsertId();

            $insertAnswer = $this->db->prepare(
                'INSERT INTO activity_attempt_answers (attempt_id, question_id, is_correct, awarded_marks, answer_json)
                 VALUES (:attempt_id, :question_id, :is_correct, :awarded_marks, :answer_json)'
            );
            foreach ($graded as $g) {
                $insertAnswer->execute([
                    'attempt_id'    => $attemptId,
                    'question_id'   => $g['question_id'],
                    'is_correct'    => $g['is_correct'] ? 1 : 0,
                    'awarded_marks' => $g['awarded_marks'],
                    'answer_json'   => $g['answer_json'],
                ]);
            }

            $this->recomputeBest($userId, $activityId);
            $this->db->commit();
        } catch (PDOException $e) {
            $this->db->rollBack();
            // A genuinely simultaneous duplicate POST (two requests racing
            // past the attemptIdForToken() check above before either had
            // committed) still can't create two scored attempts - the
            // UNIQUE constraint on submission_token rejects the loser,
            // which then just returns the winner's already-recorded result.
            if ((int) $e->errorInfo[1] === 1062) {
                $existingAttemptId = $this->attemptIdForToken($submissionToken);
                if ($existingAttemptId) {
                    return $this->resultFor($existingAttemptId);
                }
            }
            throw $e;
        }

        return $this->resultFor($attemptId);
    }

    private function attemptIdForToken(string $token): ?int
    {
        $stmt = $this->db->prepare('SELECT id FROM activity_attempts WHERE submission_token = :t LIMIT 1');
        $stmt->execute(['t' => $token]);
        $id = $stmt->fetchColumn();
        return $id ? (int) $id : null;
    }

    private function recomputeBest(int $userId, int $activityId): void
    {
        $this->db->prepare('UPDATE activity_attempts SET is_best = 0 WHERE user_id = :u AND activity_id = :a')
            ->execute(['u' => $userId, 'a' => $activityId]);
        $this->db->prepare(
            'UPDATE activity_attempts SET is_best = 1 WHERE user_id = :u AND activity_id = :a
             ORDER BY score_percent DESC, created_at ASC LIMIT 1'
        )->execute(['u' => $userId, 'a' => $activityId]);
    }

    /** One attempt's full result, including per-question correct answers/explanations - post-submission only. */
    public function resultFor(int $attemptId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM activity_attempts WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $attemptId]);
        $attempt = $stmt->fetch();
        if (!$attempt) {
            throw new RuntimeException('Attempt not found.');
        }

        $questions = $this->questionsWithAnswers((int) $attempt['activity_id']);
        $answersStmt = $this->db->prepare('SELECT * FROM activity_attempt_answers WHERE attempt_id = :id');
        $answersStmt->execute(['id' => $attemptId]);
        $answersByQuestion = [];
        foreach ($answersStmt->fetchAll() as $a) {
            $answersByQuestion[(int) $a['question_id']] = $a;
        }

        $breakdown = [];
        foreach ($questions as $q) {
            $a = $answersByQuestion[$q['id']] ?? null;
            $breakdown[] = [
                'question_id'    => $q['id'],
                'prompt'         => $q['prompt'],
                'type'           => $q['type'],
                'is_correct'     => $a ? (bool) $a['is_correct'] : false,
                'awarded_marks'  => $a ? (int) $a['awarded_marks'] : 0,
                'marks'          => (int) $q['marks'],
                'your_answer'    => $a && $a['answer_json'] ? json_decode($a['answer_json'], true) : null,
                'correct_answer' => self::correctAnswerSummary($q),
                'explanation'    => $q['explanation'],
            ];
        }

        return [
            'attempt_id'      => (int) $attempt['id'],
            'total_questions' => (int) $attempt['total_questions'],
            'correct_count'   => (int) $attempt['correct_count'],
            'total_marks'     => (int) $attempt['total_marks'],
            'earned_marks'    => (int) $attempt['earned_marks'],
            'score_percent'   => (int) $attempt['score_percent'],
            'is_best'         => (bool) $attempt['is_best'],
            'message'         => self::messageFor((int) $attempt['score_percent']),
            'questions'       => $breakdown,
        ];
    }

    /** @return array latest attempt + best attempt (same row if only one exists) for one user+activity. */
    public function attemptsFor(int $userId, int $activityId): array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM activity_attempts WHERE user_id = :u AND activity_id = :a ORDER BY created_at DESC'
        );
        $stmt->execute(['u' => $userId, 'a' => $activityId]);
        $attempts = $stmt->fetchAll();

        if ($attempts === []) {
            return ['latest' => null, 'best' => null, 'attempt_count' => 0];
        }

        $best = $attempts[0];
        foreach ($attempts as $a) {
            if ((int) $a['score_percent'] > (int) $best['score_percent']) {
                $best = $a;
            }
        }

        return ['latest' => $attempts[0], 'best' => $best, 'attempt_count' => count($attempts)];
    }

    /** Simple per-child progress summary across every activity/lesson - powers the "My Progress" page. */
    public function progressSummaryFor(int $userId): array
    {
        $activities = $this->db->prepare(
            "SELECT a.id, a.title, a.slug,
                    MAX(at.score_percent) AS best_score,
                    SUBSTRING_INDEX(GROUP_CONCAT(at.score_percent ORDER BY at.created_at DESC), ',', 1) AS latest_score,
                    COUNT(at.id) AS attempt_count
             FROM activity_attempts at
             JOIN activities a ON a.id = at.activity_id AND a.deleted_at IS NULL
             WHERE at.user_id = :u
             GROUP BY a.id, a.title, a.slug
             ORDER BY MAX(at.created_at) DESC"
        );
        $activities->execute(['u' => $userId]);

        $lessons = $this->db->prepare(
            "SELECT l.id, l.title, l.slug, lp.status, lp.progress_percent
             FROM lesson_progress lp
             JOIN bible_lessons l ON l.id = lp.lesson_id AND l.deleted_at IS NULL
             WHERE lp.user_id = :u
             ORDER BY lp.updated_at DESC"
        );
        $lessons->execute(['u' => $userId]);

        $activityRows = $activities->fetchAll();
        $lessonRows = $lessons->fetchAll();

        return [
            'activities' => array_map(function (array $r): array {
                $r['best_score'] = (int) $r['best_score'];
                $r['latest_score'] = (int) $r['latest_score'];
                $r['attempt_count'] = (int) $r['attempt_count'];
                return $r;
            }, $activityRows),
            'lessons' => array_map(function (array $r): array {
                $r['progress_percent'] = (int) $r['progress_percent'];
                return $r;
            }, $lessonRows),
            'activities_completed' => count($activityRows),
            'lessons_completed' => count(array_filter($lessonRows, fn ($r) => $r['status'] === 'completed')),
        ];
    }

    // ---------------------------------------------------------
    // Grading rules per question type
    // ---------------------------------------------------------

    private static function gradeQuestion(array $question, $submitted): bool
    {
        if ($submitted === null) {
            return false;
        }

        switch ($question['type']) {
            case 'multiple_choice':
            case 'true_false':
            case 'picture_choice':
                $correctIds = array_map(fn ($o) => (int) $o['id'], array_filter($question['options'], fn ($o) => $o['is_correct']));
                $submittedIds = array_map('intval', (array) ($submitted['selected_option_ids'] ?? []));
                sort($correctIds);
                sort($submittedIds);
                return $correctIds !== [] && $correctIds === $submittedIds;

            case 'fill_blank':
                $text = trim(mb_strtolower((string) ($submitted['text'] ?? '')));
                if ($text === '') {
                    return false;
                }
                foreach ($question['options'] as $o) {
                    if ($o['is_correct'] && trim(mb_strtolower($o['label'])) === $text) {
                        return true;
                    }
                }
                return false;

            case 'ordering':
                $correctOrder = $question['options'];
                usort($correctOrder, fn ($a, $b) => ($a['correct_order'] ?? 0) <=> ($b['correct_order'] ?? 0));
                $correctIds = array_map(fn ($o) => (int) $o['id'], $correctOrder);
                $submittedIds = array_map('intval', (array) ($submitted['ordered_option_ids'] ?? []));
                return $correctIds !== [] && $correctIds === $submittedIds;

            case 'matching':
                $expected = [];
                foreach ($question['options'] as $o) {
                    $expected[(int) $o['id']] = trim(mb_strtolower((string) $o['match_value']));
                }
                $pairs = (array) ($submitted['pairs'] ?? []);
                if (count($pairs) !== count($expected)) {
                    return false;
                }
                foreach ($pairs as $pair) {
                    $optionId = (int) ($pair['option_id'] ?? 0);
                    $matched = trim(mb_strtolower((string) ($pair['matched_value'] ?? '')));
                    if (!array_key_exists($optionId, $expected) || $expected[$optionId] !== $matched) {
                        return false;
                    }
                }
                return true;

            default:
                // An activity type this version of the backend doesn't
                // recognize yet - never silently mark it correct.
                return false;
        }
    }

    private static function correctAnswerSummary(array $question): array
    {
        switch ($question['type']) {
            case 'multiple_choice':
            case 'true_false':
            case 'picture_choice':
                return array_values(array_map(fn ($o) => $o['label'], array_filter($question['options'], fn ($o) => $o['is_correct'])));
            case 'fill_blank':
                return array_values(array_map(fn ($o) => $o['label'], array_filter($question['options'], fn ($o) => $o['is_correct'])));
            case 'ordering':
                $ordered = $question['options'];
                usort($ordered, fn ($a, $b) => ($a['correct_order'] ?? 0) <=> ($b['correct_order'] ?? 0));
                return array_values(array_map(fn ($o) => $o['label'], $ordered));
            case 'matching':
                return array_map(fn ($o) => $o['label'] . ' → ' . $o['match_value'], $question['options']);
            default:
                return [];
        }
    }

    private static function decorateActivity(array $row): array
    {
        $row['cover_image'] = normalize_media_url($row['cover_image']);
        foreach (['question_count', 'attempt_count', 'average_score'] as $k) {
            if (array_key_exists($k, $row)) {
                $row[$k] = (int) $row[$k];
            }
        }
        return $row;
    }
}

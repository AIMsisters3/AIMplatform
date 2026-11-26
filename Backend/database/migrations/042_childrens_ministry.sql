-- =========================================================
-- Migration 042: Children's Ministry (Bible Lessons + Bible Activities)
--
-- HOW TO RUN: after migration 041. Safe to run once; re-running errors
-- on the CREATE TABLE statements (expected — means it already ran).
--
-- WHAT THIS DOES
--
-- Bible Stories deliberately do NOT get a new table here — a Story is
-- just a cartoon video with a thumbnail/description, which the existing
-- `content` table (section='kids', media_type='bible_story') already
-- models perfectly, and reusing it means Stories get likes, views,
-- publish scheduling, soft-delete, WhatsApp/copy-link sharing, and
-- comment-suppression (allow_comments) for free — see migration 041 for
-- the one column Stories actually needed (is_downloadable).
--
-- Bible Lessons and Bible Activities are genuinely new shapes the
-- `content` table can't express (lesson sections, quiz questions/options,
-- scored attempt history), so they get their own tables:
--
--   bible_lessons           one row per lesson (title, intro, bible
--                            refs/verse, key points, reflection
--                            questions — the last two as JSON arrays,
--                            same "flexible list without a new table
--                            per field" approach used elsewhere).
--   lesson_sections          a lesson's body, broken into ordered
--                            sections (heading + text + optional
--                            image/video) so a long lesson doesn't have
--                            to be one unbroken wall of text.
--   lesson_story_links       many-to-many: which Bible Stories
--                            (content rows) a lesson calls "related."
--   activities               a quiz/activity, optionally tied to one
--                            lesson (lesson_id NULL is allowed so a
--                            future standalone activity isn't blocked).
--   activity_questions       one activity's questions; `type` drives
--                            which admin-builder UI and which grading
--                            logic applies to its options.
--   activity_options         one flexible table for every question
--                            type's answer data: is_correct (MCQ/
--                            true-false/fill-blank), correct_order
--                            (arrange-in-order), match_value (matching
--                            pairs), image_url (picture-based options).
--   activity_attempts        one row per submission (append-only, so
--                            "latest" and "best" are just different
--                            ORDER BYs over the same history — never
--                            upserted/overwritten). submission_token is
--                            a client-generated idempotency key: a
--                            duplicate POST with the same token hits the
--                            UNIQUE constraint instead of creating a
--                            second scored attempt.
--   activity_attempt_answers per-question breakdown of one attempt, so
--                            a results screen can show which questions
--                            were right/wrong after submission.
--   lesson_progress          one row per (user, lesson), same upsert
--                            shape as the existing bible_study_progress
--                            table this mirrors.
--
-- Every table follows this codebase's existing conventions: InnoDB,
-- utf8mb4 (inherited from the database default), soft-delete via
-- deleted_at where the row is admin-authored content, status ENUM
-- draft/scheduled/published/archived + publish_date, created_at/
-- updated_at. Correct answers (activity_options.is_correct/
-- correct_order/match_value) are only ever read by the backend during
-- grading — ActivityController must never include them in a public
-- "fetch activity to take it" response, only in the admin builder and
-- in the post-submission result payload.
-- =========================================================

CREATE TABLE IF NOT EXISTS bible_lessons (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  cover_image VARCHAR(255) DEFAULT NULL,
  intro TEXT,
  bible_references VARCHAR(255) DEFAULT NULL,
  key_verse_text TEXT,
  key_verse_reference VARCHAR(255) DEFAULT NULL,
  -- JSON arrays of plain strings - e.g. key_points: ["God made everything",
  -- "God's creation was good"]; reflection_questions: ["What is your
  -- favorite thing God created?"]. No new table per list since neither
  -- needs its own ordering beyond array order or any relational data.
  key_points JSON DEFAULT NULL,
  reflection_questions JSON DEFAULT NULL,
  -- Free-text grouping ("topics or learning series" per spec) rather than
  -- a dedicated lesson_collections table — admins group lessons simply by
  -- typing the same topic name; order_index sorts lessons within a topic.
  -- Can be promoted to a real table later (e.g. for topic cover art)
  -- without touching existing rows, by adding a topic_id FK alongside
  -- this column and backfilling it from the distinct topic strings.
  topic VARCHAR(120) DEFAULT NULL,
  order_index INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
  publish_date DATETIME DEFAULT NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  created_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_lessons_author FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_lessons_status (status),
  INDEX idx_lessons_topic (topic)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lesson_sections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT UNSIGNED NOT NULL,
  order_index INT UNSIGNED NOT NULL DEFAULT 0,
  heading VARCHAR(200) DEFAULT NULL,
  body LONGTEXT,
  image_url VARCHAR(255) DEFAULT NULL,
  video_url VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lesson_sections_lesson FOREIGN KEY (lesson_id) REFERENCES bible_lessons(id) ON DELETE CASCADE,
  INDEX idx_lesson_sections_lesson (lesson_id, order_index)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lesson_story_links (
  lesson_id INT UNSIGNED NOT NULL,
  content_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lesson_id, content_id),
  CONSTRAINT fk_lsl_lesson FOREIGN KEY (lesson_id) REFERENCES bible_lessons(id) ON DELETE CASCADE,
  CONSTRAINT fk_lsl_content FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT UNSIGNED DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT,
  -- Denormalized "primary type" label for display/filtering (e.g. the
  -- activities list can show a "Quiz" vs "Matching" badge without
  -- joining questions) - the real per-question type lives on
  -- activity_questions.type, so a single activity can still mix types
  -- if ever needed, even though the builder UI generally keeps one
  -- activity to one type, matching how admins will actually use it.
  type VARCHAR(30) NOT NULL DEFAULT 'multiple_choice',
  cover_image VARCHAR(255) DEFAULT NULL,
  status ENUM('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
  publish_date DATETIME DEFAULT NULL,
  created_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_activities_lesson FOREIGN KEY (lesson_id) REFERENCES bible_lessons(id) ON DELETE SET NULL,
  CONSTRAINT fk_activities_author FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_activities_status (status),
  INDEX idx_activities_lesson (lesson_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activity_id INT UNSIGNED NOT NULL,
  order_index INT UNSIGNED NOT NULL DEFAULT 0,
  -- Extensible on purpose (spec: "flexible enough to support additional
  -- activity types in the future") - a type this backend doesn't
  -- recognize yet simply isn't offered in today's builder/player, no
  -- schema change needed to add the string value itself later.
  type VARCHAR(30) NOT NULL,
  prompt TEXT NOT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  marks TINYINT UNSIGNED NOT NULL DEFAULT 1,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_questions_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  INDEX idx_questions_activity (activity_id, order_index)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_options (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  question_id INT UNSIGNED NOT NULL,
  order_index INT UNSIGNED NOT NULL DEFAULT 0,
  label VARCHAR(255) NOT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  -- Matching questions only: the label this option's left-hand item
  -- should be paired with (e.g. label='David', match_value='Defeated Goliath').
  match_value VARCHAR(255) DEFAULT NULL,
  -- Multiple-choice / true-false / fill-blank: is this option (or
  -- accepted answer text, for fill-blank) correct.
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  -- Arrange-in-order questions only: this item's correct 1-based position.
  correct_order TINYINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_options_question FOREIGN KEY (question_id) REFERENCES activity_questions(id) ON DELETE CASCADE,
  INDEX idx_options_question (question_id, order_index)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_attempts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activity_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  -- Idempotency key: the player requests one when it loads the activity
  -- and submits it back unchanged - a double-click/retry with the same
  -- token hits this UNIQUE constraint instead of recording a second
  -- attempt for one real submission.
  submission_token VARCHAR(64) NOT NULL UNIQUE,
  total_questions SMALLINT UNSIGNED NOT NULL,
  correct_count SMALLINT UNSIGNED NOT NULL,
  total_marks SMALLINT UNSIGNED NOT NULL,
  earned_marks SMALLINT UNSIGNED NOT NULL,
  score_percent TINYINT UNSIGNED NOT NULL,
  -- Denormalized convenience flag: 1 on the single highest-scoring
  -- attempt for this (user, activity) pair, recomputed inside the same
  -- transaction that inserts a new attempt - avoids a MAX(score_percent)
  -- query every time a "best score" needs to be displayed.
  is_best TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attempts_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_attempts_user_activity (user_id, activity_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_attempt_answers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  awarded_marks TINYINT UNSIGNED NOT NULL DEFAULT 0,
  -- Whatever the child actually submitted for this question - a JSON
  -- array of chosen activity_options.id (MCQ/true-false/matching/
  -- ordering) or a plain typed string (fill-blank) - kept so a results
  -- screen can show "you answered X, the correct answer was Y."
  answer_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_answers_attempt FOREIGN KEY (attempt_id) REFERENCES activity_attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES activity_questions(id) ON DELETE CASCADE,
  INDEX idx_answers_attempt (attempt_id)
) ENGINE=InnoDB;

-- Mirrors bible_study_progress exactly (migration 004) - one upsert row
-- per (user, lesson), since a lesson (unlike an activity) only ever
-- needs "where did they leave off reading", not a scored history.
CREATE TABLE IF NOT EXISTS lesson_progress (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  lesson_id INT UNSIGNED NOT NULL,
  status ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'in_progress',
  progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
  completed_at DATETIME DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lesson_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson_progress_lesson FOREIGN KEY (lesson_id) REFERENCES bible_lessons(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_lesson_progress (user_id, lesson_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- children.manage permission - gates the new, separate Children's
-- Ministry admin area (Stories/Lessons/Activities) independently of
-- the existing content.* permissions the ordinary Update Content page
-- uses, per explicit request that the two stay clearly separated.
-- Granted to admin + superadmin by default, same roles that already
-- hold content.create/edit/publish/delete.
-- ---------------------------------------------------------
INSERT INTO permissions (slug, name, description) VALUES
  ('children.manage', 'Manage Children''s Ministry', 'Create, edit, publish, and delete Bible Stories, Bible Lessons, and Bible Activities.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.slug = 'children.manage'
WHERE r.slug IN ('admin', 'superadmin');

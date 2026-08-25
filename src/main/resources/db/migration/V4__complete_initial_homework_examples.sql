-- V3 creates custom subjects and inserts homeworks in one statement. PostgreSQL data-modifying
-- CTEs share a snapshot, so homeworks for subjects created in that statement are completed here.
WITH homework_seed (
    student_login_id, subject_name, title, due_date, progress_code, creator_login_id
) AS (
    VALUES
        ('student-1', '과학', '태양계 행성 조사하고 정리하기', CURRENT_DATE - 2, 'PROGRESS_50', 'parent-1'),
        ('student-1', '사회', '우리 지역 문화재 찾아보기', CURRENT_DATE + 1, 'PROGRESS_0', 'student-1')
),
inserted_homeworks AS (
    INSERT INTO homeworks (
        student_id, subject_id, title, due_date,
        progress_code_id, created_by, updated_by
    )
    SELECT
        student.id,
        subject.id,
        seed.title,
        seed.due_date,
        progress_code.id,
        creator.id,
        creator.id
    FROM homework_seed seed
    JOIN users student ON student.login_id = seed.student_login_id
    JOIN subjects subject
      ON subject.student_id = student.id
     AND lower(subject.name) = lower(seed.subject_name)
    JOIN common_codes progress_code ON progress_code.code = seed.progress_code
    JOIN users creator ON creator.login_id = seed.creator_login_id
    WHERE NOT EXISTS (
        SELECT 1
        FROM homeworks existing
        WHERE existing.student_id = student.id
          AND existing.title = seed.title
    )
    RETURNING id, created_by
)
INSERT INTO homework_histories (
    homework_id, action_code_id, actor_id, before_data, after_data
)
SELECT
    homework.id,
    action_code.id,
    homework.created_by,
    NULL,
    to_jsonb(stored_homework)
FROM inserted_homeworks homework
JOIN homeworks stored_homework ON stored_homework.id = homework.id
JOIN common_codes action_code ON action_code.code = 'HW_CREATED';

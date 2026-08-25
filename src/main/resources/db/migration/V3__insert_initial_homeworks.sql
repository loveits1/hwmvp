-- Sample homework data previously held in app.js.
WITH homework_seed (
    student_login_id, subject_name, title, description,
    due_date, progress_code, creator_login_id
) AS (
    VALUES
        ('student-1', '수학', '수학 익힘책 54~57쪽 풀기', '틀린 문제는 다시 풀어보기', CURRENT_DATE, 'PROGRESS_100', 'student-1'),
        ('student-1', '영어', '영어 단어 20개 외우기', NULL, CURRENT_DATE, 'PROGRESS_75', 'parent-1'),
        ('student-1', '국어', '독서 감상문 한 편 쓰기', NULL, CURRENT_DATE, 'PROGRESS_0', 'student-1'),
        ('student-1', '과학', '태양계 행성 조사하고 정리하기', NULL, CURRENT_DATE - 2, 'PROGRESS_50', 'parent-1'),
        ('student-1', '사회', '우리 지역 문화재 찾아보기', NULL, CURRENT_DATE + 1, 'PROGRESS_0', 'student-1'),
        ('student-2', '수학', '연립방정식 문제 풀기', NULL, CURRENT_DATE, 'PROGRESS_25', 'student-2')
),
required_custom_subjects AS (
    INSERT INTO subjects (student_id, name, description)
    SELECT student.id, seed.subject_name, '초기 화면 예시 과목'
    FROM homework_seed seed
    JOIN users student ON student.login_id = seed.student_login_id
    WHERE NOT EXISTS (
        SELECT 1
        FROM subjects existing
        WHERE existing.student_id = student.id
          AND lower(existing.name) = lower(seed.subject_name)
    )
    GROUP BY student.id, seed.subject_name
    RETURNING id
),
inserted_homeworks AS (
    INSERT INTO homeworks (
        student_id, subject_id, title, description, due_date,
        progress_code_id, created_by, updated_by
    )
    SELECT
        student.id,
        subject.id,
        seed.title,
        seed.description,
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

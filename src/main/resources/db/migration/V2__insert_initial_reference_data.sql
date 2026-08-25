-- Development reference data for the first screen/API integration.
-- The existing managehw schema is registered as Flyway baseline version 1.

INSERT INTO common_codes (
    code, code_name, description, sort_order, hierarchy_level
)
VALUES
    ('ROLE', '사용자 역할', '학생과 학부모 역할 코드 그룹', 10, 1),
    ('LINK_STATUS', '연결 상태', '학부모와 학생의 연결 상태 코드 그룹', 20, 1),
    ('SUBJECT', '기본 과목', '서비스 기본 과목 코드 그룹', 30, 1),
    ('PROGRESS', '숙제 진행률', '숙제 진행률 코드 그룹', 40, 1),
    ('HW_ACTION', '숙제 작업', '숙제 이력 작업 코드 그룹', 50, 1)
ON CONFLICT DO NOTHING;

INSERT INTO common_codes (
    code, code_name, description, sort_order, hierarchy_level, parent_code_id
)
VALUES
    ('ROLE_STUDENT', '학생', '학생 사용자', 10, 2,
        (SELECT id FROM common_codes WHERE code = 'ROLE')),
    ('ROLE_PARENT', '학부모', '학부모 사용자', 20, 2,
        (SELECT id FROM common_codes WHERE code = 'ROLE')),
    ('LINK_INVITED', '초대', '연결 승인 대기', 10, 2,
        (SELECT id FROM common_codes WHERE code = 'LINK_STATUS')),
    ('LINK_APPROVED', '승인', '활성화된 연결', 20, 2,
        (SELECT id FROM common_codes WHERE code = 'LINK_STATUS')),
    ('LINK_DISCONNECTED', '해제', '해제된 연결', 30, 2,
        (SELECT id FROM common_codes WHERE code = 'LINK_STATUS')),
    ('SUBJECT_KOREAN', '국어', '기본 과목', 10, 2,
        (SELECT id FROM common_codes WHERE code = 'SUBJECT')),
    ('SUBJECT_ENGLISH', '영어', '기본 과목', 20, 2,
        (SELECT id FROM common_codes WHERE code = 'SUBJECT')),
    ('SUBJECT_MATH', '수학', '기본 과목', 30, 2,
        (SELECT id FROM common_codes WHERE code = 'SUBJECT')),
    ('SUBJECT_OTHER', '기타', '사용자 정의 과목 선택', 999, 2,
        (SELECT id FROM common_codes WHERE code = 'SUBJECT')),
    ('PROGRESS_0', '0%', '미완료', 0, 2,
        (SELECT id FROM common_codes WHERE code = 'PROGRESS')),
    ('PROGRESS_25', '25%', '진행 중', 25, 2,
        (SELECT id FROM common_codes WHERE code = 'PROGRESS')),
    ('PROGRESS_50', '50%', '진행 중', 50, 2,
        (SELECT id FROM common_codes WHERE code = 'PROGRESS')),
    ('PROGRESS_75', '75%', '진행 중', 75, 2,
        (SELECT id FROM common_codes WHERE code = 'PROGRESS')),
    ('PROGRESS_100', '100%', '완료', 100, 2,
        (SELECT id FROM common_codes WHERE code = 'PROGRESS')),
    ('HW_CREATED', '등록', '숙제 등록 이력', 10, 2,
        (SELECT id FROM common_codes WHERE code = 'HW_ACTION')),
    ('HW_UPDATED', '수정', '숙제 및 진행률 수정 이력', 20, 2,
        (SELECT id FROM common_codes WHERE code = 'HW_ACTION')),
    ('HW_DELETED', '삭제', '숙제 삭제 이력', 30, 2,
        (SELECT id FROM common_codes WHERE code = 'HW_ACTION'))
ON CONFLICT DO NOTHING;

INSERT INTO users (role_code_id, name, login_id)
VALUES
    ((SELECT id FROM common_codes WHERE code = 'ROLE_STUDENT'), '김하늘', 'student-1'),
    ((SELECT id FROM common_codes WHERE code = 'ROLE_STUDENT'), '이서준', 'student-2'),
    ((SELECT id FROM common_codes WHERE code = 'ROLE_PARENT'), '김민지', 'parent-1'),
    ((SELECT id FROM common_codes WHERE code = 'ROLE_PARENT'), '이지영', 'parent-2')
ON CONFLICT DO NOTHING;

INSERT INTO parent_student_links (parent_id, student_id, status_code_id)
VALUES
    (
        (SELECT id FROM users WHERE lower(login_id) = 'parent-1'),
        (SELECT id FROM users WHERE lower(login_id) = 'student-1'),
        (SELECT id FROM common_codes WHERE code = 'LINK_APPROVED')
    ),
    (
        (SELECT id FROM users WHERE lower(login_id) = 'parent-2'),
        (SELECT id FROM users WHERE lower(login_id) = 'student-2'),
        (SELECT id FROM common_codes WHERE code = 'LINK_APPROVED')
    )
ON CONFLICT DO NOTHING;

INSERT INTO subjects (student_id, subject_code_id, name, description)
SELECT
    student.id,
    subject_code.id,
    subject_code.code_name,
    '서비스 기본 과목'
FROM users student
CROSS JOIN common_codes subject_code
WHERE student.login_id IN ('student-1', 'student-2')
  AND subject_code.code IN ('SUBJECT_KOREAN', 'SUBJECT_ENGLISH', 'SUBJECT_MATH')
ON CONFLICT DO NOTHING;

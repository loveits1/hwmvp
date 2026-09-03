ALTER TABLE users
    ADD COLUMN invite_code varchar(8);

UPDATE users student
SET invite_code = upper(substr(md5(student.id::text || ':' || student.login_id), 1, 8))
FROM common_codes role_code
WHERE role_code.id = student.role_code_id
  AND role_code.code = 'ROLE_STUDENT'
  AND student.invite_code IS NULL;

CREATE UNIQUE INDEX uq_users_student_invite_code
    ON users (upper(invite_code))
    WHERE invite_code IS NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT ck_users_invite_code_format
        CHECK (invite_code IS NULL OR invite_code ~ '^[A-Z0-9]{8}$');

COMMENT ON COLUMN users.invite_code IS '학부모 연결 요청에 사용하는 학생별 8자리 코드';

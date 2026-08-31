ALTER TABLE users
    ADD COLUMN password_hash varchar(100),
    ADD COLUMN is_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN failed_login_count integer NOT NULL DEFAULT 0,
    ADD COLUMN locked_until timestamptz,
    ADD COLUMN last_login_at timestamptz;

-- MVP 테스트 계정의 공통 초기 비밀번호는 test1234! 입니다.
UPDATE users
SET password_hash = '$2y$12$jdWR.mJshmfMxu21/b9kOekMeN5iKwl3n1r0HlQ8dZ9iLcFdWeoUm'
WHERE password_hash IS NULL;

ALTER TABLE users
    ALTER COLUMN password_hash SET NOT NULL,
    ADD CONSTRAINT ck_users_password_hash_not_blank CHECK (btrim(password_hash) <> ''),
    ADD CONSTRAINT ck_users_failed_login_count CHECK (failed_login_count >= 0);

COMMENT ON COLUMN users.password_hash IS 'BCrypt 비밀번호 해시';
COMMENT ON COLUMN users.is_enabled IS '로그인 가능 여부';
COMMENT ON COLUMN users.failed_login_count IS '연속 로그인 실패 횟수';
COMMENT ON COLUMN users.locked_until IS '계정 잠금 종료 시각';
COMMENT ON COLUMN users.last_login_at IS '마지막 로그인 성공 시각';

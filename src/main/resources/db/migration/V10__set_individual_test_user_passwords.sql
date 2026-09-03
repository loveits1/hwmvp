-- 테스트 사용자별 초기 비밀번호를 서로 다르게 설정합니다.
UPDATE users SET password_hash = '$2y$12$lOhtwD6C1zAWJlPajp/liun/kXejmAsXXCcgWkTGKm4gLKW7MD93K' WHERE id = 1;
UPDATE users SET password_hash = '$2y$12$NWxn1EANzaLrCc66cdYifuee8vYy.toTtjAOIHLPpkoeOHTDivFIO' WHERE id = 2;
UPDATE users SET password_hash = '$2y$12$a3GpFSfKBYCrhWggYQfXi.bZa3DbZvGUzpqwpnrsqh7cBcMBnhau2' WHERE id = 3;
UPDATE users SET password_hash = '$2y$12$j45tNZxoSq0aWLw1FllW7eoqx59Mm0sk8SvqmquJh7oqv77N3Wr5O' WHERE id = 4;

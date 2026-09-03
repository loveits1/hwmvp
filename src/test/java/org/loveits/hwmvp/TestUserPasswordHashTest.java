package org.loveits.hwmvp;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class TestUserPasswordHashTest {

	private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

	@Test
	void migrationHashesMatchIndividualTestPasswords() {
		assertThat(encoder.matches("test!234", "$2y$12$lOhtwD6C1zAWJlPajp/liun/kXejmAsXXCcgWkTGKm4gLKW7MD93K")).isTrue();
		assertThat(encoder.matches("test1@34", "$2y$12$NWxn1EANzaLrCc66cdYifuee8vYy.toTtjAOIHLPpkoeOHTDivFIO")).isTrue();
		assertThat(encoder.matches("test12#4", "$2y$12$a3GpFSfKBYCrhWggYQfXi.bZa3DbZvGUzpqwpnrsqh7cBcMBnhau2")).isTrue();
		assertThat(encoder.matches("test123$", "$2y$12$j45tNZxoSq0aWLw1FllW7eoqx59Mm0sk8SvqmquJh7oqv77N3Wr5O")).isTrue();
	}
}

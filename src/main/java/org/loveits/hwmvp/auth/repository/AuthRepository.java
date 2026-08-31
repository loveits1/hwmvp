package org.loveits.hwmvp.auth.repository;

import java.util.Optional;

import org.loveits.hwmvp.auth.dto.AuthenticatedUser;
import org.loveits.hwmvp.auth.dto.CurrentUserResponse;
import org.loveits.hwmvp.auth.dto.CurrentUserResponse.LinkedStudentResponse;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class AuthRepository {

	private final JdbcClient jdbcClient;

	public AuthRepository(JdbcClient jdbcClient) {
		this.jdbcClient = jdbcClient;
	}

	/** 로그인 ID로 인증에 필요한 비밀번호 해시와 계정 상태를 조회합니다. */
	public Optional<AuthenticatedUser> findByLoginId(String loginId) {
		return jdbcClient.sql("""
				SELECT u.id, u.login_id, u.name, role_code.code AS role_code,
				       u.password_hash, u.is_enabled,
				       (u.locked_until IS NULL OR u.locked_until <= CURRENT_TIMESTAMP) AS account_non_locked
				FROM users u
				JOIN common_codes role_code ON role_code.id = u.role_code_id
				WHERE lower(u.login_id) = lower(:loginId)
				""")
				.param("loginId", loginId)
				.query((resultSet, rowNumber) -> new AuthenticatedUser(
						resultSet.getLong("id"),
						resultSet.getString("login_id"),
						resultSet.getString("name"),
						resultSet.getString("role_code"),
						resultSet.getString("password_hash"),
						resultSet.getBoolean("is_enabled"),
						resultSet.getBoolean("account_non_locked")))
				.optional();
	}

	/** 인증된 사용자와 승인된 관리 학생 정보를 대시보드용 응답으로 조회합니다. */
	public CurrentUserResponse findCurrentUser(Long userId) {
		return jdbcClient.sql("""
				SELECT u.id, u.login_id, u.name,
				       lower(replace(role_code.code, 'ROLE_', '')) AS role,
				       linked_student.id AS student_id,
				       linked_student.login_id AS student_login_id,
				       linked_student.name AS student_name
				FROM users u
				JOIN common_codes role_code ON role_code.id = u.role_code_id
				LEFT JOIN LATERAL (
				    SELECT student.id, student.login_id, student.name
				    FROM parent_student_links link
				    JOIN users student ON student.id = link.student_id
				    JOIN common_codes status_code ON status_code.id = link.status_code_id
				    WHERE link.parent_id = u.id AND status_code.code = 'LINK_APPROVED'
				    ORDER BY link.id
				    LIMIT 1
				) linked_student ON role_code.code = 'ROLE_PARENT'
				WHERE u.id = :userId
				""")
				.param("userId", userId)
				.query((resultSet, rowNumber) -> {
					Long studentId = resultSet.getObject("student_id", Long.class);
					LinkedStudentResponse student = studentId == null ? null : new LinkedStudentResponse(
							studentId,
							resultSet.getString("student_login_id"),
							resultSet.getString("student_name"));
					return new CurrentUserResponse(
							resultSet.getLong("id"),
							resultSet.getString("login_id"),
							resultSet.getString("role"),
							resultSet.getString("name"),
							student);
				})
				.single();
	}

	/** 로그인 성공 시 실패 횟수를 초기화하고 마지막 로그인 시각을 기록합니다. */
	public void recordLoginSuccess(Long userId) {
		jdbcClient.sql("""
				UPDATE users
				SET failed_login_count = 0, locked_until = NULL,
				    last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
				WHERE id = :userId
				""")
				.param("userId", userId)
				.update();
	}

	/** 로그인 실패를 기록하고 5회 연속 실패하면 15분 동안 계정을 잠급니다. */
	public void recordLoginFailure(String loginId) {
		jdbcClient.sql("""
				UPDATE users
				SET failed_login_count = failed_login_count + 1,
				    locked_until = CASE
				        WHEN failed_login_count + 1 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
				        ELSE locked_until
				    END,
				    updated_at = CURRENT_TIMESTAMP
				WHERE lower(login_id) = lower(:loginId)
				""")
				.param("loginId", loginId)
				.update();
	}
}

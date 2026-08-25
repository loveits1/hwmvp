package org.loveits.hwmvp.user.repository;

import java.util.List;

import org.loveits.hwmvp.user.dto.TestUserResponse;
import org.loveits.hwmvp.user.dto.TestUserResponse.LinkedStudentResponse;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class TestUserQueryRepository {

	private final JdbcClient jdbcClient;

	public TestUserQueryRepository(JdbcClient jdbcClient) {
		this.jdbcClient = jdbcClient;
	}

	public List<TestUserResponse> findStudents() {
		return jdbcClient.sql("""
				SELECT u.id,
				       u.login_id,
				       u.name,
				       linked_parent.name AS parent_name
				FROM users u
				JOIN common_codes role_code
				  ON role_code.id = u.role_code_id
				LEFT JOIN LATERAL (
				    SELECT parent_user.name
				    FROM parent_student_links link
				    JOIN users parent_user ON parent_user.id = link.parent_id
				    JOIN common_codes status_code ON status_code.id = link.status_code_id
				    WHERE link.student_id = u.id
				      AND status_code.code = 'LINK_APPROVED'
				    ORDER BY link.id
				    LIMIT 1
				) linked_parent ON true
				WHERE role_code.code = 'ROLE_STUDENT'
				ORDER BY u.id
				""")
				.query((resultSet, rowNumber) -> new TestUserResponse(
						resultSet.getLong("id"),
						resultSet.getString("login_id"),
						"student",
						resultSet.getString("name"),
						resultSet.getString("parent_name"),
						null))
				.list();
	}

	public List<TestUserResponse> findParents() {
		return jdbcClient.sql("""
				SELECT u.id,
				       u.login_id,
				       u.name,
				       linked_student.id AS student_id,
				       linked_student.login_id AS student_login_id,
				       linked_student.name AS student_name
				FROM users u
				JOIN common_codes role_code
				  ON role_code.id = u.role_code_id
				LEFT JOIN LATERAL (
				    SELECT student_user.id, student_user.login_id, student_user.name
				    FROM parent_student_links link
				    JOIN users student_user ON student_user.id = link.student_id
				    JOIN common_codes status_code ON status_code.id = link.status_code_id
				    WHERE link.parent_id = u.id
				      AND status_code.code = 'LINK_APPROVED'
				    ORDER BY link.id
				    LIMIT 1
				) linked_student ON true
				WHERE role_code.code = 'ROLE_PARENT'
				ORDER BY u.id
				""")
				.query((resultSet, rowNumber) -> {
					Long studentId = resultSet.getObject("student_id", Long.class);
					LinkedStudentResponse student = studentId == null ? null : new LinkedStudentResponse(
							studentId,
							resultSet.getString("student_login_id"),
							resultSet.getString("student_name"));
					return new TestUserResponse(
							resultSet.getLong("id"),
							resultSet.getString("login_id"),
							"parent",
							resultSet.getString("name"),
							null,
							student);
				})
				.list();
	}
}

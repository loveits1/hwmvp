package org.loveits.hwmvp.subject.repository;

import java.util.List;

import org.loveits.hwmvp.subject.dto.SubjectResponse;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class SubjectQueryRepository {

	private final JdbcClient jdbcClient;

	public SubjectQueryRepository(JdbcClient jdbcClient) {
		this.jdbcClient = jdbcClient;
	}

	public List<SubjectResponse> findByStudentId(Long studentId) {
		return jdbcClient.sql("""
				SELECT subject.id,
				       subject_code.code,
				       subject.name,
				       subject.description,
				       subject.subject_code_id IS NULL AS is_custom
				FROM subjects subject
				LEFT JOIN common_codes subject_code
				  ON subject_code.id = subject.subject_code_id
				WHERE subject.student_id = :studentId
				ORDER BY COALESCE(subject_code.sort_order, 998), lower(subject.name), subject.id
				""")
				.param("studentId", studentId)
				.query((resultSet, rowNumber) -> new SubjectResponse(
						resultSet.getLong("id"),
						resultSet.getString("code"),
						resultSet.getString("name"),
						resultSet.getString("description"),
						resultSet.getBoolean("is_custom")))
				.list();
	}
}

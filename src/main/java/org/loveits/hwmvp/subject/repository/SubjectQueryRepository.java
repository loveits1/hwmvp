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

	/**
	 * 학생에게 등록된 기본·사용자 정의 과목을 화면 표시 순서로 조회합니다.
	 * 공통코드가 없는 과목은 사용자 정의 과목으로 구분하고 기본 과목 뒤에 배치합니다.
	 */
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

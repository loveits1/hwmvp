package org.loveits.hwmvp.user.service;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudentAccessService {

	private final JdbcClient jdbcClient;

	public StudentAccessService(JdbcClient jdbcClient) {
		this.jdbcClient = jdbcClient;
	}

	/** 로그인 사용자가 학생 본인이거나 승인된 연결 학부모인지 확인합니다. */
	public void checkCanManage(Long studentId, Long actorId) {
		boolean allowed = jdbcClient.sql("""
				SELECT EXISTS (
				    SELECT 1
				    FROM users actor
				    JOIN common_codes actor_role ON actor_role.id = actor.role_code_id
				    WHERE actor.id = :actorId
				      AND actor.is_enabled = true
				      AND (
				          (actor.id = :studentId AND actor_role.code = 'ROLE_STUDENT')
				          OR EXISTS (
				              SELECT 1
				              FROM parent_student_links link
				              JOIN common_codes status_code ON status_code.id = link.status_code_id
				              WHERE link.parent_id = actor.id
				                AND link.student_id = :studentId
				                AND status_code.code = 'LINK_APPROVED'
				          )
				      )
				)
				""")
				.param("actorId", actorId)
				.param("studentId", studentId)
				.query(Boolean.class)
				.single();
		if (!allowed) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 학생의 정보를 조회하거나 변경할 권한이 없습니다.");
		}
	}
}

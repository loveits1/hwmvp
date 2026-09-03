package org.loveits.hwmvp.user.repository;

import java.util.List;
import java.util.Optional;

import org.loveits.hwmvp.user.dto.FamilyLinkResponse;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class FamilyLinkRepository {

	private final JdbcClient jdbcClient;

	public FamilyLinkRepository(JdbcClient jdbcClient) {
		this.jdbcClient = jdbcClient;
	}

	public String findRole(Long userId) {
		return jdbcClient.sql("""
				SELECT role.code FROM users u JOIN common_codes role ON role.id = u.role_code_id WHERE u.id = :userId
				""").param("userId", userId).query(String.class).single();
	}

	public Optional<Long> findStudentIdByInviteCode(String inviteCode) {
		return jdbcClient.sql("""
				SELECT u.id FROM users u JOIN common_codes role ON role.id = u.role_code_id
				WHERE upper(u.invite_code) = upper(:inviteCode) AND role.code = 'ROLE_STUDENT' AND u.is_enabled = true
				""").param("inviteCode", inviteCode).query(Long.class).optional();
	}

	public Optional<String> findLinkStatus(Long parentId, Long studentId) {
		return jdbcClient.sql("""
				SELECT status.code FROM parent_student_links link
				JOIN common_codes status ON status.id = link.status_code_id
				WHERE link.parent_id = :parentId AND link.student_id = :studentId
				""").param("parentId", parentId).param("studentId", studentId).query(String.class).optional();
	}

	public void invite(Long parentId, Long studentId) {
		jdbcClient.sql("""
				INSERT INTO parent_student_links (parent_id, student_id, status_code_id)
				VALUES (:parentId, :studentId, (SELECT id FROM common_codes WHERE code = 'LINK_INVITED'))
				ON CONFLICT (parent_id, student_id) DO UPDATE
				SET status_code_id = (SELECT id FROM common_codes WHERE code = 'LINK_INVITED'), updated_at = CURRENT_TIMESTAMP
				""").param("parentId", parentId).param("studentId", studentId).update();
	}

	public List<FamilyLinkResponse> findLinks(Long userId, boolean student) {
		String ownerColumn = student ? "link.student_id" : "link.parent_id";
		String counterpartJoin = student ? "counterpart.id = link.parent_id" : "counterpart.id = link.student_id";
		String counterpartRole = student ? "parent" : "student";
		return jdbcClient.sql("""
				SELECT link.id, lower(replace(status.code, 'LINK_', '')) AS status,
				       counterpart.id AS counterpart_id, counterpart.login_id, counterpart.name, link.updated_at
				FROM parent_student_links link
				JOIN common_codes status ON status.id = link.status_code_id
				JOIN users counterpart ON %s
				WHERE %s = :userId
				ORDER BY CASE status.code WHEN 'LINK_INVITED' THEN 0 WHEN 'LINK_APPROVED' THEN 1 ELSE 2 END,
				         counterpart.name, link.id
				""".formatted(counterpartJoin, ownerColumn))
				.param("userId", userId)
				.query((rs, row) -> new FamilyLinkResponse(rs.getLong("id"), rs.getString("status"),
						rs.getLong("counterpart_id"), rs.getString("login_id"), rs.getString("name"),
						counterpartRole, rs.getObject("updated_at", java.time.OffsetDateTime.class)))
				.list();
	}

	public Optional<String> findInviteCode(Long studentId) {
		return jdbcClient.sql("SELECT invite_code FROM users WHERE id = :studentId")
				.param("studentId", studentId).query(String.class).optional();
	}

	public boolean inviteCodeExists(String code) {
		return jdbcClient.sql("SELECT count(*) FROM users WHERE upper(invite_code) = upper(:code)")
				.param("code", code).query(Long.class).single() > 0;
	}

	public void updateInviteCode(Long studentId, String code) {
		jdbcClient.sql("UPDATE users SET invite_code = :code, updated_at = CURRENT_TIMESTAMP WHERE id = :studentId")
				.param("code", code).param("studentId", studentId).update();
	}

	public Optional<LinkOwner> findLinkOwner(Long linkId) {
		return jdbcClient.sql("SELECT parent_id, student_id FROM parent_student_links WHERE id = :linkId")
				.param("linkId", linkId).query((rs, row) -> new LinkOwner(rs.getLong("parent_id"), rs.getLong("student_id"))).optional();
	}

	public void updateStatus(Long linkId, String statusCode) {
		jdbcClient.sql("""
				UPDATE parent_student_links SET status_code_id = (SELECT id FROM common_codes WHERE code = :statusCode),
				updated_at = CURRENT_TIMESTAMP WHERE id = :linkId
				""").param("statusCode", statusCode).param("linkId", linkId).update();
	}

	public record LinkOwner(Long parentId, Long studentId) {}
}

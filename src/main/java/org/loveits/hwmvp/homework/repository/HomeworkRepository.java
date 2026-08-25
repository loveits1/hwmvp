package org.loveits.hwmvp.homework.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.loveits.hwmvp.homework.dto.HomeworkResponse;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class HomeworkRepository {

	private static final String SELECT_HOMEWORK = """
			SELECT homework.id,
			       homework.student_id,
			       subject.id AS subject_id,
			       subject.name AS subject,
			       homework.title,
			       homework.description,
			       homework.due_date,
			       replace(progress_code.code, 'PROGRESS_', '')::integer AS progress,
			       lower(replace(creator_role.code, 'ROLE_', '')) AS created_by_role,
			       creator.name AS created_by_name,
			       updater.name AS updated_by_name,
			       homework.updated_at
			FROM homeworks homework
			JOIN subjects subject ON subject.id = homework.subject_id
			JOIN common_codes progress_code ON progress_code.id = homework.progress_code_id
			JOIN users creator ON creator.id = homework.created_by
			JOIN common_codes creator_role ON creator_role.id = creator.role_code_id
			JOIN users updater ON updater.id = homework.updated_by
			WHERE homework.is_deleted = false
			""";

	private final JdbcClient jdbcClient;

	public HomeworkRepository(JdbcClient jdbcClient) {
		this.jdbcClient = jdbcClient;
	}

	public List<HomeworkResponse> findAll(Long studentId, LocalDate date) {
		String dateCondition = date == null ? "" : " AND homework.due_date = :date";
		JdbcClient.StatementSpec statement = jdbcClient.sql(
				SELECT_HOMEWORK + " AND homework.student_id = :studentId" + dateCondition
						+ " ORDER BY homework.due_date, homework.id")
				.param("studentId", studentId);
		if (date != null) statement = statement.param("date", date);
		return statement.query(this::map).list();
	}

	public Optional<HomeworkResponse> findById(Long homeworkId) {
		return jdbcClient.sql(SELECT_HOMEWORK + " AND homework.id = :homeworkId")
				.param("homeworkId", homeworkId)
				.query(this::map)
				.optional();
	}

	public boolean canManage(Long studentId, Long actorId) {
		return jdbcClient.sql("""
				SELECT EXISTS (
				    SELECT 1
				    FROM users actor
				    JOIN common_codes actor_role ON actor_role.id = actor.role_code_id
				    WHERE actor.id = :actorId
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
	}

	public Long findOrCreateSubject(Long studentId, String name) {
		Optional<Long> existing = jdbcClient.sql("""
				SELECT id FROM subjects
				WHERE student_id = :studentId AND lower(name) = lower(:name)
				""")
				.param("studentId", studentId)
				.param("name", name)
				.query(Long.class)
				.optional();
		return existing.orElseGet(() -> jdbcClient.sql("""
				INSERT INTO subjects (student_id, name, description)
				VALUES (:studentId, :name, '사용자 정의 과목')
				RETURNING id
				""")
				.param("studentId", studentId)
				.param("name", name)
				.query(Long.class)
				.single());
	}

	public Long create(Long studentId, Long subjectId, String title, String description,
			LocalDate dueDate, Long actorId) {
		return jdbcClient.sql("""
				INSERT INTO homeworks (
				    student_id, subject_id, title, description, due_date,
				    progress_code_id, created_by, updated_by
				)
				VALUES (
				    :studentId, :subjectId, :title, :description, :dueDate,
				    (SELECT id FROM common_codes WHERE code = 'PROGRESS_0'),
				    :actorId, :actorId
				)
				RETURNING id
				""")
				.param("studentId", studentId)
				.param("subjectId", subjectId)
				.param("title", title)
				.param("description", description)
				.param("dueDate", dueDate)
				.param("actorId", actorId)
				.query(Long.class)
				.single();
	}

	public void update(Long homeworkId, Long subjectId, String title, String description,
			LocalDate dueDate, Long actorId) {
		jdbcClient.sql("""
				UPDATE homeworks
				SET subject_id = :subjectId,
				    title = :title,
				    description = :description,
				    due_date = :dueDate,
				    updated_by = :actorId,
				    updated_at = CURRENT_TIMESTAMP
				WHERE id = :homeworkId AND is_deleted = false
				""")
				.param("homeworkId", homeworkId)
				.param("subjectId", subjectId)
				.param("title", title)
				.param("description", description)
				.param("dueDate", dueDate)
				.param("actorId", actorId)
				.update();
	}

	public void updateProgress(Long homeworkId, int progress, Long actorId) {
		jdbcClient.sql("""
				UPDATE homeworks
				SET progress_code_id = (
				        SELECT id FROM common_codes WHERE code = :progressCode
				    ),
				    updated_by = :actorId,
				    updated_at = CURRENT_TIMESTAMP
				WHERE id = :homeworkId AND is_deleted = false
				""")
				.param("homeworkId", homeworkId)
				.param("progressCode", "PROGRESS_" + progress)
				.param("actorId", actorId)
				.update();
	}

	public void softDelete(Long homeworkId, Long actorId) {
		jdbcClient.sql("""
				UPDATE homeworks
				SET is_deleted = true,
				    deleted_by = :actorId,
				    deleted_at = CURRENT_TIMESTAMP,
				    updated_by = :actorId,
				    updated_at = CURRENT_TIMESTAMP
				WHERE id = :homeworkId AND is_deleted = false
				""")
				.param("homeworkId", homeworkId)
				.param("actorId", actorId)
				.update();
	}

	public String snapshot(Long homeworkId) {
		return jdbcClient.sql("SELECT to_jsonb(homework)::text FROM homeworks homework WHERE id = :homeworkId")
				.param("homeworkId", homeworkId)
				.query(String.class)
				.single();
	}

	public void addHistory(Long homeworkId, String actionCode, Long actorId,
			String beforeData, String afterData) {
		jdbcClient.sql("""
				INSERT INTO homework_histories (
				    homework_id, action_code_id, actor_id, before_data, after_data
				)
				VALUES (
				    :homeworkId,
				    (SELECT id FROM common_codes WHERE code = :actionCode),
				    :actorId,
				    CAST(:beforeData AS jsonb),
				    CAST(:afterData AS jsonb)
				)
				""")
				.param("homeworkId", homeworkId)
				.param("actionCode", actionCode)
				.param("actorId", actorId)
				.param("beforeData", beforeData)
				.param("afterData", afterData)
				.update();
	}

	private HomeworkResponse map(java.sql.ResultSet resultSet, int rowNumber) throws java.sql.SQLException {
		return new HomeworkResponse(
				resultSet.getLong("id"), resultSet.getLong("student_id"),
				resultSet.getLong("subject_id"), resultSet.getString("subject"),
				resultSet.getString("title"), resultSet.getString("description"),
				resultSet.getObject("due_date", LocalDate.class), resultSet.getInt("progress"),
				resultSet.getString("created_by_role"), resultSet.getString("created_by_name"),
				resultSet.getString("updated_by_name"),
				resultSet.getObject("updated_at", java.time.OffsetDateTime.class));
	}
}

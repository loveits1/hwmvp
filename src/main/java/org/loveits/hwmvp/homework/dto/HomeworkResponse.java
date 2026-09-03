package org.loveits.hwmvp.homework.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** 화면에 숙제와 과목, 진행률 및 최근 변경 정보를 전달하는 응답 모델입니다. */
public record HomeworkResponse(
		Long id,
		Long studentId,
		Long subjectId,
		String subject,
		String title,
		LocalDate assignedDate,
		LocalDate dueDate,
		int progress,
		int completedTaskCount,
		int totalTaskCount,
		List<HomeworkTaskResponse> tasks,
		String createdByRole,
		String createdByName,
		String updatedByName,
		OffsetDateTime updatedAt) {
}

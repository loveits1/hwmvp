package org.loveits.hwmvp.homework.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record HomeworkResponse(
		Long id,
		Long studentId,
		Long subjectId,
		String subject,
		String title,
		String description,
		LocalDate dueDate,
		int progress,
		String createdByRole,
		String createdByName,
		String updatedByName,
		OffsetDateTime updatedAt) {
}

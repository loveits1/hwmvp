package org.loveits.hwmvp.homework.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record HomeworkSaveRequest(
		@NotBlank @Size(max = 100) String subject,
		@NotBlank @Size(max = 200) String title,
		@Size(max = 2000) String description,
		@NotNull LocalDate dueDate,
		@NotNull Long actorId) {
}

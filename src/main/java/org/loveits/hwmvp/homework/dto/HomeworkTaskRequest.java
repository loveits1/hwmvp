package org.loveits.hwmvp.homework.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HomeworkTaskRequest(
		Long id,
		@NotBlank @Size(max = 500) String content) {
}

package org.loveits.hwmvp.homework.dto;

import jakarta.validation.constraints.NotNull;

public record HomeworkProgressRequest(
		@NotNull Integer progress,
		@NotNull Long actorId) {
}

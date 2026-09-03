package org.loveits.hwmvp.homework.dto;

import jakarta.validation.constraints.NotNull;

public record HomeworkTaskCompletionRequest(@NotNull Boolean completed) {
}

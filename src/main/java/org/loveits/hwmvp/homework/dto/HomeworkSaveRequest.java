package org.loveits.hwmvp.homework.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 숙제 등록과 수정에 공통으로 사용하는 입력값입니다. 작업 수행자는 서버 세션에서 확인합니다. */
public record HomeworkSaveRequest(
		@NotBlank @Size(max = 100) String subject,
		@NotBlank @Size(max = 200) String title,
		@Size(max = 2000) String description,
		@NotNull LocalDate assignedDate,
		@NotNull LocalDate dueDate) {
}

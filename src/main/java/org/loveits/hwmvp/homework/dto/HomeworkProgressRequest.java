package org.loveits.hwmvp.homework.dto;

import jakarta.validation.constraints.NotNull;

/** 숙제 진행률 변경 API의 입력값입니다. 변경 수행자는 서버 세션에서 확인합니다. */
public record HomeworkProgressRequest(
		@NotNull Integer progress) {
}

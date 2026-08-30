package org.loveits.hwmvp.homework.dto;

import jakarta.validation.constraints.NotNull;

/** 숙제 진행률 변경 API에서 진행률과 변경 수행자를 전달하는 요청 모델입니다. */
public record HomeworkProgressRequest(
		@NotNull Integer progress,
		@NotNull Long actorId) {
}

package org.loveits.hwmvp.subject.dto;

/** 화면의 과목 선택 목록에 필요한 과목 코드, 설명 및 사용자 정의 여부를 전달합니다. */
public record SubjectResponse(
		Long id,
		String code,
		String name,
		String description,
		boolean custom) {
}

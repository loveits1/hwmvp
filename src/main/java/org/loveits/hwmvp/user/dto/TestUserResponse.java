package org.loveits.hwmvp.user.dto;

/** 로그인 구현 전 화면 사용자 전환에 사용하는 테스트 사용자 응답 모델입니다. */
public record TestUserResponse(
		Long id,
		String loginId,
		String role,
		String name,
		String parentName,
		LinkedStudentResponse student) {

	/** 학부모 테스트 사용자와 연결된 대표 학생의 화면 표시 정보입니다. */
	public record LinkedStudentResponse(Long id, String loginId, String name) {
	}
}

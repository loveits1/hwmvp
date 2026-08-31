package org.loveits.hwmvp.auth.dto;

/** 로그인 후 화면에 필요한 현재 사용자와 관리 학생 정보입니다. */
public record CurrentUserResponse(
		Long id,
		String loginId,
		String role,
		String name,
		LinkedStudentResponse student) {

	public record LinkedStudentResponse(Long id, String loginId, String name) {
	}
}

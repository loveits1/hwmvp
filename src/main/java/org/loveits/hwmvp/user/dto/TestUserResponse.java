package org.loveits.hwmvp.user.dto;

public record TestUserResponse(
		Long id,
		String loginId,
		String role,
		String name,
		String parentName,
		LinkedStudentResponse student) {

	public record LinkedStudentResponse(Long id, String loginId, String name) {
	}
}

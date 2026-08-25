package org.loveits.hwmvp.subject.dto;

public record SubjectResponse(
		Long id,
		String code,
		String name,
		String description,
		boolean custom) {
}

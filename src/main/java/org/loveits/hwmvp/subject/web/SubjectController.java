package org.loveits.hwmvp.subject.web;

import java.util.List;

import org.loveits.hwmvp.auth.dto.AuthenticatedUser;
import org.loveits.hwmvp.subject.dto.SubjectResponse;
import org.loveits.hwmvp.subject.service.SubjectService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/students/{studentId}/subjects")
public class SubjectController {

	private final SubjectService service;

	public SubjectController(SubjectService service) {
		this.service = service;
	}

	/** 지정한 학생에게 등록된 과목 목록을 제공합니다. */
	@GetMapping
	public List<SubjectResponse> findByStudentId(
			@PathVariable Long studentId,
			@AuthenticationPrincipal AuthenticatedUser user) {
		return service.findByStudentId(studentId, user.id());
	}
}

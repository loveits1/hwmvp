package org.loveits.hwmvp.homework.web;

import java.time.LocalDate;
import java.util.List;

import org.loveits.hwmvp.auth.dto.AuthenticatedUser;
import org.loveits.hwmvp.homework.dto.HomeworkResponse;
import org.loveits.hwmvp.homework.dto.HomeworkSaveRequest;
import org.loveits.hwmvp.homework.dto.HomeworkTaskCompletionRequest;
import org.loveits.hwmvp.homework.service.HomeworkService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class HomeworkController {

	private final HomeworkService service;

	public HomeworkController(HomeworkService service) {
		this.service = service;
	}

	/** 학생의 전체 숙제 또는 특정 마감일의 숙제 목록을 제공합니다. */
	@GetMapping("/students/{studentId}/homeworks")
	public List<HomeworkResponse> findAll(
			@PathVariable Long studentId,
			@RequestParam(required = false) LocalDate date,
			@AuthenticationPrincipal AuthenticatedUser user) {
		return service.findAll(studentId, date, user.id());
	}

	/** 학생에게 숙제를 등록하고 생성된 숙제를 HTTP 201로 반환합니다. */
	@PostMapping("/students/{studentId}/homeworks")
	@ResponseStatus(HttpStatus.CREATED)
	public HomeworkResponse create(
			@PathVariable Long studentId,
			@Valid @RequestBody HomeworkSaveRequest request,
			@AuthenticationPrincipal AuthenticatedUser user) {
		return service.create(studentId, request, user.id());
	}

	/** 숙제의 과목, 제목, 상세내용과 마감일을 변경합니다. */
	@PatchMapping("/homeworks/{homeworkId}")
	public HomeworkResponse update(
			@PathVariable Long homeworkId,
			@Valid @RequestBody HomeworkSaveRequest request,
			@AuthenticationPrincipal AuthenticatedUser user) {
		return service.update(homeworkId, request, user.id());
	}

	/** 숙제를 소프트 삭제하고 응답 본문 없이 HTTP 204를 반환합니다. */
	@DeleteMapping("/homeworks/{homeworkId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(
			@PathVariable Long homeworkId,
			@AuthenticationPrincipal AuthenticatedUser user) {
		service.delete(homeworkId, user.id());
	}

	/** Task 체크 상태를 저장하고 Task 개수에서 다시 계산한 숙제 진행률을 반환합니다. */
	@PatchMapping("/homework-tasks/{taskId}/completion")
	public HomeworkResponse updateTaskCompletion(
			@PathVariable Long taskId,
			@Valid @RequestBody HomeworkTaskCompletionRequest request,
			@AuthenticationPrincipal AuthenticatedUser user) {
		return service.updateTaskCompletion(taskId, request, user.id());
	}
}

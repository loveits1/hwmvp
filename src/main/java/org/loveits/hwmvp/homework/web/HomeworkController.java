package org.loveits.hwmvp.homework.web;

import java.time.LocalDate;
import java.util.List;

import org.loveits.hwmvp.homework.dto.HomeworkResponse;
import org.loveits.hwmvp.homework.dto.HomeworkProgressRequest;
import org.loveits.hwmvp.homework.dto.HomeworkSaveRequest;
import org.loveits.hwmvp.homework.service.HomeworkService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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

	@GetMapping("/students/{studentId}/homeworks")
	public List<HomeworkResponse> findAll(
			@PathVariable Long studentId,
			@RequestParam(required = false) LocalDate date) {
		return service.findAll(studentId, date);
	}

	@PostMapping("/students/{studentId}/homeworks")
	@ResponseStatus(HttpStatus.CREATED)
	public HomeworkResponse create(
			@PathVariable Long studentId,
			@Valid @RequestBody HomeworkSaveRequest request) {
		return service.create(studentId, request);
	}

	@PatchMapping("/homeworks/{homeworkId}")
	public HomeworkResponse update(
			@PathVariable Long homeworkId,
			@Valid @RequestBody HomeworkSaveRequest request) {
		return service.update(homeworkId, request);
	}

	@DeleteMapping("/homeworks/{homeworkId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(
			@PathVariable Long homeworkId,
			@RequestParam Long actorId) {
		service.delete(homeworkId, actorId);
	}

	@PatchMapping("/homeworks/{homeworkId}/progress")
	public HomeworkResponse updateProgress(
			@PathVariable Long homeworkId,
			@Valid @RequestBody HomeworkProgressRequest request) {
		return service.updateProgress(homeworkId, request);
	}
}

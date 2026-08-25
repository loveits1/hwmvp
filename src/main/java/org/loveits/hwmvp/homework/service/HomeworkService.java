package org.loveits.hwmvp.homework.service;

import java.time.LocalDate;
import java.util.List;

import org.loveits.hwmvp.homework.dto.HomeworkResponse;
import org.loveits.hwmvp.homework.dto.HomeworkProgressRequest;
import org.loveits.hwmvp.homework.dto.HomeworkSaveRequest;
import org.loveits.hwmvp.homework.repository.HomeworkRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HomeworkService {
	private static final java.util.Set<Integer> ALLOWED_PROGRESS = java.util.Set.of(0, 25, 50, 75, 100);

	private final HomeworkRepository repository;

	public HomeworkService(HomeworkRepository repository) {
		this.repository = repository;
	}

	public List<HomeworkResponse> findAll(Long studentId, LocalDate date) {
		return repository.findAll(studentId, date);
	}

	@Transactional
	public HomeworkResponse create(Long studentId, HomeworkSaveRequest request) {
		checkAccess(studentId, request.actorId());
		Long subjectId = repository.findOrCreateSubject(studentId, request.subject().trim());
		Long homeworkId = repository.create(studentId, subjectId, request.title().trim(),
				nullIfBlank(request.description()), request.dueDate(), request.actorId());
		repository.addHistory(homeworkId, "HW_CREATED", request.actorId(), null,
				repository.snapshot(homeworkId));
		return find(homeworkId);
	}

	@Transactional
	public HomeworkResponse update(Long homeworkId, HomeworkSaveRequest request) {
		HomeworkResponse existing = find(homeworkId);
		checkAccess(existing.studentId(), request.actorId());
		String beforeData = repository.snapshot(homeworkId);
		Long subjectId = repository.findOrCreateSubject(existing.studentId(), request.subject().trim());
		repository.update(homeworkId, subjectId, request.title().trim(),
				nullIfBlank(request.description()), request.dueDate(), request.actorId());
		repository.addHistory(homeworkId, "HW_UPDATED", request.actorId(), beforeData,
				repository.snapshot(homeworkId));
		return find(homeworkId);
	}

	@Transactional
	public void delete(Long homeworkId, Long actorId) {
		HomeworkResponse existing = find(homeworkId);
		checkAccess(existing.studentId(), actorId);
		String beforeData = repository.snapshot(homeworkId);
		repository.softDelete(homeworkId, actorId);
		repository.addHistory(homeworkId, "HW_DELETED", actorId, beforeData,
				repository.snapshot(homeworkId));
	}

	@Transactional
	public HomeworkResponse updateProgress(Long homeworkId, HomeworkProgressRequest request) {
		if (!ALLOWED_PROGRESS.contains(request.progress())) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST, "진행률은 0, 25, 50, 75, 100 중 하나여야 합니다.");
		}
		HomeworkResponse existing = find(homeworkId);
		checkAccess(existing.studentId(), request.actorId());
		String beforeData = repository.snapshot(homeworkId);
		repository.updateProgress(homeworkId, request.progress(), request.actorId());
		repository.addHistory(homeworkId, "HW_PROGRESS_UPDATED", request.actorId(), beforeData,
				repository.snapshot(homeworkId));
		return find(homeworkId);
	}

	private HomeworkResponse find(Long homeworkId) {
		return repository.findById(homeworkId).orElseThrow(() ->
				new ResponseStatusException(HttpStatus.NOT_FOUND, "숙제를 찾을 수 없습니다."));
	}

	private void checkAccess(Long studentId, Long actorId) {
		if (!repository.canManage(studentId, actorId)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 학생의 숙제를 변경할 권한이 없습니다.");
		}
	}

	private String nullIfBlank(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}
}

package org.loveits.hwmvp.homework.service;

import java.time.LocalDate;
import java.util.List;

import org.loveits.hwmvp.homework.dto.HomeworkResponse;
import org.loveits.hwmvp.homework.dto.HomeworkProgressRequest;
import org.loveits.hwmvp.homework.dto.HomeworkSaveRequest;
import org.loveits.hwmvp.homework.repository.HomeworkRepository;
import org.loveits.hwmvp.user.service.StudentAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HomeworkService {
	private static final java.util.Set<Integer> ALLOWED_PROGRESS = java.util.Set.of(0, 25, 50, 75, 100);

	private final HomeworkRepository repository;
	private final StudentAccessService accessService;

	public HomeworkService(HomeworkRepository repository, StudentAccessService accessService) {
		this.repository = repository;
		this.accessService = accessService;
	}

	/** 학생과 선택 날짜를 기준으로 화면에 표시할 숙제 목록을 조회합니다. */
	public List<HomeworkResponse> findAll(Long studentId, LocalDate date, Long actorId) {
		checkAccess(studentId, actorId);
		return repository.findAll(studentId, date);
	}

	/**
	 * 작업자의 권한을 확인한 뒤 과목과 숙제를 생성하고 생성 이력을 함께 저장합니다.
	 * 모든 DB 변경은 하나의 트랜잭션으로 처리됩니다.
	 */
	@Transactional
	public HomeworkResponse create(Long studentId, HomeworkSaveRequest request, Long actorId) {
		checkAccess(studentId, actorId);
		checkDates(request.assignedDate(), request.dueDate());
		Long subjectId = repository.findOrCreateSubject(studentId, request.subject().trim());
		Long homeworkId = repository.create(studentId, subjectId, request.title().trim(),
				nullIfBlank(request.description()), request.assignedDate(), request.dueDate(), actorId);
		repository.addHistory(homeworkId, "HW_CREATED", actorId, null,
				repository.snapshot(homeworkId));
		return find(homeworkId);
	}

	/**
	 * 기존 숙제와 권한을 확인한 뒤 내용을 수정하고 변경 전후 이력을 저장합니다.
	 */
	@Transactional
	public HomeworkResponse update(Long homeworkId, HomeworkSaveRequest request, Long actorId) {
		HomeworkResponse existing = find(homeworkId);
		checkAccess(existing.studentId(), actorId);
		checkDates(request.assignedDate(), request.dueDate());
		String beforeData = repository.snapshot(homeworkId);
		Long subjectId = repository.findOrCreateSubject(existing.studentId(), request.subject().trim());
		repository.update(homeworkId, subjectId, request.title().trim(),
				nullIfBlank(request.description()), request.assignedDate(), request.dueDate(), actorId);
		repository.addHistory(homeworkId, "HW_UPDATED", actorId, beforeData,
				repository.snapshot(homeworkId));
		return find(homeworkId);
	}

	/** 숙제를 소프트 삭제하고 삭제 직전과 직후 상태를 이력으로 남깁니다. */
	@Transactional
	public void delete(Long homeworkId, Long actorId) {
		HomeworkResponse existing = find(homeworkId);
		checkAccess(existing.studentId(), actorId);
		String beforeData = repository.snapshot(homeworkId);
		repository.softDelete(homeworkId, actorId);
		repository.addHistory(homeworkId, "HW_DELETED", actorId, beforeData,
				repository.snapshot(homeworkId));
	}

	/**
	 * 허용된 진행률인지 검증하고 권한 확인 후 진행률과 변경 이력을 저장합니다.
	 */
	@Transactional
	public HomeworkResponse updateProgress(Long homeworkId, HomeworkProgressRequest request, Long actorId) {
		if (!ALLOWED_PROGRESS.contains(request.progress())) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST, "진행률은 0, 25, 50, 75, 100 중 하나여야 합니다.");
		}
		HomeworkResponse existing = find(homeworkId);
		checkAccess(existing.studentId(), actorId);
		String beforeData = repository.snapshot(homeworkId);
		repository.updateProgress(homeworkId, request.progress(), actorId);
		repository.addHistory(homeworkId, "HW_PROGRESS_UPDATED", actorId, beforeData,
				repository.snapshot(homeworkId));
		return find(homeworkId);
	}

	/** 숙제 한 건을 조회하고 없으면 API의 404 오류로 변환합니다. */
	private HomeworkResponse find(Long homeworkId) {
		return repository.findById(homeworkId).orElseThrow(() ->
				new ResponseStatusException(HttpStatus.NOT_FOUND, "숙제를 찾을 수 없습니다."));
	}

	/** 작업자에게 학생 숙제 변경 권한이 없으면 API의 403 오류를 발생시킵니다. */
	private void checkAccess(Long studentId, Long actorId) {
		accessService.checkCanManage(studentId, actorId);
	}

	/** 마감일이 숙제 배정일보다 빠른 잘못된 날짜 조합을 거부합니다. */
	private void checkDates(LocalDate assignedDate, LocalDate dueDate) {
		if (dueDate.isBefore(assignedDate)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "마감일은 숙제 선택일보다 빠를 수 없습니다.");
		}
	}

	/** 선택 입력값의 앞뒤 공백을 제거하고 빈 문자열은 DB 저장용 {@code null}로 변환합니다. */
	private String nullIfBlank(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}
}

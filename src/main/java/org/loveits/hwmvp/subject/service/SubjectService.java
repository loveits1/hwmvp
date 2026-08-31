package org.loveits.hwmvp.subject.service;

import java.util.List;

import org.loveits.hwmvp.subject.dto.SubjectResponse;
import org.loveits.hwmvp.subject.repository.SubjectQueryRepository;
import org.loveits.hwmvp.user.service.StudentAccessService;
import org.springframework.stereotype.Service;

@Service
public class SubjectService {

	private final SubjectQueryRepository repository;
	private final StudentAccessService accessService;

	public SubjectService(SubjectQueryRepository repository, StudentAccessService accessService) {
		this.repository = repository;
		this.accessService = accessService;
	}

	/** 학생의 숙제 입력 화면에서 선택할 과목 목록을 조회합니다. */
	public List<SubjectResponse> findByStudentId(Long studentId, Long actorId) {
		accessService.checkCanManage(studentId, actorId);
		return repository.findByStudentId(studentId);
	}
}

package org.loveits.hwmvp.subject.service;

import java.util.List;

import org.loveits.hwmvp.subject.dto.SubjectResponse;
import org.loveits.hwmvp.subject.repository.SubjectQueryRepository;
import org.springframework.stereotype.Service;

@Service
public class SubjectService {

	private final SubjectQueryRepository repository;

	public SubjectService(SubjectQueryRepository repository) {
		this.repository = repository;
	}

	/** 학생의 숙제 입력 화면에서 선택할 과목 목록을 조회합니다. */
	public List<SubjectResponse> findByStudentId(Long studentId) {
		return repository.findByStudentId(studentId);
	}
}

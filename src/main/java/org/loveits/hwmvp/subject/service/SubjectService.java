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

	public List<SubjectResponse> findByStudentId(Long studentId) {
		return repository.findByStudentId(studentId);
	}
}

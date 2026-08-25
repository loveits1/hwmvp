package org.loveits.hwmvp.user.service;

import java.util.List;
import java.util.Locale;

import org.loveits.hwmvp.user.dto.TestUserResponse;
import org.loveits.hwmvp.user.repository.TestUserQueryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TestUserService {

	private final TestUserQueryRepository repository;

	public TestUserService(TestUserQueryRepository repository) {
		this.repository = repository;
	}

	public List<TestUserResponse> findAll(String role) {
		if (role == null || role.isBlank()) {
			return List.of(repository.findStudents(), repository.findParents())
					.stream()
					.flatMap(List::stream)
					.toList();
		}

		return switch (role.toLowerCase(Locale.ROOT)) {
			case "student" -> repository.findStudents();
			case "parent" -> repository.findParents();
			default -> throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST,
					"role은 student 또는 parent만 사용할 수 있습니다.");
		};
	}
}

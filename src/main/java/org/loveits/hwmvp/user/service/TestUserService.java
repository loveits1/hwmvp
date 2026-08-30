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

	/**
	 * 화면 전환용 테스트 사용자를 조회하고 선택적으로 학생 또는 학부모만 반환합니다.
	 * 지원하지 않는 역할값은 잘못된 API 요청으로 처리합니다.
	 */
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

package org.loveits.hwmvp.user.web;

import java.util.List;

import org.loveits.hwmvp.user.dto.TestUserResponse;
import org.loveits.hwmvp.user.service.TestUserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test-users")
public class TestUserController {

	private final TestUserService service;

	public TestUserController(TestUserService service) {
		this.service = service;
	}

	@GetMapping
	public List<TestUserResponse> findAll(
			@RequestParam(required = false) String role) {
		return service.findAll(role);
	}
}

package org.loveits.hwmvp.auth.web;

import java.util.Map;

import org.loveits.hwmvp.auth.dto.AuthenticatedUser;
import org.loveits.hwmvp.auth.dto.CurrentUserResponse;
import org.loveits.hwmvp.auth.dto.LoginRequest;
import org.loveits.hwmvp.auth.repository.AuthRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthenticationManager authenticationManager;
	private final SecurityContextRepository securityContextRepository;
	private final AuthRepository repository;

	public AuthController(AuthenticationManager authenticationManager,
			SecurityContextRepository securityContextRepository,
			AuthRepository repository) {
		this.authenticationManager = authenticationManager;
		this.securityContextRepository = securityContextRepository;
		this.repository = repository;
	}

	/** 로그인 전후의 변경 요청에 사용할 CSRF 토큰을 발급합니다. */
	@GetMapping("/csrf")
	public Map<String, String> csrf(CsrfToken token) {
		return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
	}

	/** 아이디와 비밀번호를 검증하고 인증 정보를 서버 HTTP 세션에 저장합니다. */
	@PostMapping("/login")
	public CurrentUserResponse login(
			@Valid @RequestBody LoginRequest request,
			HttpServletRequest httpRequest,
			HttpServletResponse httpResponse) {
		try {
			Authentication authentication = authenticationManager.authenticate(
					UsernamePasswordAuthenticationToken.unauthenticated(request.loginId(), request.password()));
			if (httpRequest.getSession(false) != null) httpRequest.changeSessionId();

			SecurityContext context = SecurityContextHolder.createEmptyContext();
			context.setAuthentication(authentication);
			SecurityContextHolder.setContext(context);
			securityContextRepository.saveContext(context, httpRequest, httpResponse);

			AuthenticatedUser user = (AuthenticatedUser) authentication.getPrincipal();
			repository.recordLoginSuccess(user.id());
			return repository.findCurrentUser(user.id());
		} catch (org.springframework.security.core.AuthenticationException exception) {
			repository.recordLoginFailure(request.loginId());
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
		}
	}

	/** 서버 세션과 브라우저 세션 쿠키를 무효화해 현재 사용자를 로그아웃합니다. */
	@PostMapping("/logout")
	public void logout(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
		new SecurityContextLogoutHandler().logout(request, response, authentication);
	}

	/** 새로고침 시 서버 세션에 로그인된 사용자와 관리 학생 정보를 반환합니다. */
	@GetMapping("/me")
	public CurrentUserResponse me(@org.springframework.security.core.annotation.AuthenticationPrincipal AuthenticatedUser user) {
		if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
		return repository.findCurrentUser(user.id());
	}
}

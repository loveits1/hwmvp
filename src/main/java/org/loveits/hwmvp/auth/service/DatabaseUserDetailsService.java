package org.loveits.hwmvp.auth.service;

import org.loveits.hwmvp.auth.repository.AuthRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class DatabaseUserDetailsService implements UserDetailsService {

	private final AuthRepository repository;

	public DatabaseUserDetailsService(AuthRepository repository) {
		this.repository = repository;
	}

	@Override
	public UserDetails loadUserByUsername(String username) {
		return repository.findByLoginId(username.trim())
				.orElseThrow(() -> new UsernameNotFoundException("아이디 또는 비밀번호가 올바르지 않습니다."));
	}
}

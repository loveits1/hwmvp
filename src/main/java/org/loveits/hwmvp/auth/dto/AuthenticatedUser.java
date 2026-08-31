package org.loveits.hwmvp.auth.dto;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** 서버 세션에 저장되어 요청자의 사용자 ID와 역할을 신뢰할 수 있게 제공하는 인증 주체입니다. */
public record AuthenticatedUser(
		Long id,
		String loginId,
		String name,
		String roleCode,
		String password,
		boolean enabled,
		boolean accountNonLocked) implements UserDetails {

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return List.of(new SimpleGrantedAuthority(roleCode));
	}

	@Override
	public String getUsername() {
		return loginId;
	}

	@Override
	public String getPassword() {
		return password;
	}

	@Override
	public boolean isAccountNonExpired() {
		return true;
	}

	@Override
	public boolean isCredentialsNonExpired() {
		return true;
	}

	@Override
	public boolean isEnabled() {
		return enabled;
	}

	@Override
	public boolean isAccountNonLocked() {
		return accountNonLocked;
	}
}

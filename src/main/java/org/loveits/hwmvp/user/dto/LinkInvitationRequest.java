package org.loveits.hwmvp.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LinkInvitationRequest(
		@NotBlank
		@Pattern(regexp = "^[A-Za-z0-9]{8}$", message = "연결 코드는 영문과 숫자 8자리여야 합니다.")
		String inviteCode) {
}

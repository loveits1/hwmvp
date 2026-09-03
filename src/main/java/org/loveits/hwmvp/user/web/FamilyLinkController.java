package org.loveits.hwmvp.user.web;

import java.util.Map;

import org.loveits.hwmvp.auth.dto.AuthenticatedUser;
import org.loveits.hwmvp.user.dto.FamilyLinksResponse;
import org.loveits.hwmvp.user.dto.LinkInvitationRequest;
import org.loveits.hwmvp.user.service.FamilyLinkService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/family-links")
public class FamilyLinkController {
	private final FamilyLinkService service;
	public FamilyLinkController(FamilyLinkService service) { this.service = service; }

	@GetMapping
	public FamilyLinksResponse findAll(@AuthenticationPrincipal AuthenticatedUser user) { return service.findAll(user.id()); }

	@PostMapping("/invitations")
	@ResponseStatus(HttpStatus.CREATED)
	public void invite(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody LinkInvitationRequest request) {
		service.invite(user.id(), request.inviteCode());
	}

	@PatchMapping("/{linkId}/approve")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void approve(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long linkId) { service.approve(user.id(), linkId); }

	@DeleteMapping("/{linkId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void disconnect(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long linkId) { service.disconnect(user.id(), linkId); }

	@PostMapping("/invite-code/regenerate")
	public Map<String, String> regenerate(@AuthenticationPrincipal AuthenticatedUser user) {
		return Map.of("inviteCode", service.regenerateInviteCode(user.id()));
	}
}

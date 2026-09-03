package org.loveits.hwmvp.user.service;

import java.security.SecureRandom;

import org.loveits.hwmvp.user.dto.FamilyLinksResponse;
import org.loveits.hwmvp.user.repository.FamilyLinkRepository;
import org.loveits.hwmvp.user.repository.FamilyLinkRepository.LinkOwner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FamilyLinkService {

	private static final Logger log = LoggerFactory.getLogger(FamilyLinkService.class);
	private static final char[] CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
	private final SecureRandom secureRandom = new SecureRandom();
	private final FamilyLinkRepository repository;

	public FamilyLinkService(FamilyLinkRepository repository) {
		this.repository = repository;
	}

	public FamilyLinksResponse findAll(Long userId) {
		boolean student = isStudent(userId);
		return new FamilyLinksResponse(student ? repository.findInviteCode(userId).orElse(null) : null,
				repository.findLinks(userId, student));
	}

	@Transactional
	public void invite(Long parentId, String inviteCode) {
		requireRole(parentId, "ROLE_PARENT");
		Long studentId = repository.findStudentIdByInviteCode(inviteCode.trim())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "유효한 학생 연결 코드를 찾을 수 없습니다."));
		if ("LINK_APPROVED".equals(repository.findLinkStatus(parentId, studentId).orElse(null)))
			throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 연결된 학생입니다.");
		repository.invite(parentId, studentId);
		log.info("Family link invitation requested: parentId={}, studentId={}", parentId, studentId);
	}

	@Transactional
	public void approve(Long studentId, Long linkId) {
		requireRole(studentId, "ROLE_STUDENT");
		LinkOwner owner = ownedLink(studentId, linkId);
		String status = repository.findLinkStatus(owner.parentId(), owner.studentId()).orElse(null);
		if (!"LINK_INVITED".equals(status)) throw new ResponseStatusException(HttpStatus.CONFLICT, "승인 대기 중인 요청이 아닙니다.");
		repository.updateStatus(linkId, "LINK_APPROVED");
		log.info("Family link approved: linkId={}, studentId={}", linkId, studentId);
	}

	@Transactional
	public void disconnect(Long userId, Long linkId) {
		LinkOwner owner = repository.findLinkOwner(linkId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "연결 정보를 찾을 수 없습니다."));
		if (!owner.parentId().equals(userId) && !owner.studentId().equals(userId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
		repository.updateStatus(linkId, "LINK_DISCONNECTED");
		log.info("Family link disconnected: linkId={}, actorId={}", linkId, userId);
	}

	@Transactional
	public String regenerateInviteCode(Long studentId) {
		requireRole(studentId, "ROLE_STUDENT");
		String code;
		do { code = randomCode(); } while (repository.inviteCodeExists(code));
		repository.updateInviteCode(studentId, code);
		log.info("Student invite code regenerated: studentId={}", studentId);
		return code;
	}

	private LinkOwner ownedLink(Long studentId, Long linkId) {
		LinkOwner owner = repository.findLinkOwner(linkId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "연결 정보를 찾을 수 없습니다."));
		if (!owner.studentId().equals(studentId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
		return owner;
	}

	private boolean isStudent(Long userId) { return "ROLE_STUDENT".equals(repository.findRole(userId)); }
	private void requireRole(Long userId, String role) {
		if (!role.equals(repository.findRole(userId))) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
	}
	private String randomCode() {
		StringBuilder code = new StringBuilder(8);
		for (int index = 0; index < 8; index++) code.append(CODE_CHARACTERS[secureRandom.nextInt(CODE_CHARACTERS.length)]);
		return code.toString();
	}
}

package org.loveits.hwmvp.user.dto;

import java.time.OffsetDateTime;

public record FamilyLinkResponse(
		Long id,
		String status,
		Long counterpartId,
		String counterpartLoginId,
		String counterpartName,
		String counterpartRole,
		OffsetDateTime updatedAt) {
}

package org.loveits.hwmvp.user.dto;

import java.util.List;

public record FamilyLinksResponse(String inviteCode, List<FamilyLinkResponse> links) {
}

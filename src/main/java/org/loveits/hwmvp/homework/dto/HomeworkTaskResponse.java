package org.loveits.hwmvp.homework.dto;

public record HomeworkTaskResponse(Long id, String content, boolean completed, int sortOrder) {
}

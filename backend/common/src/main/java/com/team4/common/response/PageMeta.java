package com.team4.common.response;

import lombok.Getter;
import org.springframework.data.domain.Page;

import java.util.List;

// 페이징 목록 공통 응답
@Getter
public class PageMeta<T> {

    private final List<T> content;
    private final int page;
    private final int size;
    private final long totalElements;
    private final int totalPages;
    private final boolean last;

    private PageMeta(List<T> content, int page, int size, long totalElements, int totalPages, boolean last) {
        this.content = content;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.last = last;
    }

    public static <T> PageMeta<T> from(Page<T> page) {
        return new PageMeta<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast()
        );
    }
}

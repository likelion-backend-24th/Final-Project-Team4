package com.team4.expo.dto;

import com.team4.expo.domain.Post;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class BoothContentResponse {

    private final Long postId;
    private final Long boothId;
    private final String title;
    private final String content;
    private final LocalDateTime updatedAt;

    public BoothContentResponse(Long postId, Long boothId, String title, String content, LocalDateTime updatedAt) {
        this.postId = postId;
        this.boothId = boothId;
        this.title = title;
        this.content = content;
        this.updatedAt = updatedAt;
    }

    public static BoothContentResponse from(Post post) {
        return new BoothContentResponse(
                post.getId(),
                post.getBooth().getId(),
                post.getTitle(),
                post.getContent(),
                post.getUpdatedAt()
        );
    }
}

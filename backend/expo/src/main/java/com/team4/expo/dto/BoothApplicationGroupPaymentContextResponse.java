package com.team4.expo.dto;

import com.team4.expo.domain.ApplicationStatus;
import com.team4.expo.domain.BoothApplication;
import com.team4.expo.domain.BoothApplicationGroup;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Getter;

// Payment -> Expo 내부 API 응답.
@Getter
public class BoothApplicationGroupPaymentContextResponse {

    private final boolean reviewComplete;
    private final Long applicantId;
    private final List<Item> items;
    private final long totalAmount;

    public BoothApplicationGroupPaymentContextResponse(boolean reviewComplete, Long applicantId, List<Item> items, long totalAmount) {
        this.reviewComplete = reviewComplete;
        this.applicantId = applicantId;
        this.items = items;
        this.totalAmount = totalAmount;
    }

    // 그룹 내 심사 대기(SUBMITTED)가 하나도 안 남아야 reviewComplete=true.
    // true일 때만 승인(PAYMENT_PENDING)된 부스를 items에 담아 반환 — 반려 건은 제외.
    public static BoothApplicationGroupPaymentContextResponse of(BoothApplicationGroup group, List<BoothApplication> applications) {
        boolean reviewComplete = applications.stream().noneMatch(a -> a.getStatus() == ApplicationStatus.SUBMITTED);

        List<Item> items = reviewComplete
                ? applications.stream()
                        .filter(a -> a.getStatus() == ApplicationStatus.PAYMENT_PENDING)
                        .map(a -> new Item(a.getId(), a.getBooth().getId(), a.getBooth().getFee()))
                        .collect(Collectors.toList())
                : List.of();

        long totalAmount = items.stream().mapToLong(Item::getAmount).sum();

        return new BoothApplicationGroupPaymentContextResponse(reviewComplete, group.getExhibitorId(), items, totalAmount);
    }

    @Getter
    public static class Item {
        private final Long applicationId;
        private final Long boothId;
        private final long amount;

        public Item(Long applicationId, Long boothId, long amount) {
            this.applicationId = applicationId;
            this.boothId = boothId;
            this.amount = amount;
        }
    }
}

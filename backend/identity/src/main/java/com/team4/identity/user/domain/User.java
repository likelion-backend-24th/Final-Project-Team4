package com.team4.identity.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 60)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "business_no", unique = true, length = 32)
    private String businessNo; // 사업자등록번호

    @Column(name = "company_name")
    private String companyName; // 상호명

    @Column(name = "manager_name", length = 100)
    private String managerName; // 담당자 이름

    @Column(length = 32)
    private String contact; // 연락처 (참가업체 담당자 / 일반회원 전화번호 공용)

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "company_address")
    private String companyAddress; // 업체주소

    @Column(length = 100)
    private String industry; // 업종

    @Column(name = "representative_name", length = 100)
    private String representativeName; // 대표자명

    @Column(name = "company_contact", length = 32)
    private String companyContact; // 업체 대표 연락처

    @Column(length = 100)
    private String name; // 일반회원 이름

    private User(String email, String passwordHash, Role role) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.status = UserStatus.ACTIVE;
    }

    public static User createMember(String email, String passwordHash, String name, String phone) {
        User user = new User(email, passwordHash, Role.USER);
        user.name = name;
        user.contact = phone;
        return user;
    }

    public static User createExhibitor(String email, String passwordHash, String businessNo,
                                       String companyName, String managerName, String contact,
                                       String companyAddress, String industry,
                                       String representativeName, String companyContact) {
        User user = new User(email, passwordHash, Role.EXHIBITOR);
        user.businessNo = businessNo;
        user.companyName = companyName;
        user.managerName = managerName;
        user.contact = contact;
        user.companyAddress = companyAddress;
        user.industry = industry;
        user.representativeName = representativeName;
        user.companyContact = companyContact;
        return user;
    }

    public static User createAdmin(String email, String passwordHash) {
        return new User(email, passwordHash, Role.ADMIN);
    }

    // 비밀번호 재설정 시 해시 교체
    public void updatePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    // 회원 탈퇴(soft delete)
    public void withdraw() {
        this.status = UserStatus.WITHDRAWN;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

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
    private String contact; // 담당자 연락처

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

    private User(String email, String passwordHash, Role role) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.status = UserStatus.ACTIVE;
    }

    public static User createMember(String email, String passwordHash) {
        return new User(email, passwordHash, Role.USER);
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

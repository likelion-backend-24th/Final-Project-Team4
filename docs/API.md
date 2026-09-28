# API

---

## 1. 공통 규약

| 항목 | 계약 |
| --- | --- |
| 인증 | `Authorization: Bearer <AccessToken>` (JWT). Gateway가 서명·만료를 검증하고 토큰의 `sub`·`role`을 `X-User-Id`·`X-User-Role`로 주입하며, **클라이언트가 보낸 동일 헤더는 항상 제거**한다. 토큰 없이 보호 경로 접근 또는 검증 실패는 Gateway가 `401`. 화이트리스트(`/api/auth/**`, `OPTIONS` preflight)는 토큰 없이 통과. 하위 Service(expo·payment)는 Spring Security로 주입된 헤더를 SecurityContext의 `Authentication`(권한 `ROLE_<role>`)으로 매핑하고, 경로 규칙(`/api/admin/**`→`ADMIN`, `/api/exhibitor/**`→`EXHIBITOR`)으로 인가한다. Service는 사용자가 보낸 신원 정보를 신뢰하지 않는다. |
| 인가 실패 응답 | 미인증 `401 UNAUTHENTICATED`, 역할 불일치 `403 FORBIDDEN`. Gateway·Service 모두 공통 실패 Envelope로 응답(Service는 `common`의 `ObjectMapperWriter`로 시큐리티 레이어 응답을 통일). |
| CORS | 브라우저 허용 origin은 Gateway `globalcors` 한 곳에서 관리(`http://localhost:5173`, `http://localhost:3000`, `allowCredentials: true`). 하위 Service는 CORS 설정 없음(Gateway 서버-서버 트래픽만 수신). |
| 성공 Envelope | `200/201` + `{ "data": <payload> }` |
| 실패 Envelope | `{ "error": { "code": "STRING", "message": "STRING", "traceId": "STRING" } }` |
| 오류 code | `VALIDATION_ERROR` / `UNAUTHENTICATED` / `FORBIDDEN` / `NOT_FOUND` / `INVALID_STATE` / `DUPLICATE` / `PAYMENT_EXPIRED` / `DEPENDENCY_TIMEOUT` |
| Trace ID | `X-Trace-Id` 요청 헤더. 없으면 Gateway가 생성, 모든 하위 호출·로그·응답에 전파. |
| 시간·Timezone | 저장·전송은 ISO-8601(`2026-09-01T04:00:00`), 표시는 KST. |
| 멱등성 | 상태 변경 요청은 `Idempotency-Key` 헤더 허용. 같은 Key 재요청은 최초 결과를 반환(신규 처리 없음). 대상: `approveBoothApplication`, `rejectBoothApplication`, `createBoothPayment`, `approveBoothPayment`, 내부 `confirmBoothApplicationGroup`. |
| 401 Header | 모든 401 응답에 `WWW-Authenticate: Bearer` 포함 |
| 페이지네이션 | `?page=0&size=20`, 응답 `{ "data": { "content": [...], "page", "size", "totalElements", "totalPages", "last" } }` |
| 내부 API | `/internal/**`. Gateway·외부 OpenAPI에 노출하지 않음. 호출 관계별 환경 변수 Bearer Token(`service.token.<caller>`)으로 허용 Service 확인. |
| Timeout | 모든 서비스 간 호출에 연결 Timeout·응답 Timeout 명시. Dependency 결과를 확인 못 하면 권한·거래를 성공으로 열지 않는다(fail-closed / `202` 보류). |
| 비밀번호 | BCrypt Work Factor 12. 원문·Hash를 응답·일반 로그에 출력 금지. |

**판정 순서(권한매트릭스 준수):** 인증 유효성 → Role → Resource 존재·소유 → 업무 상태 → Dependency 결과 → 허용 또는 안전한 실패. Dependency 장애를 권한 없음(403)으로 오인시키지 않는다.

---

## 2. 외부 HTTP 계약 (`/api/**`, Gateway 경유)

### 2.1 인증 (Identity)

### `signUp` — `POST /api/auth/signup`

| 항목 | 정의 |
| --- | --- |
| Owner | Identity |
| 관련 Story·시나리오 | US12 일반회원 회원가입. |
| Request | `{ email, password, name, phone }`. `password` 8~64자 |
| 정상 | `201` 본문 `{ "data": null }`. 이메일 미중복이면 `USER` 계정 생성. 클라이언트는 로그인 화면으로 이동해 `signIn` 호출. |
| 실패 | 이메일 중복 `409 DUPLICATE` · 이메일 형식 오류·`password` 8자 미만·필수값 누락 `400 VALIDATION_ERROR` |
| 보안 | 비인증 허용. 비밀번호 BCrypt(work factor 12). 비밀번호·토큰 미노출. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### `signUpExhibitor` — `POST /api/auth/exhibitors/signup`

| 항목 | 정의 |
| --- | --- |
| Owner | Identity |
| 관련 Story·시나리오 | US2 참가업체 회원가입 |
| Request | `{ businessNo, password, email, companyName, managerName, contact }`. `businessNo` 형식 `^\d{3}-?\d{2}-?\d{5}$`(하이픈 유무 무관, 서버 정규화) · `password` 8~64자 · email·이름은 담당자 |
| 정상 | `201` 본문 `{ "data": null }`(직렬화 시 `{}`). 사업자 인증(Mock: 정규화 후 10자리 숫자) 통과 시 `EXHIBITOR` 계정 생성. userId 미노출, 클라이언트는 로그인 화면으로 이동해 `signIn` 호출. |
| 실패 | 사업자 번호 형식/인증 실패 `400 VALIDATION_ERROR`(계정 미생성) · 이메일 중복 `409 DUPLICATE` · 사업자 번호 중복(같은 업체 재가입) `409 DUPLICATE` · 필수값 누락 `400` |
| 보안 | 비인증 허용. 비밀번호 BCrypt(work factor 12). **연락처 암호화 미구현 — 현재 `contact_enc` 컬럼에 평문 저장, 후속 보완 필요.** 비밀번호·토큰 미노출. |
| 상태 | IMPLEMENTED (Sprint 1) |
| 추가·변경 Sprint | Sprint 1 |

### `signIn` — `POST /api/auth/signin`

| 항목 | 정의 |
| --- | --- |
| Owner | Identity |
| 관련 Story·시나리오 | 관리자 Seed 계정 로그인(Sprint 1) · 참가업체 로그인(US2) · 일반회원 로그인(US12, Sprint 2) |
| Request | `{ email, password }` |
| 정상 | `200` body `{ accessToken, tokenType: "Bearer", expiresIn, role }` (`expiresIn` = accessToken 만료까지 초, 현재 900) + `Set-Cookie: refreshToken` (HttpOnly). `role`은 계정 유형에 따라 `USER` / `EXHIBITOR` / `ADMIN`. |
| 실패 | 자격 불일치 `401 UNAUTHENTICATED` + `WWW-Authenticate: Bearer` (이메일 존재 여부 노출 금지) · 필수값 누락 `400` |
| 보안 | 비인증 허용. 응답·로그에 비밀번호·토큰 원문 로깅 금지. |
| 상태 | IMPLEMENTED (Sprint 1) |
| 추가·변경 Sprint | Sprint 1 (Sprint 1 Review에서 참가업체 로그인을 이 경로로 통합) |

### `refresh` — `POST /api/auth/refresh`

| 항목 | 정의 |
| --- | --- |
| Owner | Identity |
| 관련 Story·시나리오 | 로그인 유지 |
| Request | `Cookie: refreshToken=...` (body 없음) |
| 정상 | `200` body `{ accessToken, tokenType: "Bearer", expiresIn, role }` + `Set-Cookie: refreshToken` (회전된 새 토큰). Redis 갱신, 이전 refreshToken은 무효(access·refresh 둘 다 재발급 — Refresh Token Rotation). |
| 실패 | 쿠키 없음·서명·형식·만료 오류, Redis에 저장된 값과 불일치(폐기·재사용) `401 UNAUTHENTICATED` + `WWW-Authenticate: Bearer` |
| 보안 | 비인증 허용(refreshToken 쿠키 자체가 자격). 토큰 원문 로깅 금지. |
| 상태 | IMPLEMENTED (Sprint 1) |
| 추가·변경 Sprint | Sprint 1 |

### `logout` — `POST /api/auth/logout`

| 항목 | 정의 |
| --- | --- |
| Owner | Identity |
| 관련 Story·시나리오 | 로그아웃 |
| Request | `Cookie: refreshToken=...` (body 없음, 쿠키 없어도 허용) |
| 정상 | `200` + `Set-Cookie: refreshToken=; Max-Age=0` (쿠키 삭제). Redis의 refreshToken 폐기. 토큰이 이미 무효·부재여도 `200`(멱등). accessToken은 만료까지 유효(짧은 TTL). |
| 실패 | 없음(멱등) |
| 보안 | 비인증 허용. |
| 상태 | IMPLEMENTED (Sprint 1) |
| 추가·변경 Sprint | Sprint 1 |

### `requestPasswordReset` — `POST /api/auth/password-reset`

| 항목 | 정의 |
| --- | --- |
| Owner | Identity |
| 관련 Story·시나리오 | 비밀번호 분실 사용자의 로그인 가능 상태 회복(독립 기술 Story) |
| Request | `{ email }` |
| 정상 | `200` 본문 `{ "data": null }`. 가입된 이메일이면 재설정 토큰을 발급해 Redis에 `pwreset:<userId>` 키로 저장(값은 토큰 SHA-256 해시, TTL 30분)하고 재설정 링크를 메일로 발송. **계정 존재 여부와 무관하게 항상 `200`**(이메일 존재 여부 노출 금지), 미가입 이메일이면 아무 것도 하지 않음. 재요청 시 같은 키를 덮어써 마지막 링크만 유효. |
| 실패 | 이메일 형식 오류·필수값 누락 `400 VALIDATION_ERROR` |
| 보안 | 비인증 허용(화이트리스트 `/api/auth/**`). 토큰 원문은 메일 링크로만 전달, Redis엔 해시만 저장, 로그에 원문 미출력. 메일 발송 구현은 `app.mail.provider`로 전환(`log` 기본 / `smtp` Gmail SMTP). |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 (독립 기술 Story) |

### `confirmPasswordReset` — `POST /api/auth/password-reset/confirm`

| 항목 | 정의 |
| --- | --- |
| Owner | Identity |
| 관련 Story·시나리오 | 비밀번호 분실 사용자의 로그인 가능 상태 회복(독립 기술 Story) |
| Request | `{ token, newPassword }`. `token`은 메일 링크의 `?token=` 값(`<userId>.<랜덤>` 형식) · `newPassword` 8~64자 |
| 정상 | `200` 본문 `{ "data": null }`. 토큰이 해당 사용자의 최신 발급본과 일치하면 비밀번호(BCrypt work factor 12)를 갱신하고, 재설정 토큰을 삭제(1회용)하며, 해당 사용자의 refreshToken(Redis)을 폐기해 기존 세션을 무효화. |
| 실패 | 토큰 만료·위조·이미 사용·이전 링크 `400 VALIDATION_ERROR` · `newPassword` 정책(8~64자) 위반 `400` · 필수값 누락 `400` |
| 보안 | 비인증 허용. 토큰 자체가 자격(메일함 소유 증명). 재설정 성공 시 기존 accessToken은 만료까지만 유효(짧은 TTL), refreshToken은 즉시 폐기. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 (독립 기술 Story) |

### `getMyProfile` — `GET /api/auth/me`

| 항목 | 정의 |
| --- | --- |
| Owner | Identity |
| 관련 Story·시나리오 | US9 마이페이지 프로필, 네비게이션 바 이름·상호 표시 |
| Request | Gateway가 주입한 `X-User-Id` 헤더 (body·query 없음) |
| 정상 | `200` `{ email, role, companyName, businessNo, managerName, contact, companyContact, representativeName, companyAddress, industry, name }`. 참가업체는 업체·담당자 필드가, 일반회원은 `name`이 채워짐(나머지는 `null`). 비밀번호·상태·타임스탬프 미노출. |
| 실패 | `X-User-Id` 헤더 없음(비로그인) `401 UNAUTHENTICATED` · 해당 userId 사용자 없음 `404 NOT_FOUND` |
| 보안 | 화이트리스트(`/api/auth/**`)라 게이트웨이는 토큰 없이 통과시키지만, 신원 헤더가 없으면 Identity가 `401`. `@RequestHeader`로 직접 읽음(Identity엔 게이트웨이 인증 필터 없음). |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### 2.2 박람회 관리 (Expo, `ADMIN`)

### `registerExpo` — `POST /api/admin/expos`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US1 |
| Request | `{ title, venue, startsAt, endsAt, applyStartsAt, applyEndsAt, booths: [{ boothNo, type, fee }] }` (개별 부스 자리 목록, ≥ 1). 각 항목 = 부스 1칸. |
| 정상 | `201` `{ expoId, status: "DRAFT", boothCount }`. 각 부스는 `status = AVAILABLE`로 생성. |
| 실패 | 필수값 누락 `400` · 일자 순서 위반(`applyStartsAt < applyEndsAt ≤ startsAt < endsAt` 아님) `400` · 부스 0개 `400` · `boothNo` 중복 `400` |
| 보안 | `ADMIN` 필수. 아니면 `403 FORBIDDEN`. 미인증 `401`. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `openExpo` — `POST /api/admin/expos/{expoId}/open`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US1 |
| Request | Path `expoId` |
| 정상 | `200` `{ expoId, status: "OPEN" }`. 참가업체 조회에 노출 시작. |
| 실패 | 없는 박람회 `404` · `DRAFT`가 아닌 상태 `409 INVALID_STATE` |
| 보안 | `ADMIN` 필수. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `listExposForAdmin` — `GET /api/admin/expos`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US1 · US5 |
| Request | Query `page`, `size` (기본 size 20) |
| 정상 | `200` 페이지. **전체 박람회(상태 무관, DRAFT 포함)** `{ expoId, title, status, applyStartsAt, applyEndsAt, totalBooths, availableBooths, totalApplications, pendingCount, approvedCount, rejectedCount }`. `pendingCount` = `SUBMITTED`, `approvedCount` = `PAYMENT_PENDING` + `CONFIRMED`, `rejectedCount` = `REJECTED`. |
| 실패 | — |
| 보안 | `ADMIN` 필수. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `getExpoBoothsForAdmin` — `GET /api/admin/expos/{expoId}/booths`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US1 |
| Request | Path `expoId` |
| 정상 | `200` `getExpoBooths`와 동일 구조(`{ expoId, title, totalCount, availableCount, booths: [...] }`). **공개 여부(`DRAFT`/`OPEN`) 무관하게 조회 가능**한 점이 exhibitor용과 차이. |
| 실패 | 없는 박람회 `404` |
| 보안 | `ADMIN` 필수. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### 2.3 박람회·부스 조회 (Expo, `EXHIBITOR`)

### `listOpenExpos` — `GET /api/exhibitor/expos`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US3 |
| Request | Query `page`, `size` (기본 size 10, `applyEndsAt` 정렬) |
| 정상 | `200` 페이지. `OPEN` 박람회만 `{ expoId, title, venue, startsAt, endsAt, applyStartsAt, applyEndsAt }`. `DRAFT`는 제외. |
| 실패 | — |
| 보안 | `EXHIBITOR` 필수. 아니면 `403`, 미인증 `401`. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `getExpoBooths` — `GET /api/exhibitor/expos/{expoId}/booths`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US3 |
| Request | Path `expoId`, Query `status`(선택: `AVAILABLE` / `RESERVED` / `ASSIGNED`) |
| 정상 | `200` `{ expoId, title, totalCount, availableCount, booths: [{ boothId, boothNo, type, fee, status, applicable }] }`. `status` = `AVAILABLE` / `RESERVED`(승인 후 결제 대기) / `ASSIGNED`(확정 배정). `applicable` = 신청 기간 내 && `status == AVAILABLE`. `status` 필터를 걸어도 `totalCount`·`availableCount` 집계는 전체 기준. |
| 실패 | 없는 박람회 `404` · 비공개(`DRAFT`) 박람회 `404` · `status` 값 오류 `400 VALIDATION_ERROR` |
| 보안 | `EXHIBITOR` 필수. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### 2.4 부스 신청·마이페이지 (Expo, `EXHIBITOR`)

### `applyBooth` — `POST /api/exhibitor/booth-applications`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US4 |
| Request | `{ expoId, boothIds: [Long], exhibitionItem, conceptDescription, powerRequested, waterSupplyRequested, internetRequested, additionalRequest, saveMode: "DRAFT" |
| 정상 | `201` `{ groupId, applications: [{ applicationId, boothId, status }] }`. `boothIds` 개수만큼 자리별 행 생성, 동일 `groupId`로 그룹핑. `SUBMIT`이면 각 행 `SUBMITTED`, `DRAFT`면 `DRAFT`. |
| 실패 | 필수값 누락 `400` · `boothIds` 비어있음 `400` · 부스가 요청 `expoId` 소속 아님 `404` · (SUBMIT만) 신청 기간 아님 `409 INVALID_STATE` · 부스가 이미 `RESERVED`/`ASSIGNED` `409 INVALID_STATE` · 같은 자리에 본인 활성 신청 존재 `409 DUPLICATE` |
| 보안 | `EXHIBITOR` 필수. 신청자 = SecurityContext `GatewayUser.id`(본문 값 무시). |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `updateBoothApplicationDraft` — `PATCH /api/exhibitor/booth-applications/groups/{groupId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US4 |
| Request | Path `groupId`, Body `{ boothIds: [Long], exhibitionItem, conceptDescription, powerRequested, waterSupplyRequested, internetRequested, additionalRequest }` (부스 재선택 포함) |
| 정상 | `200` `{ groupId, applications }`. 그룹 내 기존 행 삭제 후 재생성, `DRAFT` 유지. |
| 실패 | 없는 그룹 `404` · 본인 아님 `403` · `DRAFT` 아닌 행 존재 `409 INVALID_STATE` |
| 보안 | `EXHIBITOR` 필수 + 소유권(`group.exhibitorId == GatewayUser.id`). |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `submitBoothApplicationDraft` — `POST /api/exhibitor/booth-applications/groups/{groupId}/submit`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US4 |
| Request | Path `groupId` |
| 정상 | `200` `{ groupId, applications: [{ ..., status: "SUBMITTED" }] }`. 이 시점에 신청 기간·부스 가용·중복 검증 수행. |
| 실패 | 없는 그룹 `404` · 본인 아님 `403` · `DRAFT` 아닌 행 존재 `409 INVALID_STATE` · 신청 기간 아님 / 부스 배정됨 / 중복 `409` |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `deleteBoothApplicationGroup` — `DELETE /api/exhibitor/booth-applications/groups/{groupId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US4 |
| Request | Path `groupId` |
| 정상 | `200` `{ groupId, status: "CANCELLED" }`. `DRAFT`/`SUBMITTED` 상태에서만 가능. |
| 실패 | 없는 그룹 `404` · 본인 아님 `403` · `PAYMENT_PENDING`/`CONFIRMED` 행 존재 `409 INVALID_STATE` |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `listMyBoothApplications` — `GET /api/exhibitor/booth-applications`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US9 마이페이지 신청·결제 내역 |
| Request | Query `page`, `size` (기본 size 10) |
| 정상 | `200` 페이지. 그룹 단위 `{ groupId, expoId, expoTitle, exhibitorId, exhibitionItem, conceptDescription, powerRequested, waterSupplyRequested, internetRequested, additionalRequest, createdAt, applications: [{ applicationId, boothId, boothNo, boothType, fee, status }], paymentStatus }`. `paymentStatus`는 Payment 서비스 결제 상태(`PENDING`/`PAID`/`FAILED`/`CANCELLED`), 결제 이력 없으면 `null`. 본인 소유만. |
| 실패 | — |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `getBoothApplicationGroupDetail` — `GET /api/exhibitor/booth-applications/groups/{groupId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US6 반려 사유 조회 · US9 상세 · 결제 화면 |
| Request | Path `groupId` |
| 정상 | `200` `listMyBoothApplications`의 항목과 동일 구조(단건). 각 `applications[]` 항목에 `status`(신청 상태), 그룹에 `paymentStatus`. 반려 시 반려 사유 포함. |
| 실패 | 없는 그룹 `404` · 본인 그룹 아님 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권(`group.exhibitorId == GatewayUser.id`). |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### 2.5 부스 심사 (Expo, `ADMIN`)

### `listBoothApplications` — `GET /api/admin/booth-applications`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US5 |
| Request | Query `page`, `size` (기본 size 10) |
| 정상 | `200` 페이지. `getBoothApplicationGroupDetail`와 동일 구조, 전체 업체 대상, 최신순. |
| 실패 | — |
| 보안 | `ADMIN` 필수. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `approveBoothApplication` — `POST /api/admin/booth-applications/{applicationId}/approve`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US6 승인 |
| Request | Path `applicationId`, Header `Idempotency-Key`(선택) |
| 정상 | `200` `{ applicationId, boothId, status: "PAYMENT_PENDING", rejectReason: null }`. 승인과 동시에 **부스도 `AVAILABLE → RESERVED`로 잠금** — 결제 대기 중 다른 업체 신청 차단. |
| 실패 | 없는 신청 `404` · `SUBMITTED` 아님 `409 INVALID_STATE` · 같은 부스에 이미 `PAYMENT_PENDING`/`CONFIRMED` 있음(경쟁 신청 차단) `409 INVALID_STATE` · 멱등 재요청은 최초 결과 반환 |
| 보안 | `ADMIN` 필수. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `rejectBoothApplication` — `POST /api/admin/booth-applications/{applicationId}/reject`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US6 반려 |
| Request | Path `applicationId`, Body `{ reason }`(필수), Header `Idempotency-Key`(선택) |
| 정상 | `200` `{ applicationId, boothId, status: "REJECTED", rejectReason }`. 참가업체가 `getBoothApplicationGroupDetail`로 사유 조회. |
| 실패 | 없는 신청 `404` · `SUBMITTED` 아님 `409 INVALID_STATE` · `reason` 누락 `400` · 멱등 재요청은 최초 결과 반환 |
| 보안 | `ADMIN` 필수. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### 2.6 부스 참가비 결제 (Payment, `EXHIBITOR`)

### `createBoothPayment` — `POST /api/exhibitor/payments`

| 항목 | 정의 |
| --- | --- |
| Owner | Payment |
| 관련 Story·시나리오 | US7 부스 참가비 Mock 결제 |
| Request | `{ groupId }`, Header `Idempotency-Key` |
| 정상 | `201 { paymentId, groupId, amount, status: "PENDING", expiresAt }` |
| 실패 | 그룹이 결제 가능 상태 아님 `409` · 본인 그룹 아님 `403` · 멱등 재요청은 최초 결과 반환 |
| 보안 | `EXHIBITOR` 필수 + 그룹 소유권. |
| 상태 | PLANNED |
| 추가·변경 Sprint | Sprint 1 |

### `approveBoothPayment` — `POST /api/exhibitor/payments/{paymentId}/approve`

| 항목 | 정의 |
| --- | --- |
| Owner | Payment |
| 관련 Story·시나리오 | US7·US8 |
| Request | Path `paymentId`, Header `Idempotency-Key` |
| 정상 | `200 { paymentId, status: "PAID" }` |
| 실패 | 결제 기한 경과 `409 PAYMENT_EXPIRED` |
| 보안 | `EXHIBITOR` 필수 + 결제 소유권. |
| 상태 | PLANNED |
| 추가·변경 Sprint | Sprint 1 |

### `getMyPayment` — `GET /api/exhibitor/payments/{paymentId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Payment |
| 관련 Story·시나리오 | US7·US9 결제 상태 확인 |
| Request | Path `paymentId` |
| 정상 | `200 { paymentId, groupId, amount, status, expiresAt }` |
| 실패 | 없는 결제 `404` · 본인 결제 아님 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | PLANNED |
| 추가·변경 Sprint | Sprint 1 |

### `refundBoothPayment` — `POST /api/exhibitor/payments/{bookingId}/refund`

| 항목 | 정의 |
| --- | --- |
| Owner | Payment |
| 관련 Story·시나리오 | US20 부스 참가비 환불 |
| Request | Path `bookingId`, Header `X-User-Id`, Body `{ reason }` |
| 정상 | `200 { bookingId, status: "CANCELLED", cancelledAt, cancelReason }`. 전액 환불만 지원 |
| 실패 | 없는 결제 `404` · 본인 결제 아님 `403` · 이미 `CANCELLED` 또는 `PAID` 아닌 상태 `409 INVALID_STATE` |
| 보안 | `X-User-Id` 헤더로 본인 확인 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### 2.6.1 현재 구현(Mock) 엔드포인트 — 계약 확정 전

위 `createBoothPayment` / `approveBoothPayment` / `getMyPayment`는 확정 목표 계약이고, 아래는 데모용으로 실제 배포된 Mock 구현. 신원을 `X-User-Id`가 아닌 body로 받는 등 공통 규약과 어긋난 부분이 있어 정식 계약 확정 시 교체 대상.

| operationId (구현) | method/path | Request | 응답 | 비고 |
| --- | --- | --- | --- | --- |
| `pay` (부스 결제) | `POST /api/exhibitor/payments` | Header `X-User-Id`, body `{ bookingId, amount, payMethod, paymentId }` | `Payment` 엔티티 | 공통 Envelope 미적용. userId는 body에서 제거, X-User-Id 헤더로만 받음 |
| `getPaymentStatus` | `GET /api/exhibitor/payments/{bookingId}/status` | Path `bookingId` | `{ bookingId, status }` | 확정 계약 `getMyPayment`의 경로(`/{paymentId}`)와 불일치. 인증·소유자 검증 없음(무인증 공개) — bookingId만 알면 누구나 조회 가능, 미해결 이슈 |
| `getMyPayments` | `GET /api/exhibitor/payments` | Header `X-User-Id` | `[PaymentListItemResponse, ...]` | 마이페이지 참가비 결제 내역 표. userId는 query 아니라 X-User-Id 헤더로 받음(2026-09 IDOR 수정 반영) |
| `payAdmission` (당일 입장권) | `POST /api/customer/admission-payments` | Header `X-User-Id`, body `{ expoId, amount, payMethod, paymentId }` | `AdmissionPayment` 엔티티 | US17·US18. 고객 id는 `X-User-Id`에서만(body 무시) — 원래부터 규약 준수 |
| `refundBoothPayment` | `POST /api/exhibitor/payments/{bookingId}/refund` | Header `X-User-Id` | `Payment` 엔티티(상태 CANCELLED) | 신규 — 원문에 없었음 |
| `refundAdmissionTicket` | `POST /api/customer/admission-payments/{id}/refund` | Path `id`, Header `X-User-Id` | `AdmissionPayment` 엔티티 | 신규 — Reservation `tickets/{id}/cancel` 연동으로 QR 무효화까지 처리 |

상태: IMPLEMENTED (Mock, Acceptance Test 미작성). 추가·변경 Sprint: Sprint 2.

### 2.6.2 매출·통계 (Payment, `ADMIN`)

### `getPaymentStats` — `GET /api/admin/stats/payments`

| 항목 | 정의 |
| --- | --- |
| Owner | Payment |
| 관련 Story·시나리오 | US21 매출 현황 조회 |
| Request | Header `X-User-Role`, Query `expoId`(Long), `from`(LocalDate), `to`(LocalDate) |
| 정상 | `200 [{ date, source, paidCount, paidAmount, refundCount, refundAmount, net }, ...]` |
| 실패 | `X-User-Role` 없음 `401` · `ADMIN` 아님 `403` |
| 보안 | `X-User-Role` 헤더 수동 체크 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### `getExpoRevenue` — `GET /api/admin/expos/{expoId}/revenue`

| 항목 | 정의 |
| --- | --- |
| Owner | Payment |
| 관련 Story·시나리오 | US22 박람회별 매출 통계 |
| Request | Path `expoId`, Header `X-User-Role` |
| 정상 | `200 { boothFee, dayTicket, refundTotal, netRevenue }` |
| 실패 | `X-User-Role` 없음 `401` · `ADMIN` 아님 `403` |
| 보안 | `X-User-Role` 헤더 수동 체크 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### 2.7 부스 콘텐츠 (Expo, `EXHIBITOR`)

### `getBoothManageDetail` — `GET /api/exhibitor/booths/{boothId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US10 부스 관리 화면 진입 시 현재 콘텐츠·배너 로드 |
| Request | Path `boothId` |
| 정상 | `200` `{ boothId, boothNo, boothType, expoId, expoTitle, bannerImageUrl, content: { title, content, updatedAt } |
| 실패 | 없는 부스 `404` · 본인에게 배정된 부스 아님 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권(`booth.status == ASSIGNED` && 배정 신청의 `exhibitorId == GatewayUser.id`). |
| 상태 | IMPLEMENTED (Acceptance Test 미작성 — STORY 3, Sprint 2) |
| 추가·변경 Sprint | Sprint 1 (구현), Sprint 2 (검증·이월) |

### `updateBoothContent` — `PUT /api/exhibitor/booths/{boothId}/content`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US10 |
| Request | Path `boothId`, Body `{ title, content }` |
| 정상 | `200` `{ postId, boothId, title, content, updatedAt }`. 콘텐츠가 없으면 생성, 있으면 갱신(upsert). 확정 배정된 본인 자리만. |
| 실패 | 타인 자리 `403` + 감사 로그 · 미배정 자리(`booth.status != ASSIGNED`) `409 INVALID_STATE` · 필수값 누락 `400` |
| 보안 | `EXHIBITOR` 필수 + 소유권(`booth.status == ASSIGNED` && 배정 신청의 `exhibitorId == GatewayUser.id`). |
| 상태 | IMPLEMENTED (Acceptance Test 미작성 — STORY 3, Sprint 2) |
| 추가·변경 Sprint | Sprint 1 (구현), Sprint 2 (검증·이월) |

### `updateBoothBannerImage` — `PUT /api/exhibitor/booths/{boothId}/banner-image`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US10 |
| Request | Path `boothId`, `multipart/form-data` 파트 `image` (파일) |
| 정상 | `200` `{ bannerImageUrl }`. 업로드된 배너 이미지 URL 반환. |
| 실패 | 타인 자리 `403` · 미배정 자리 `409 INVALID_STATE` · 파일 누락·형식 오류 `400` |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | IMPLEMENTED (Acceptance Test 미작성 — STORY 3, Sprint 2) |
| 추가·변경 Sprint | Sprint 1 (구현), Sprint 2 (검증·이월) |

### 2.8 방문 예약·입장권 (Reservation, USER)

### `applyVisit — POST /api/customer/reservations`

| 항목 | 정의 |
| --- | --- |
| Owner | Reservation |
| 관련 Story·시나리오 | US12 방문 예약 신청 / 무료 QR 발급 |
| Request | `{ expoId, visitDates: [LocalDate, ...]` } (날짜 1개 이상) |
| 정상 | `200 { expoId, tickets: [{ ticketId, customerId, expoId, visitDate, ticketType, status, qrToken,qrImageBase64, issuedAt }, ...] }`. 날짜마다 개별 발급, (customerId, expoId, visitDate) 조합당 1장만 — 같은 날짜 재신청 시 새로 만들지 않고 기존 티켓 그대로 반환(멱등). |
| 실패 | 없는 박람회 `404` · 비공개(`DRAFT`) 박람회 `409 INVALID_STATE` · 방문 날짜가 박람회 기간(`startsAt`~`endsAt`) 밖 `400 VALIDATION_ERROR`· 오늘이 박람회 시작일 이후(무료 발급 마감, 당일은 유료 전환)`409` `INVALID_STATE·visitDates`비어있음`400` |
| 보안 | `USER` 필수, 아니면 `403`, 미인증 `401`. 신청자 = `GatewayUser.id`(본문 값 무시). QR 원문(`qrToken`)은 본인 응답에만 노출, 로그엔 안 남음. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `listMyTickets — GET /api/customer/reservations`

| 항목 | 정의 |
| --- | --- |
| Owner | Reservation |
| 관련 Story·시나리오 | US9·US16 관련 예약 내역 조회 |
| Request | - |
| 정상 | `200 [{ ticketId, customerId, expoId, visitDate, ticketType, status, qrToken, qrImageBase64, issuedAt }, ...]` — 최근 발급순, 본인 티켓만. |
| 실패 | - |
| 보안 | `USER` 필수 + 소유권(`customerId`는 `GatewayUser`에서만 신뢰, 조회 대상은 항상 본인). |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `selfCheckIn — POST /api/customer/reservations/{ticketId}/check-in`

| 항목 | 정의 |
| --- | --- |
| Owner | Reservation |
| 관련 Story·시나리오 | US23 현장 입장 체크 |
| Request | `Path ticketId` |
| 정상 | `200 { ticketId, customerId, expoId, checkedInAt }. ISSUED` → `USED` 원자적 단일 사용 전환(동시 요청도 1건만 성공). |
| 실패 | 없는 티켓 `404` · 본인 티켓 아님 `403` · 방문 예약일(`visitDate`)이 오늘이 아님 `409 INVALID_STATE` · 이미 사용된 티켓 `409 INVALID_STATE` |
| 보안 | `USER` 필수 + 소유권`(ticket.customerId == GatewayUser.id)`. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### 2.8.1 당일 입장권 환불 (Payment, `USER`)

### `refundAdmissionTicket` — `POST /api/customer/admission-payments/{id}/refund`

| 항목 | 정의 |
| --- | --- |
| Owner | Payment |
| 관련 Story·시나리오 | US20 당일 입장권 환불 |
| Request | Path `id`(admissionPaymentId), Header `X-User-Id`, Body `{ reason }` |
| 정상 | `200 { id, status: "CANCELLED", cancelledAt, cancelReason }`. Reservation `tickets/{id}/cancel` 연동으로 QR 무효화 |
| 실패 | 없는 결제 `404` · 본인 아님 `403` · `PAID` 아님 `409` |
| 보안 | `X-User-Id` 헤더 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### 2.9 상담 신청 (Expo, USER/EXHIBITOR)

### `applyConsultation` — `POST /api/customer/consultations`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US13 구매 상담 신청, US15 시승 상담 신청 |
| Request | `{ boothIds:[Long], customerName, customerPhone, customerEmail, wantsPurchase, wantsTestDrive, interestedVehicle, hasDriverLicense, preferredDate, preferredTime, message }`. boothIds 1개↑(같은 박람회 소속), customerName/Phone/Email 필수, wantsPurchase/TestDrive 최소 1개 true, interestedVehicle 자유 텍스트,
`leadConsent`(리드 확보 동의, `@AssertTrue`) |
| 정상 | `201 [{ consultationId, boothId, boothNo, expoId, expoTitle, customerId, customerName, customerPhone, customerEmail, wantsPurchase, wantsTestDrive, interestedVehicle, hasDriverLicense, preferredDate, preferredTime, message, aiSummary, aiSummaryRetryable, status:REQUESTED, rejectReason:null, createdAt }, ...]` — boothIds 개수만큼 생성, 요약 1회 생성해 전부 첨부(fail-open) |
| 실패 | wantsPurchase/TestDrive 둘다 false `400` · 필수값 누락 `400` · 없는 부스 `404` · 부스 ASSIGNED 아님 `409` · boothIds 박람회 불일치 `400` · 같은 날짜 같은 부스 중복(REQUESTED/APPROVED) `409 DUPLICATE` · 입장권 미보유 `409` · Reservation 확인 불가 `202` `leadConsent=false` `400` |
| 보안 | USER 필수, 아니면 `403`, 미인증 `401`. 신청자=GatewayUser.id |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `listMyConsultations` — `GET /api/customer/consultations`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US13·US15 관련 마이페이지 상담 내역 조회 |
| Request | - |
| 정상 | `200 [{ consultationId, boothId, boothNo, expoId, expoTitle, customerId, customerName, customerPhone, customerEmail, wantsPurchase, wantsTestDrive, interestedVehicle, hasDriverLicense, preferredDate, preferredTime, message, aiSummary, aiSummaryRetryable, status, rejectReason, createdAt }, ...]` — 최신순, 본인만 |
| 실패 | - |
| 보안 | USER 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `getExhibitorConsultations` — `GET /api/exhibitor/consultations`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US16 상담 신청 승인/반려용 목록 조회 |
| Request | - |
| 정상 | `200 [{ consultationId, ... }, ...]` — 본인 CONFIRMED 부스로 들어온 상담만, 최신순 |
| 실패 | - |
| 보안 | `EXHIBITOR` 필수. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `approveConsultation` — `POST /api/exhibitor/consultations/{consultationId}/approve`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US16 승인 |
| Request | Path `consultationId` |
| 정상 | `200 { ..., status: APPROVED }` |
| 실패 | 없는 신청 `404` · 본인 부스 아님 `403` · REQUESTED 아님 `409` |
| 보안 | EXHIBITOR 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `rejectConsultation` — `POST /api/exhibitor/consultations/{consultationId}/reject`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US16 반려 |
| Request | Path consultationId, Body `{ reason }`(필수) |
| 정상 | `200 { ..., status: REJECTED, rejectReason }` |
| 실패 | 없는 신청 `404` · 본인 부스 아님 `403` · REQUESTED 아님 `409` · reason 누락 `400` |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `updateConsultation` — `PUT /api/customer/consultations/{consultationId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US13·US15 관련 — 대기 중 수정 |
| Request | Path consultationId, Body `{ wantsPurchase, wantsTestDrive, interestedVehicle, hasDriverLicense, preferredDate, preferredTime, message }` ,
`leadConsent`(리드 확보 동의, `@AssertTrue`) |
| 정상 | `200 {...}` — 날짜 변경 시 입장권·중복 재검증, 기존 aiSummary 폐기 후 재생성 시도(fail-open) |
| 실패 | 없는 신청 `404` · 본인 아님 `403` · REQUESTED 아님 `409` · 날짜 변경 시 입장권 미보유/중복 `409` |
| 보안 | USER 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `cancelConsultation` — `POST /api/customer/consultations/{consultationId}/cancel`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US13·US15 관련 — 대기 중 취소 |
| Request | Path consultationId |
| 정상 | `200 { ..., status:CANCELED }` |
| 실패 | 없는 신청 `404` · 본인 아님 `403` · REQUESTED 아님 `409` |
| 보안 | USER 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `completeConsultation` — `POST /api/exhibitor/consultations/{consultationId}/complete`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US16 관련 — 방문 완료 처리 |
| Request | Path consultationId |
| 정상 | `200 { ..., status:COMPLETED }` |
| 실패 | 없는 신청 `404` · 본인 부스 아님 `403` · APPROVED 아님 `409` · 방문 예정일 당일 이전 `409` |
| 보안 | USER 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `markNoShow`— `POST /api/exhibitor/consultations/{consultationId}/no-show`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US16 관련 — 미방문 처리 |
| Request | Path consultationId |
| 정상 | `200 { ..., status:NO_SHOW }` |
| 실패 | 없는 신청 `404` · 본인 부스 아님 `403` · APPROVED 아님 `409` · 방문 예정일 당일 이전 `409` |
| 보안 | USER 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `regenerateConsultationAiSummary`— `POST /api/exhibitor/consultations/{consultationId}/ai-summary/regenerate`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | STORY #156 — 요약 수동 재생성 |
| Request | Path consultationId |
| 정상 | `200 { ..., aiSummary, aiSummaryRetryable }` |
| 실패 | 없는 신청 `404` · 본인 부스 아님 `403` · 재시도 3회 초과 `409` · Gemini 실패해도 `200`(요약 null 유지, fail-open) |
| 보안 | EXHIBITOR 필수 + 소유권, 상태 무관 호출 가능 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### 2.9.1 QR 스캔 리드 확보 (Expo)

### `listMyBooths` — `GET /api/exhibitor/booths/mine`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | STORY 11 관련 — QR 리드 화면 부스 선택(하드코딩 제거) |
| Request | - |
| 정상 | `200 [{ boothId, boothNo, expoId, expoTitle }, ...]` — 참가 확정(`CONFIRMED`)된 본인 부스만. |
| 실패 | - |
| 보안 | `EXHIBITOR` 필수 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3  |

### `scanLead` — `POST /api/exhibitor/booths/{boothId}/leads`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | TASK 11-2 #176 |
| Request | Path `boothId`, Body `{ qrToken }`} |
| 정상 | `200 { leadId, boothId, customerId, customerName, customerEmail, visitDate, interestNote, emailSummary, status, createdAt }`. 같은 booth+customer 재스캔 시 새로 안 만들고 기존 리드 반환(멱등, `UNIQUE(booth_id, customer_id)`). |
| 실패 | 본인 부스(CONFIRMED) 아님 `403` · `booth.expo.id` ≠ `ticket.expoId` `409` · 같은 booth+customer+visitDate `APPROVED`+`leadConsent=true` Consultation 없음(워크인 미지원) `409` · QR 무효/만료 `404` · Reservation 조회 실패/타임아웃 `202`(fail-closed, 리드 미생성) |
| 보안 | `EXHIBITOR` 필수 + 부스 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `listLeads` — `GET /api/exhibitor/booths/{boothId}/leads`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | TASK 11-2 #176 |
| Request | Path `boothId` |
| 정상 | `200 [LeadResponse, ...]` — 본인 부스만 |
| 실패 | 타 부스 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `generateEmailSummary` — `POST /api/exhibitor/leads/{leadId}/summary`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | TASK 11-3 #177 |
| Request | Path `leadId`, Body `{ consultationNote }` |
| 정상 | `200 LeadResponse`. `interestNote`에 메모 저장 + `emailSummary`에 Gemini 결과(실패 시 원문 그대로, fail-open) 저장. 발송 안 함(미리보기). |
| 실패 | 타 부스 리드 `403` · 없는 리드 `404` · 재시도 3회 초과(`email_summary_retry_count`) `409` |
| 보안 | `EXHIBITOR` 필수 + 소유권(`findOwnedLead`) |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `sendInfo` — `POST /api/exhibitor/leads/{leadId}/send-info`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | TASK 11-4 #178 |
| Request | Path `leadId`, Body `{ emailBody }` |
| 정상 | `200 { ..., status: SENT }`. `IdentityClient.sendMail` 성공 시 상태 전이 + 연결된 Consultation이 `APPROVED`면 `COMPLETED`로 자동 전이. |
| 실패 | 타 부스 리드 `403` · 없는 리드 `404` · 메일 발송 실패 `500`(상태 안 바뀜, 재시도 가능) |
| 보안 | `EXHIBITOR` 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `getBoothStats` — `GET /api/exhibitor/booths/{boothId}/stats`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | TASK 7-4 #247 |
| Request | Path `boothId` |
| 정상 | `200 { boothId, boothNo, requestedCount, approvedCount, rejectedCount, completedCount, noShowCount, canceledCount, visitCount }` |
| 실패 | 타 부스 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `consentLead` — `POST /api/exhibitor/leads/{leadId}/consent`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | STORY 11 워크인 리드 개인정보 동의 |
| Request | Path `leadId`, body 없음 |
| 정상 | `200 LeadResponse`. **워크인 리드(consultation_id=NULL)만 대상** — `leadConsent=true` 전환 |
| 실패 | 이미 상담 연결된 리드 `403` · 타 부스 `403` · 없는 리드 `404` |
| 보안 | `EXHIBITOR` 필수 + 소유권 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### `updateLeadEmail` — `PUT /api/exhibitor/leads/{leadId}/email`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | STORY 11 리드 이메일 오탈자 수정 |
| Request | Path `leadId`, Body `{ customerEmail }`(`@NotBlank @Email`) |
| 정상 | `200 LeadResponse`. `customerEmail` 필드만 갱신, 동의 여부(leadConsent) 무관 허용 |
| 실패 | 이메일 형식 오류 `400` · 타 부스 리드 `403` · 없는 리드 `404` |
| 보안 | `EXHIBITOR` 필수 + 소유권 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### 2.9.2 상담 후기 컨텍스트/초안 (Expo, `USER`)

### `getReviewContext` — `GET /api/customer/consultations/{consultationId}/review-context`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | TASK 8-3 #227 |
| Request | Path `consultationId` |
| 정상 | `200 { interestedVehicle, wantsPurchase, wantsTestDrive, message, exhibitorNote }`. `exhibitorNote`는 `Lead.emailSummary`(Gemini 요약본)만 — 원문 `interestNote` 노출 안 함. |
| 실패 | 없는 상담 `404` · 본인 아님 `403` · 후기 작성 자격 아님(`COMPLETED`+5일 아님) `409` |
| 보안 | `USER` 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `draftReview` — `POST /api/customer/consultations/{consultationId}/review-draft`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | TASK 8-3 #227 |
| Request | Path `consultationId`, Body `{ reviewType, vehicleName }` |
| 정상 | `200 { draft }`. Gemini 실패 시 `draft=null`(fail-open). |
| 실패 | 후기 작성 자격 아님 `409` · 본인 아님 `403` |
| 보안 | `USER` 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### 2.9.3 AI 부가기능 (Expo, `USER`/비회원)

### `reviewPolish` — `POST /api/customer/consultations/review-polish`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | 후기 작성 AI 문장 다듬기 |
| Request | `{ reviewType, vehicleName(선택), content }`(최대 1000자) |
| 정상 | `200 { draft }`. Gemini 실패 시 `draft=null` |
| 실패 | 누락/초과 `400` |
| 보안 | 비인증 허용 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### `searchVehicles` — `GET /api/customer/vehicles/search`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | AI 자연어 차량 검색(비회원 가능) |
| Request | Query `query` |
| 정상 | `200 { results: [...], interpretedSummary }`. **fail-open**: 실패 시 키워드매칭 대체, `interpretedSummary=null` |
| 실패 | `query` 공백 `400` |
| 보안 | 비인증 허용 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### 2.10 전시 차량 (Expo, `EXHIBITOR`)

확정 배정된 본인 부스(`booth.status == ASSIGNED` && 배정 신청의 `exhibitorId == GatewayUser.id`)에 대해서만 허용. 모든 실패에서 없는 부스·타 소유는 `404`/`403`.

### `listVehicles` — `GET /api/exhibitor/booths/{boothId}/vehicles`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US14 전시 차량 관리 |
| Request | Path `boothId` |
| 정상 | `200` `[{ vehicleId, boothId, name, tags: [string], startPrice, summary, description, features, colors, range, battery, power, images: [{ imageId, imageUrl }], updatedAt }, ...]` |
| 실패 | 없는 부스 `404` · 본인 배정 부스 아님 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### `registerVehicle` — `POST /api/exhibitor/booths/{boothId}/vehicles`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US14 |
| Request | Path `boothId`, Body `{ name, tags: [string], startPrice, summary, description, features, colors, range, battery, power }` |
| 정상 | `201` `VehicleResponse`(`listVehicles` 항목과 동일 구조, `images: []`). |
| 실패 | 필수값 누락 `400` · 없는 부스 `404` · 본인 배정 부스 아님 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### `updateVehicle` — `PUT /api/exhibitor/booths/{boothId}/vehicles/{vehicleId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US14 |
| Request | Path `boothId`, `vehicleId`, Body `registerVehicle`와 동일 |
| 정상 | `200` 갱신된 `VehicleResponse`. |
| 실패 | 필수값 누락 `400` · 없는 부스·차량 `404` · 차량이 해당 부스 소속 아님 `404` · 본인 배정 부스 아님 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### `deleteVehicle` — `DELETE /api/exhibitor/booths/{boothId}/vehicles/{vehicleId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US14 |
| Request | Path `boothId`, `vehicleId` |
| 정상 | `200` `{ "data": null }`. 차량·연결 이미지 삭제. |
| 실패 | 없는 부스·차량 `404` · 본인 배정 부스 아님 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### `addVehicleImage` — `POST /api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US14 |
| Request | Path `boothId`, `vehicleId`, `multipart/form-data` 파트 `image` (파일) |
| 정상 | `201` `{ imageId, imageUrl }` |
| 실패 | 파일 누락·형식 오류 `400` · 없는 부스·차량 `404` · 본인 배정 부스 아님 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### `deleteVehicleImage` — `DELETE /api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images/{imageId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US14 |
| Request | Path `boothId`, `vehicleId`, `imageId` |
| 정상 | `200` `{ "data": null }` |
| 실패 | 없는 부스·차량·이미지 `404` · 본인 배정 부스 아님 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### 2.11 고객 박람회 공개 조회 (Expo, 비회원 허용)

게이트웨이 화이트리스트(`/api/customer/expos`, `/api/customer/expos/{id}`, `/api/customer/expos/{id}/booths`, `/api/customer/expos/{id}/vehicles`). 토큰 없이 접근 가능, Role 검사 없음.

### `listPublicExpos` — `GET /api/customer/expos`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US11 방문객 박람회 목록 |
| Request | Query `page`, `size` (기본 size 10, `startsAt` 정렬) |
| 정상 | `200` 페이지. `OPEN` 박람회만 `{ expoId, title, venue, startsAt, endsAt, applyStartsAt, applyEndsAt, admissionFee, phase, boothCount }`. `phase` = 모집예정/모집중/개최예정/진행중/진행종료, `boothCount` = 참여 확정(`ASSIGNED`) 부스 수. |
| 실패 | — |
| 보안 | 비인증 허용. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### `getPublicExpo` — `GET /api/customer/expos/{expoId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US11 박람회 상세(헤더) |
| Request | Path `expoId` |
| 정상 | `200` `listPublicExpos` 항목과 동일 구조(단건). |
| 실패 | 없는 박람회·비공개(`DRAFT`) `404` |
| 보안 | 비인증 허용. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### `getPublicExpoBooths` — `GET /api/customer/expos/{expoId}/booths`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US11 박람회 참가 업체(부스) 목록 |
| Request | Path `expoId` |
| 정상 | `200` `{ expoId, title, totalCount, availableCount, booths: [...] }`. 참가 확정(`ASSIGNED`) 부스만 노출. |
| 실패 | 없는 박람회·비공개 `404` |
| 보안 | 비인증 허용. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### `getPublicExpoVehicles` — `GET /api/customer/expos/{expoId}/vehicles`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | US11 박람회 전시 차량 둘러보기 |
| Request | Path `expoId` |
| 정상 | `200` `[{ boothId, boothNo, boothType, title, bannerImageUrl, vehicles: [VehicleResponse, ...] }, ...]`. 차량이 1대 이상 등록된 참가 확정 부스만. |
| 실패 | 없는 박람회·비공개 `404` |
| 보안 | 비인증 허용. |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 2 |

### 2.12 부스 방문 후기 (Review, USER/EXHIBITOR)

### `listReviews` — `GET /api/customer/booths/{boothId}/reviews`

| 항목 | 정의 |
| --- | --- |
| Owner | Review |
| 관련 Story·시나리오 | STORY 7/8 |
| Request | Path `boothId` |
| 정상 | `200 { totalCount, consultReviews: [...], boothReviews: [...] }` — CONSULT/BOOTH 분리 반환 |
| 실패 | - |
| 보안 | 비인증 허용. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `createReview` — `POST /api/customer/booths/{boothId}/reviews`

| 항목 | 정의 |
| --- | --- |
| Owner | Review |
| 관련 Story·시나리오 | STORY 7/8, TASK 8-2 #226 |
| Request | Path `boothId`, Body `{ reviewType, vehicleName, content }`. `reviewType=CONSULT`면 `vehicleName` 필수 |
| 정상 | `201 ReviewResponse`. 작성 전 Expo 내부 API로 자격 확인(`review-eligibility`). |
| 실패 | CONSULT인데 vehicleName 누락 `400` · 자격 미충족 `409 INVALID_STATE` |
| 보안 | `USER` 필수 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### **`addReviewImage` — `POST /api/customer/booths/{boothId}/reviews/{reviewId}/images`**

| 항목 | 정의 |
| --- | --- |
| Owner | Review |
| 관련 Story·시나리오 | TASK 8-2 #226 |
| Request | Path `boothId`, `reviewId`, `multipart/form-data` 파트 `image` |
| 정상 | `201 { imageId, imageUrl }`. 최대 5장, PNG/JPEG/WEBP, 장당 10MB. |
| 실패 | 본인 후기 아님 `403` · 없는 후기 `404` · 5장 초과 `400` · 형식/용량 오류 `400` |
| 보안 | `USER` 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `listForExhibitor` — `GET /api/exhibitor/booths/{boothId}/reviews`

| 항목 | 정의 |
| --- | --- |
| Owner | Review |
| 관련 Story·시나리오 | TASK 7-4 #247 |
| Request | Path `boothId` |
| 정상 | `200 [ExhibitorReviewResponse, ...]` — 작성자 **실명** 포함, 본인 부스만. 소유권은 Expo 내부 API(`owned-by`)로 확인. |
| 실패 | 타 부스 `403` |
| 보안 | `EXHIBITOR` 필수 + 소유권 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### 2.13 상담 슬롯 정원 (Expo)

### `getConsultationSlots` / `updateConsultationSlots` — `GET`/`PUT /api/exhibitor/booths/{boothId}/consultation-slots`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | - |
| Request | GET: Path `boothId`. PUT: Path `boothId`, Body `{ defaultCapacity, slots: [{ date, time, capacity }, ...] }` — 날짜·시간대(10:00~16:00, 30분 단위)별 정원, 0이면 마감 |
| 정상 | `200` 현재/갱신된 정원 설정. 정원 집계는 대기(REQUESTED)+승인(APPROVED)만 차지, 반려·취소는 자리 반환. 이미 접수된 상담은 정원 축소해도 유지 |
| 실패 | 없는 부스 `404` · 본인 배정 부스 아님 `403` · 허용 시간대 아닌 값 `400 VALIDATION_ERROR` |
| 보안 | `EXHIBITOR` 필수 + 소유권(`ASSIGNED`) |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### `getPublicConsultationSlots` — `GET /api/customer/consultations/booths/{boothId}/slots?date=`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | - |
| Request | Path `boothId`, Query `date` |
| 정상 | `200 [{ time, remaining, closed }, ...]` — 시간대별 잔여 인원/마감 여부. 마감 시간대는 고객 화면에서 선택 불가 처리. |
| 실패 | 없는 부스 `404` |
| 보안 | `USER` |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### 2.14 알림 (Expo)

#### `streamNotifications` — `GET /api/exhibitor/notifications/stream` (customer: `/api/customer/notifications/stream`)

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | exhibitor-notifications #250, customer-notifications #252, refactor/notifi-sse #257 |
| Request | 없음(SSE, `text/event-stream`) |
| 정상 | `notificationEmitterRegistry.subscribe(userId)` 구독 스트림 반환, 신규 알림 실시간 push |
| 실패 | - |
| 보안 | `EXHIBITOR`/`USER` 필수, 본인만 구독 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

#### `listNotifications` — `GET /api/exhibitor/notifications` (customer: `/api/customer/notifications`)

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | exhibitor-notifications #250, customer-notifications #252 |
| Request | Query `Pageable`(기본 `size=20`, `sort=createdAt DESC`) |
| 정상 | `200` 페이지 `{ id, type, title, message, relatedId, isRead, createdAt }` |
| 실패 | - |
| 보안 | `EXHIBITOR`/`USER` 필수, 본인 것만 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

#### `getUnreadCount` — `GET /api/exhibitor/notifications/unread-count` (customer: `/api/customer/notifications/unread-count`)

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | notification-all-read #271 |
| Request | 없음 |
| 정상 | 200 { count: N } |
| 실패 | - |
| 보안 | `EXHIBITOR`/`USER` 필수, 본인 것만 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

#### `markRead` — `POST /api/exhibitor/notifications/{notificationId}/read` (customer: `/api/customer/notifications/{notificationId}/read`)

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | exhibitor-notifications #250, customer-notifications #252 |
| Request | Path `notificationId` |
| 정상 | `200`(Void) — `isRead=true` 전환 |
| 실패 | 없는 알림 `404` · 소유권 불일치 `403` |
| 보안 | `EXHIBITOR`/`USER` 필수+ 소유권 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

#### `markAllRead` — `POST /api/exhibitor/notifications/read-all` (customer: `/api/customer/notifications/read-all`)

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | notification-all-read #271 |
| Request | 없음 |
| 정상 | `200`(Void) — 본인 알림 전체 일괄 읽음 처리 |
| 실패 | - |
| 보안 | `EXHIBITOR`/`USER` 필수, 본인 것만 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

#### `deleteNotification` — `DELETE /api/exhibitor/notifications/{notificationId}` (customer: `/api/customer/notifications/{notificationId}`)

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 관련 Story·시나리오 | exhibitor-notifications #250, customer-notifications #252 |
| Request | Path `notificationId` |
| 정상 | `200`(Void) — 알림 삭제 |
| 실패 | 없는 알림 `404` · 소유권 불일치 `403` · 읽지 않은 알림 삭제 시도 `409 INVALID_STATE` |
| 보안 | `EXHIBITOR`/`USER` 필수+ 소유권 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### 2.15 내 후기 관리 (Review, `USER`)

#### `getMyReviews` — `GET /api/customer/reviews/mine`

| 항목 | 정의 |
| --- | --- |
| Owner | Review |
| 관련 Story·시나리오 | - |
| Request | Query `page`, `size`(4개씩) |
| 정상 | `200` 페이지 — 업체명·후기유형·차량명(CONSULT)·사진·작성일, 본인 최신순 |
| 실패 | - |
| 보안 | `USER` 필수 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

#### `updateMyReview` — `PUT /api/customer/booths/{boothId}/reviews/{reviewId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Review |
| 관련 Story·시나리오 | - |
| Request | Path `boothId`,`reviewId`, Body `{ content, vehicleName }`(유형변경 불가) |
| 정상 | - |
| 실패 | 본인 아님 `403` · 없음 `404` |
| 보안 | `USER` 필수 + 소유권 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

#### `deleteMyReview` — `DELETE /api/customer/booths/{boothId}/reviews/{reviewId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Review |
| 관련 Story·시나리오 | - |
| Request | Path `boothId`,`reviewId` |
| 정상 | `200`, 사진포함 삭제, 재작성 가능 |
| 실패 | - |
| 보안 | `USER` 필수 + 소유권 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

---

## 3. 서비스 간 동기 계약 (`/internal/**`)

Gateway·외부 OpenAPI에 노출하지 않는다. 호출 주체는 사용자 토큰이 아니라 호출 관계별 환경 변수 Bearer Token으로 검증하고, Gateway가 만든 `X-Trace-Id`를 전파한다.

| 공통 항목 | 계약 |
| --- | --- |
| 인증 | `Authorization: Bearer <공유 토큰>` (Payment → Expo 호출용). Expo 측은 `${service.token.payment}`, Payment 측은 `${expo.service-token}` 환경변수로 같은 값을 주입(로컬 기본값 `local_dev_payment_token`). 토큰 불일치·누락 `401 UNAUTHENTICATED`. |
| 경로 | `/internal/expo/booth-application-groups/...`. Gateway Route 대상 아님(외부 접근 `404`). |
| Trace | `X-Trace-Id` 필수 전파. |
| 멱등 | 상태 변경 계약(`confirm`)은 `Idempotency-Key`(= `paymentId`) 사용. 같은 Key 재요청은 최초 결과 반환. |
| 실패 원칙 | 호출자가 결과를 확인 못 하면 권한·거래를 성공으로 열지 않는다(`202` 보류 / fail-closed). |

### `getBoothApplicationGroupPaymentContext` — `(Payment → Expo), GET /internal/expo/booth-application-groups/{groupId}/payment-context`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 호출 주체 | Payment (`createBoothPayment` 처리 중) |
| 관련 Story·업무 규칙 | US7 / "승인된 신청만 결제" |
| Request | Path `groupId`. Header `Authorization: Bearer ${service.token.payment}`, `X-Trace-Id` |
| Response | `200` `{ expoId, reviewComplete, applicantId, items: [{ applicationId, boothId, amount }], totalAmount }`. `reviewComplete` = 그룹 내 모든 신청이 심사 완료(`PAYMENT_PENDING` 이상)됐는지. `totalAmount` = 결제 대상 부스 참가비 합. |
| 내부 인증 | Payment만 허용. 토큰 불일치·누락 `401`. |
| Timeout·재시도 | 연결 1s / 응답 2s. 이 호출은 재시도하지 않는다(실패 시 결제 자체를 보류). |
| 멱등 | 조회(부작용 없음). |
| 실패 시 사용자 결과·저장 | 없는 그룹 `404`. Timeout·불명확 시 Payment는 결제를 생성하지 않고 사용자에 `202` + `PENDING`(fail-closed). 저장 없음. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `confirmBoothApplicationGroup` — `(Payment → Expo), POST /internal/expo/booth-application-groups/{groupId}/confirm`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 호출 주체 | Payment (`approveBoothPayment`가 결제를 `PAID`로 확정한 직후) |
| 관련 Story·업무 규칙 | US8 / "정상 결제 완료 건만 확정", "한 자리는 한 업체만 확정" |
| Request | Path `groupId`, Body `{ paymentId, paidAt }`. Header `Authorization: Bearer ${service.token.payment}`, `Idempotency-Key: <paymentId>`, `X-Trace-Id` |
| Response | `200` `{ groupId, results: [{ applicationId, boothId, status }] }`. `status`는 `CONFIRMED` 또는 (자리 선점 시) `REFUND_REQUIRED`. |
| 처리 | 그룹 내 승인된 각 신청을 `PAYMENT_PENDING → CONFIRMED`로 전이하고 자리를 원자적으로 `RESERVED → ASSIGNED` 배정. 다른 신청이 선점했으면 해당 건은 `REFUND_REQUIRED` 반환(Sprint 3 환불 대상). |
| 내부 인증 | Payment만 허용. `service.token.payment` 검증. |
| Timeout·재시도 | 연결 1s / 응답 3s. Payment는 실패·Timeout 시 `Idempotency-Key = paymentId`로 지수 백오프 재시도. |
| 멱등 | 같은 `Idempotency-Key`(= `paymentId`) 재요청은 최초 결과 반환. 이미 `CONFIRMED`면 no-op — 자리 재배정 없음. |
| 실패 시 사용자 결과·저장 | 반영 Timeout이어도 결제는 `PAID` 유지. 확정 전까지 참가업체 마이페이지에 `PAYMENT_PENDING` 표시, 재시도로 `CONFIRMED` 수렴. 매출 원장은 `approveBoothPayment` 단계에서 이미 append(이 호출과 무관, 중복 없음). |
| 상태 | DONE  |
| 추가·변경 Sprint | Sprint 1 |

### `releaseBoothApplicationGroup` — `(Payment → Expo), POST /internal/expo/booth-application-groups/{groupId}/release`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 호출 주체 | Payment (결제 실패·기한 경과 시) |
| 관련 Story·업무 규칙 | US7 결제 실패 / "승인 후 미결제 자리는 풀어준다" |
| Request | Path `groupId`, Body `{ reason }`(선택). Header `Authorization: Bearer ${service.token.payment}`, `X-Trace-Id` |
| Response | `200` `{ groupId, results: [{ applicationId, boothId, status }] }`. 각 신청 `REJECTED`, 자리 `RESERVED → AVAILABLE`. |
| 처리 | 승인으로 잠갔던(`RESERVED`) 자리를 `AVAILABLE`로 되돌리고 그룹 내 신청을 `REJECTED` 처리. `reason`은 반려 사유로 저장. |
| 내부 인증 | Payment만 허용. |
| Timeout·재시도 | 연결 1s / 응답 3s. |
| 멱등 | 이미 `AVAILABLE`/`REJECTED`면 no-op. |
| 실패 시 사용자 결과·저장 | 자리 해제 실패 시 자리는 `RESERVED` 유지, Payment 재시도로 수렴. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 (신청 그룹 모델 확정 시 추가) |

### `getAdmissionContext` — `(Payment → Reservation), GET /internal/reservation/customers/{customerId}/expos/{expoId}/admission-context`

| 항목 | 정의 |
| --- | --- |
| Owner | Reservation |
| 호출 주체 | Payment (당일 유료 입장권 결제 전) |
| 관련 Story·업무 규칙 | US17 / 무료 QR 보유 시 결제 스킵 |
| Request | Path `customerId`, `expoId`. Header `Authorization: Bearer ${SVC_TOKEN_PAYMENT}`, `X-Trace-Id` |
| Response | `200 { expoId, customerId, blockedDates, admissionFee }`. **`blockedDates`**는 요청한 날짜 중 이미 티켓(FREE/PAID 무관)이 있는 날짜 |
| 내부 인증 | Payment만 허용(`service.token.payment` = `SVC_TOKEN_PAYMENT`). |
| Timeout·재시도 | connect/응답 각 5s. 재시도 없음. |
| 멱등 | 조회(부작용 없음). |
| 실패 시 사용자 결과·저장 | 없는 박람회 `404`. Timeout·통신 오류 시 Payment는 `DEPENDENCY_TIMEOUT`으로 받아 결제 진행 안 함(fail-closed, 202). |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `issueAdmissionTicket` — `(Payment → Reservation), POST /internal/reservation/customers/{customerId}/expos/{expoId}/admission-tickets`

| 항목 | 정의 |
| --- | --- |
| Owner | Reservation |
| 호출 주체 | Payment (당일 입장권 결제 승인 직후) |
| 관련 Story·업무 규칙 | US18 / 결제 완료 건만 당일 입장권 발급 |
| Request | Path `customerId`, `expoId`. Body `{ visitDates: [...] }`(다중 날짜). Header `Authorization: Bearer ${SVC_TOKEN_PAYMENT}`, `X-Trace-Id` |
| Response | 200 { expoId, tickets: [{ ticketId, customerId, expoId, visitDate, ticketType: PAID, status: ISSUED, qrToken, qrImageBase64, issuedAt }, ...] } |
| 내부 인증 | Payment만 허용. |
| Timeout·재시도 | connect/응답 각 5s. |
| 멱등 | 이미 `PAID`인 날짜는 그대로 반환(재시도 안전) |
| 실패 시 사용자 결과·저장 | 과거 날짜 `400` · 이미 `FREE` 티켓 존재 날짜 `409` |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `hasTicketForDate` — `(Expo → Reservation), GET /internal/reservation/customers/{customerId}/expos/{expoId}/tickets/{visitDate}`

| 항목 | 정의 |
| --- | --- |
| Owner | Reservation |
| 호출 주체 | Expo (`applyConsultation` 상담 신청 접수 중) |
| 관련 Story·업무 규칙 | US13·US15 / 그 박람회·그 날짜 입장권 보유자만 상담 신청 가능 |
| Request | Path `customerId`, `expoId`, `visitDate`. Header `Authorization: Bearer ${SVC_TOKEN_EXPO}`, `X-Trace-Id` |
| Response | `200 { hasTicket: boolean }`. 티켓 타입(FREE/PAID)·상태(ISSUED/USED) 무관 — 그 날짜에 티켓이 존재하기만 하면 `true` |
| 내부 인증 | Expo만 허용(`service.token.expo` = `SVC_TOKEN_EXPO`). |
| Timeout·재시도 | connect/응답 각 5s. 재시도 없음(예외를 삼키지 않고 그대로 던짐). |
| 멱등 | 조회(부작용 없음). |
| 실패 시 사용자 결과·저장 | 확인 불가 시 Expo는 `DEPENDENCY_TIMEOUT`으로 받아 상담 신청을 열지 않음(`202`, fail-closed). 상담 데이터 저장 안 됨. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `getInternalUser` — `(Expo → Identity), GET /internal/identity/users/{userId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Identity |
| 호출 주체 | Expo (부스 지도의 배정 업체 회사명·업종 표시, Admin 참가 신청 심사 화면의 "신청 업체 대표 정보") |
| 관련 Story·업무 규칙 | US5·US6 심사 화면, 공개 부스 지도 |
| Request | Path `userId`. Header `Authorization: Bearer ${service.token.expo}` (= `SVC_TOKEN_EXPO`) |
| Response | `200` `{ companyName, industry, businessNo, representativeName, email }` (내부 조회용 최소 필드). |
| 내부 인증 | Expo만 허용. 토큰 불일치·누락 `401 UNAUTHENTICATED`. |
| Timeout·재시도 | Expo 측 `identity` 클라이언트 설정을 따름. |
| 멱등 | 조회(부작용 없음). |
| 실패 시 사용자 결과·저장 | 없는 사용자 `404 NOT_FOUND`. |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 1 |

### `getExpoInternalInfo` — `(Reservation → Expo), GET /internal/expo/expos/{expoId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 호출 주체 | Reservation (방문 예약 신청 시점에 박람회 공개 상태·시작일 확인, 무료/유료 판정) |
| 관련 Story·업무 규칙 | US12 / 시작 전 무료 QR, 시작 후 유료 전환 |
| Request | Path `expoId`. Header `Authorization: Bearer ${service.token.reservation}` (= `SVC_TOKEN_RESERVATION`) |
| Response | `200` `{ expoId, status, startsAt, endsAt, admissionFee }`. |
| 내부 인증 | Reservation만 허용. 토큰 불일치·누락 `401 UNAUTHENTICATED`. |
| Timeout·재시도 | Reservation 측 `expo` 클라이언트 설정을 따름. |
| 멱등 | 조회(부작용 없음). |
| 실패 시 사용자 결과·저장 | 없는 박람회 `404 NOT_FOUND`. 확인 불가 시 Reservation은 예약을 확정하지 않음(fail-closed). |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 2 |

### `resolveTicketByQrToken` — `(Expo → Reservation), GET /internal/reservation/tickets/resolve?qrToken=`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 호출 주체 | Expo (`scanLead`) |
| 관련 Story·업무 규칙 | TASK 11-1 #175 |
| Request | Query `qrToken`. Header `Authorization: Bearer ${SVC_TOKEN_EXPO}` |
| Response | `200 { customerId, ticketId, expoId, visitDate }`. 조회 전용, 티켓 상태 불변(체크인과 분리). |
| 내부 인증 | Expo만 허용 |
| 멱등 | 조회(부작용 없음) |
| 실패 시 사용자 결과·저장 | 무효/만료 QR `404`. 타임아웃 시 Expo는 리드 생성 안 함(`202`, fail-closed) |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `sendMail` — `(Expo → Identity), POST /internal/identity/mails`

| 항목 | 정의 |
| --- | --- |
| Owner | Identity |
| 호출 주체 | Expo (`sendInfo`) |
| 관련 Story·업무 규칙 | TASK 11-4 #178 |
| Request | Body `{ to, subject, body }`. Header `Authorization: Bearer ${SVC_TOKEN_EXPO}` |
| Response | `200`. 기존 `MailSender`(비밀번호 재설정과 동일) 재사용 |
| 내부 인증 | Expo만 허용 |
| 멱등 | 없음(발송은 부작용 있음, 재시도 시 중복 발송 가능 — 후속 보완 여지) |
| 실패 시 사용자 결과·저장 | `MailSender` 예외 그대로 전파 → `500`, Expo 쪽 `lead.status` 안 바뀜(재시도 가능) |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `getReviewEligibility` — `(Review → Expo), GET /internal/expo/booths/{boothId}/review-eligibility`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 호출 주체 | Review (`createReview`) |
| 관련 Story·업무 규칙 | TASK 7-2 #232, TASK 8-3 #227 |
| Request | Query `customerId`, `reviewType`. Header `Authorization: Bearer ${SVC_TOKEN_REVIEW}` |
| Response | `200 { eligible, boothNo }`. `CONSULT`: 상담 `COMPLETED`+5일 이내. `BOOTH`: Lead 존재+방문 예정일 경과+5일 이내. |
| 내부 인증 | Review만 허용 |
| 멱등 | 조회 |
| 실패 시 사용자 결과·저장 | 없는 부스 `404` |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `getBoothOwnership` — `(Review → Expo), GET /internal/expo/booths/{boothId}/owned-by`

| 항목 | 정의 |
| --- | --- |
| Owner | Expo |
| 호출 주체 | Review (`listForExhibitor`) |
| 관련 Story·업무 규칙 | TASK 7-4 #247 |
| Request | Query `exhibitorId`. Header `Authorization: Bearer ${SVC_TOKEN_REVIEW}` |
| Response | `200 { owned: boolean }` |
| 내부 인증 | Review만 허용 |
| 멱등 | 조회 |
| 실패 시 사용자 결과·저장 | `owned=false`면 Review가 `403` 반환 |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `getCustomerName` — `(Review → Identity), GET /internal/identity/users/{customerId}`

| 항목 | 정의 |
| --- | --- |
| Owner | Identity |
| 호출 주체 | Review (`createReview`, 작성자 이름 표시용) |
| 관련 Story·업무 규칙 | TASK 8-2 #226 |
| Request | Header `Authorization: Bearer ${SVC_TOKEN_REVIEW}` |
| Response | `200 { name, ... }` — 기존 `getInternalUser` 계약 재사용 |
| 내부 인증 | Review 포함 다중 호출자 허용(기존 Expo 컨벤션과 동일 엔드포인트 공유) |
| 멱등 | 조회 |
| 실패 시 사용자 결과·저장 | 없는 사용자 시 `"고객"`으로 대체(빈 이름 방지, fail-open) |
| 상태 | DONE |
| 추가·변경 Sprint | Sprint 3 |

### `cancelAdmissionTicket` — `(Payment → Reservation), POST /internal/reservation/tickets/{ticketId}/cancel`

| 항목 | 정의 |
| --- | --- |
| Owner | Reservation |
| 호출 주체 | Payment (`refundAdmissionTicket` 환불 처리 중) |
| 관련 Story·업무 규칙 | US20 환불 시 QR 무효화 |
| Request | Path `ticketId`. Header `Authorization: Bearer ${SVC_TOKEN_PAYMENT}` |
| Response | `200` — 티켓 `status: CANCELLED` 전환 |
| 내부 인증 | Payment만 허용 |
| 멱등 | 이미 `CANCELLED`면 no-op |
| 실패 시 사용자 결과·저장 | 없는 티켓 `404`. 실패해도 환불 자체는 진행 |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

### `applyScheduleChange` — `(Expo → Reservation), POST /internal/reservation/expos/{expoId}/tickets/apply-schedule-change`

| 항목 | 정의 |
| --- | --- |
| Owner | Reservation |
| 호출 주체 | Expo (박람회 개최기간 변경 시) |
| 관련 Story·업무 규칙 | 박람회 일정 변경에 따른 기존 발급 티켓 재검증·정리 |
| Request | Path `expoId`, Query `newStartsAt`, `newEndsAt`. Header `Authorization: Bearer ${SVC_TOKEN_EXPO}` |
| Response | `200 { tickets: [{ customerId, visitDate, cancelled }, ...] }` |
| 내부 인증 | Expo만 허용 |
| 멱등 | - |
| 실패 시 사용자 결과·저장 | newStartsAt > newEndsAt |
| 상태 | IMPLEMENTED |
| 추가·변경 Sprint | Sprint 3 |

---

## 4. 비동기 Event 계약

`N/A — Sprint 1 범위에 도메인 Event 없음.` 서비스 간 동기 호출로 처리한다.

---

## 5. operationId 목록

### 5.1 Sprint 1 operationId 목록

| operationId | method/path | Owner | Story | 상태 |
| --- | --- | --- | --- | --- |
| signUpExhibitor | POST /api/auth/exhibitors/signup | Identity | US2 | IMPLEMENTED |
| signIn | POST /api/auth/signin | Identity | 관리자·참가업체(US2)·회원(US12) | IMPLEMENTED |
| refresh | POST /api/auth/refresh | Identity | 로그인 유지 | IMPLEMENTED |
| logout | POST /api/auth/logout | Identity | 로그아웃 | IMPLEMENTED |
| registerExpo | POST /api/admin/expos | Expo | US1 | IMPLEMENTED |
| openExpo | POST /api/admin/expos/{expoId}/open | Expo | US1 | IMPLEMENTED |
| listExposForAdmin | GET /api/admin/expos | Expo | US1, US5 | IMPLEMENTED |
| getExpoBoothsForAdmin | GET /api/admin/expos/{expoId}/booths | Expo | US1 | IMPLEMENTED |
| listOpenExpos | GET /api/exhibitor/expos | Expo | US3 | IMPLEMENTED |
| getExpoBooths | GET /api/exhibitor/expos/{expoId}/booths | Expo | US3 | IMPLEMENTED |
| applyBooth | POST /api/exhibitor/booth-applications | Expo | US4 | IMPLEMENTED |
| updateBoothApplicationDraft | PATCH /api/exhibitor/booth-applications/groups/{groupId} | Expo | US4 | IMPLEMENTED |
| submitBoothApplicationDraft | POST /api/exhibitor/booth-applications/groups/{groupId}/submit | Expo | US4 | IMPLEMENTED |
| deleteBoothApplicationGroup | DELETE /api/exhibitor/booth-applications/groups/{groupId} | Expo | US4 | IMPLEMENTED |
| listMyBoothApplications | GET /api/exhibitor/booth-applications | Expo | US9 | IMPLEMENTED |
| getBoothApplicationGroupDetail | GET /api/exhibitor/booth-applications/groups/{groupId} | Expo | US6, US9 | IMPLEMENTED |
| listBoothApplications | GET /api/admin/booth-applications | Expo | US5 | IMPLEMENTED |
| approveBoothApplication | POST /api/admin/booth-applications/{applicationId}/approve | Expo | US6 | IMPLEMENTED |
| rejectBoothApplication | POST /api/admin/booth-applications/{applicationId}/reject | Expo | US6 | IMPLEMENTED |
| createBoothPayment | POST /api/exhibitor/payments | Payment | US7 | PLANNED |
| approveBoothPayment | POST /api/exhibitor/payments/{paymentId}/approve | Payment | US7, US8 | PLANNED |
| getMyPayment | GET /api/exhibitor/payments/{paymentId} | Payment | US7, US9 | PLANNED |
| updateBoothContent | PUT /api/exhibitor/booths/{boothId}/content | Expo | US10 | IMPLEMENTED |
| updateBoothBannerImage | PUT /api/exhibitor/booths/{boothId}/banner-image | Expo | US10 | IMPLEMENTED |
| getBoothApplicationGroupPaymentContext (internal) | GET /internal/expo/booth-application-groups/{groupId}/payment-context | Expo | US7 | IMPLEMENTED |
| confirmBoothApplicationGroup (internal) | POST /internal/expo/booth-application-groups/{groupId}/confirm | Expo | US8 | IMPLEMENTED |
| releaseBoothApplicationGroup (internal) | POST /internal/expo/booth-application-groups/{groupId}/release | Expo | US7 | IMPLEMENTED |
| getInternalUser (internal) | GET /internal/identity/users/{userId} | Identity | US5, US6 심사 화면 | IMPLEMENTED |

Git `openapi.yaml`의 `operationId`·method/path와 정확히 일치시킨다.

### 5.2 Sprint 2 operationId 목록

| operationId | method/path | Owner | Story | 상태 |
| --- | --- | --- | --- | --- |
| signUp | POST /api/auth/signup | Identity | US12 | IMPLEMENTED |
| getMyProfile | GET /api/auth/me | Identity | US9 | IMPLEMENTED |
| requestPasswordReset | POST /api/auth/password-reset | Identity | 비밀번호 재설정(독립 기술 Story) | IMPLEMENTED |
| confirmPasswordReset | POST /api/auth/password-reset/confirm | Identity | 비밀번호 재설정(독립 기술 Story) | IMPLEMENTED |
| listPublicExpos | GET /api/customer/expos | Expo | US11 | IMPLEMENTED |
| getPublicExpo | GET /api/customer/expos/{expoId} | Expo | US11 | IMPLEMENTED |
| getPublicExpoBooths | GET /api/customer/expos/{expoId}/booths | Expo | US11 | IMPLEMENTED |
| getPublicExpoVehicles | GET /api/customer/expos/{expoId}/vehicles | Expo | US11 | IMPLEMENTED |
| getBoothManageDetail | GET /api/exhibitor/booths/{boothId} | Expo | US10 | IMPLEMENTED (테스트 미작성) |
| listVehicles | GET /api/exhibitor/booths/{boothId}/vehicles | Expo | US14 | IMPLEMENTED |
| registerVehicle | POST /api/exhibitor/booths/{boothId}/vehicles | Expo | US14 | IMPLEMENTED |
| updateVehicle | PUT /api/exhibitor/booths/{boothId}/vehicles/{vehicleId} | Expo | US14 | IMPLEMENTED |
| deleteVehicle | DELETE /api/exhibitor/booths/{boothId}/vehicles/{vehicleId} | Expo | US14 | IMPLEMENTED |
| addVehicleImage | POST /api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images | Expo | US14 | IMPLEMENTED |
| deleteVehicleImage | DELETE /api/exhibitor/booths/{boothId}/vehicles/{vehicleId}/images/{imageId} | Expo | US14 | IMPLEMENTED |
| applyVisit | POST /api/customer/reservations | Reservation | US12 | IMPLEMENTED |
| listMyTickets | GET /api/customer/reservations | Reservation | US9, US16 | IMPLEMENTED |
| selfCheckIn | POST /api/customer/reservations/{ticketId}/check-in | Reservation | US23 | IMPLEMENTED |
| applyConsultation | POST /api/customer/consultations | Expo | US13, US15 | IMPLEMENTED |
| listMyConsultations | GET /api/customer/consultations | Expo | US13, US15 | IMPLEMENTED |
| getExhibitorConsultations | GET /api/exhibitor/consultations | Expo | US16 | IMPLEMENTED |
| approveConsultation | POST /api/exhibitor/consultations/{consultationId}/approve | Expo | US16 | IMPLEMENTED |
| rejectConsultation | POST /api/exhibitor/consultations/{consultationId}/reject | Expo | US16 | IMPLEMENTED |
| pay (Mock) | POST /api/exhibitor/payments | Payment | US7 | IMPLEMENTED |
| getPaymentStatus (Mock) | GET /api/exhibitor/payments/{bookingId}/status | Payment | US7, US9 | IMPLEMENTED |
| getMyPayments (Mock) | GET /api/exhibitor/payments | Payment | US9 | IMPLEMENTED |
| payAdmission (Mock) | POST /api/customer/admission-payments | Payment | US17, US18 | IMPLEMENTED |
| getAdmissionContext (internal) | GET /internal/reservation/customers/{customerId}/expos/{expoId}/admission-context | Reservation | US17 | IMPLEMENTED |
| issueAdmissionTicket (internal) | POST /internal/reservation/customers/{customerId}/expos/{expoId}/admission-tickets | Reservation | US18 | IMPLEMENTED |
| hasTicketForDate (internal) | GET /internal/reservation/customers/{customerId}/expos/{expoId}/tickets/{visitDate} | Reservation | US13, US15 | IMPLEMENTED |
| getExpoInternalInfo (internal) | GET /internal/expo/expos/{expoId} | Expo | US12 | IMPLEMENTED |

### 5.3 Sprint 3 operationId 목록

| operationId | method/path | Owner | Story | 상태 |
| --- | --- | --- | --- | --- |
| updateConsultation | PUT /api/customer/consultations/{consultationId} | Expo | US13, US15 | IMPLEMENTED |
| cancelConsultation | POST /api/customer/consultations/{consultationId}/cancel | Expo | US13, US15 | IMPLEMENTED |
| completeConsultation | POST /api/exhibitor/consultations/{consultationId}/complete | Expo | US16 | IMPLEMENTED |
| markNoShow | POST /api/exhibitor/consultations/{consultationId}/no-show | Expo | US16 | IMPLEMENTED |
| regenerateConsultationAiSummary | POST /api/exhibitor/consultations/{consultationId}/ai-summary/regenerate | Expo | STORY 9 #156 | IMPLEMENTED |
| getReviewContext | GET /api/customer/consultations/{consultationId}/review-context | Expo | TASK 8-3 #227 | IMPLEMENTED |
| draftReview | POST /api/customer/consultations/{consultationId}/review-draft | Expo | TASK 8-3 #227 | IMPLEMENTED |
| listMyBooths | GET /api/exhibitor/booths/mine | Expo | STORY 11 #173 (PR #203) | IMPLEMENTED |
| scanLead | POST /api/exhibitor/booths/{boothId}/leads | Expo | TASK 11-2 #176 | IMPLEMENTED |
| listLeads | GET /api/exhibitor/booths/{boothId}/leads | Expo | TASK 11-2 #176 | IMPLEMENTED |
| generateEmailSummary | POST /api/exhibitor/leads/{leadId}/summary | Expo | TASK 11-3 #177 | IMPLEMENTED |
| sendInfo | POST /api/exhibitor/leads/{leadId}/send-info | Expo | TASK 11-4 #178 | IMPLEMENTED |
| getBoothStats | GET /api/exhibitor/booths/{boothId}/stats | Expo | TASK 7-4 #247 | IMPLEMENTED |
| listReviews | GET /api/customer/booths/{boothId}/reviews | Review | STORY 7 #70, STORY 8 #71 | IMPLEMENTED |
| createReview | POST /api/customer/booths/{boothId}/reviews | Review | TASK 8-2 #226 | IMPLEMENTED |
| addReviewImage | POST /api/customer/booths/{boothId}/reviews/{reviewId}/images | Review | TASK 8-2 #226 | IMPLEMENTED |
| listForExhibitor | GET /api/exhibitor/booths/{boothId}/reviews | Review | TASK 7-4 #247 | IMPLEMENTED |
| resolveTicketByQrToken (internal) | GET /internal/reservation/tickets/resolve?qrToken= | Reservation | TASK 11-1 #175 | IMPLEMENTED |
| sendMail (internal) | POST /internal/identity/mails | Identity | TASK 11-4 #178 | IMPLEMENTED |
| getReviewEligibility (internal) | GET /internal/expo/booths/{boothId}/review-eligibility | Expo | TASK 7-2 #232, TASK 8-3 #227 | IMPLEMENTED |
| getBoothOwnership (internal) | GET /internal/expo/booths/{boothId}/owned-by | Expo | TASK 7-4 #247 | IMPLEMENTED |
| refundBoothPayment | POST /api/exhibitor/payments/{bookingId}/refund | Payment | US20 | IMPLEMENTED |
| refundAdmissionTicket | POST /api/customer/admission-payments/{id}/refund | Payment | US20 | IMPLEMENTED |
| getPaymentStats | GET /api/admin/stats/payments | Payment | US21 | IMPLEMENTED |
| getExpoRevenue | GET /api/admin/expos/{expoId}/revenue | Payment | US22 | IMPLEMENTED |
| consentLead | POST /api/exhibitor/leads/{leadId}/consent | Expo | STORY 11 | IMPLEMENTED |
| updateLeadEmail | PUT /api/exhibitor/leads/{leadId}/email | Expo | STORY 11 | IMPLEMENTED |
| getConsultationSlots / updateConsultationSlots | GET/PUT /api/exhibitor/booths/{boothId}/consultation-slots | Expo | 2026-09-20 작업분 | IMPLEMENTED |
| getPublicConsultationSlots | GET /api/customer/consultations/booths/{boothId}/slots | Expo | 2026-09-20 작업분 | IMPLEMENTED |
| streamNotifications | GET /api/exhibitor·customer/notifications/stream | Expo | #250, #252, #257 | IMPLEMENTED |
| listNotifications | GET /api/exhibitor·customer/notifications | Expo | #250, #252 | IMPLEMENTED |
| getUnreadCount | GET /api/exhibitor·customer/notifications/unread-count | Expo | #271 | IMPLEMENTED |
| markRead | POST /api/exhibitor·customer/notifications/{id}/read | Expo | #250, #252 | IMPLEMENTED |
| markAllRead | POST /api/exhibitor·customer/notifications/read-all | Expo | #271 | IMPLEMENTED |
| deleteNotification | DELETE /api/exhibitor·customer/notifications/{id} | Expo | #250, #252 | IMPLEMENTED |
| getMyReviews | GET /api/customer/reviews/mine | Review | 2026-09-20 마이페이지 | IMPLEMENTED |
| updateMyReview | PUT /api/customer/booths/{boothId}/reviews/{reviewId} | Review | 2026-09-20 마이페이지 | IMPLEMENTED |
| deleteMyReview | DELETE /api/customer/booths/{boothId}/reviews/{reviewId} | Review | 2026-09-20 마이페이지 | IMPLEMENTED |
| cancelAdmissionTicket (internal) | POST /internal/reservation/tickets/{ticketId}/cancel | Reservation | US20 | IMPLEMENTED |
| applyScheduleChange (internal) | POST /internal/reservation/expos/{expoId}/tickets/apply-schedule-change | Reservation | 박람회 일정변경 | IMPLEMENTED |

---

## 6. Sprint 1 이후 (`PLANNED`, 이 문서 범위 밖)

| 범위 | Story | Sprint |
| --- | --- | --- |
| 부스 콘텐츠 조회 API + 방문자 공개 열람(게시글·홈) | US10 조회분, US11 | 2 |
| 부스 콘텐츠 Acceptance Test (STORY 3 이월분) | US10 | 2 |
| payment 모듈 Acceptance Test (결제 생성·승인·매출 원장·멱등·기한·Timeout) | US7, US8 | 2 |
| 참가업체 로그인 이메일 전환 마무리 (문서·프론트 정합) | US2 | 2 |
| 고객 회원가입·무료 QR 발급(`issueFreeTicket` 내부 계약) | US12 | 2 |
| 고객 상담·시승 신청, 세부 정보·후기 | US13~US16 | 2 |
| 입장 현황 조회(Admin) | US23 | 3 |

## **7. 변경 이력**

| **버전·기준 시점** | **변경한 요구사항** | **변경 이유** | **관련 작업** |
| --- | --- | --- | --- |
| v0.1 / 2026-08-31 | 초안 작성 | 초안 작성 | - |
| v0.2 / 2026-09-04 | Sprint 1에 맞춰 전체 수정 | 문서 동기화 | 전체 |
| v0.3 / 2026-09-10 | 비밀번호 재설정(`requestPasswordReset`, `confirmPasswordReset`) 추가. 엔드포인트  반영 -- `signUp`, `getMyProfile`, 고객 박람회 공개 조회 4종(2.11), 전시 차량 6종(2.10), 부스 콘텐츠 조회, 결제 Mock 4종(2.6.1), 내부 API 2종(`getInternalUser`, `getExpoInternalInfo`) | 코드-문서 동기화 | Identity 비밀번호 재설정, 전체 엔드포인트 감사 |
| v0.4 / 2026-09-22 | Review/Expo Owner 정정, Payment 보안헤더·환불·통계, 상담슬롯·알림·리드보강·내후기관리 엔드포인트 추가, 내부계약 상태·필드 정정(다중날짜, blockedDates), PLANNED 목록 정리 | 코드-문서 동기화 | 전체 엔드포인트 재감사 |
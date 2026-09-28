# 장남장녀단 Mobility Expo: 모빌리티 쇼 예약 관리 플랫폼

멋사 백엔드 24기 심화 프로젝트입니다. Agile과 MSA로 4주간(2026.08.31 ~ 09.30) 진행한 모빌리티 쇼(자동차 박람회) 예약, 참가, 사후 경험 통합 플랫폼입니다.

배포 주소: https://mobility-expo.vercel.app

## 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 개발 기간 | 2026.08.31 ~ 2026.09.30 (4주, Sprint 1 ~ 3 + Week 4 안정화) |
| 팀 구성 | 4인 (김재혁, 김다솜, 이동건, 정의찬) |
| 주요 사용자 | 참관객(자동차 구매나 시승에 관심 있는 일반회원, 비회원 포함), 참가업체(부스에서 차량을 전시하고 상담하는 업체), 관리자(박람회를 기획하고 운영하는 주체) |
| 해결하려는 문제 | 참관객: 박람회 정보가 흩어져 있고, 다녀온 뒤 본 차량 정보가 정리되지 않음<br>참가업체: 현장에서 만난 방문객 데이터를 이후에 활용하지 못하고 상담이 그 자리에서 끊김<br>관리자: 참가업체 심사, 부스 배치, 입장과 매출 현황을 한곳에서 관리할 수단이 없음 |
| 핵심 가치 | 예약, 참가, 사후 경험을 하나로 연결: 사전 예약(QR)부터 체크인, 상담, 후기까지 한 플랫폼에서<br>현장 고객을 놓치지 않는 리드 관리: QR 스캔으로 방문 기록을 남기고 상담 요약과 안내 메일까지 연결<br>AI로 줄이는 반복 작업: 자연어 차량 검색, 상담 요약, 이메일 초안 생성<br>역할별 권한과 안전한 거래: 서비스 분리(MSA), JWT 인증, 결제 검증과 중복 결제 방지 |

## 진입점

* Notion: https://app.notion.com/p/4-3c973873401a804da04afc2abb3c357a
* GitHub Project: https://github.com/likelion-backend-24th/Final-Project-Team4
* Issue 템플릿: [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE)
* 문서 인덱스 (Notion 원본 링크와 Git Snapshot 목록): [docs/README.md](docs/README.md)

## 서비스 소개

참관객은 박람회를 찾아 예약하고 다녀오고, 참가업체는 부스를 운영하며 고객을 만나고, 관리자는 박람회 전체를 운영하는 세 역할을 하나로 묶었습니다.

### 참관객 (일반회원)

* 박람회, 부스, 전시 차량 공개 조회 (비회원 포함), 목록 정렬과 필터
* 이메일 인증 회원가입, 소셜 로그인 (Google, Kakao, Naver)
* 무료 QR 사전 예약(날짜별 발급), 박람회 시작 후 당일 유료 입장권 결제(PortOne)
* QR 셀프 체크인, 마이페이지 입장권과 결제 내역, 입장권 환불
* 참가업체 차량 상담 신청(날짜와 시간대별 접수 정원 적용)
* 상담 후기와 부스 후기 작성(사진 첨부), 실시간 알림
* 자연어 차량 검색 (Gemini): 예) "3000만원대 가솔린 SUV"

### 참가업체

* 부스 참가 신청(다중 선택, 임시저장), 승인 후 참가비 결제, 참가 취소와 환불
* 부스 콘텐츠, 전시 차량, 배너 이미지 관리, 부스 통계
* 상담 신청 승인과 반려, 상담 내용 AI 요약 (Gemini)
* 현장 QR 스캔으로 리드(방문 기록) 수집, AI 이메일 초안 생성 후 고객에게 발송
* 실시간 알림, 내 부스 후기 조회

### 관리자

* 박람회 등록, 수정, 삭제, 공개 전환, 부스 배치도 관리
* 참가업체 부스 신청 심사(승인, 반려), 참가업체와 회원 관리(정지, 해제)
* 대시보드, 박람회별 매출, 결제와 환불 통계, 입장 통계

## 기술 스택

| 영역 | 기술 |
|---|---|
| Backend | Java 21, Spring Boot 3.3, Spring Security, Spring Data JPA, Spring Cloud Gateway, Flyway |
| Frontend | React 19, Vite, Tailwind CSS 4, shadcn/ui (Radix UI), react-router-dom, axios |
| Data | MySQL 8.0 (서비스별 DB), Redis 7.4 (refresh 토큰, 이메일 인증 코드 등) |
| 외부 연동 | PortOne V2 (결제), Google Gemini (AI), Gmail SMTP (메일), OAuth2 (Google, Kakao, Naver) |
| Infra | Docker Compose, Nginx (HTTPS), Let's Encrypt, Oracle Cloud, Vercel, GitHub Actions, ghcr.io |

## 아키텍처

```
브라우저 -> Vercel (React 정적 배포)
   |
   +-> Nginx :443 (HTTPS) -> Gateway :8080 -> identity     :8081  (MySQL identity, Redis)
                                            -> expo         :8082  (MySQL expo, 업로드 볼륨)
                                            -> payment      :8083  (MySQL payment)
                                            -> reservation  :8084  (MySQL reservation)
                                            -> review       :8085  (MySQL review, 업로드 볼륨)
```

| 서비스 | 책임 |
|---|---|
| gateway | JWT 검증, `X-User-*` 헤더 주입, 서비스 라우팅, CORS |
| identity | 가입, 로그인, 토큰 재발급, 소셜 로그인, 비밀번호 재설정, 메일 발송, 회원 관리 |
| expo | 박람회, 부스, 부스 신청 심사, 차량, 상담, 리드, 알림(SSE), AI 기능 |
| payment | 부스 참가비와 당일 입장권 결제, 환불, 매출과 통계 (PortOne 검증) |
| reservation | 방문 예약, QR 티켓, 체크인, 입장 통계 |
| review | 상담 후기, 부스 후기, 후기 사진 |

서비스는 각자 자기 DB만 사용하고, 서비스 간 호출은 `/internal/**` 내부 API(서비스 토큰 인증)로만 이뤄집니다. 자세한 내용은 [아키텍처](docs/아키텍처.md), [서비스 경계](docs/서비스경계.md), [시퀀스](docs/시퀀스.md)를 참고하세요.

## 프로젝트 구조

```
.
├── backend/                Gradle 멀티모듈 (gateway, identity, expo, payment, reservation, review, common)
├── frontend/               React + Vite
├── docs/                   Git Snapshot 문서 (Notion 원본 기준)
├── infra/mysql/init/       MySQL 초기화 스크립트 (서비스별 DB 생성)
├── nginx/conf.d/           운영 Nginx 설정
├── docker-compose.yml      로컬 인프라 (MySQL, Redis)
├── docker-compose.prod.yml 운영 배포 (전체 서비스)
└── .github/workflows/      CI (ci.yml), CD (deploy.yml)
```

## 로컬 실행

사전 조건: JDK 21, Docker Compose v2, Node.js

```bash
# 1. 환경 변수 (값은 로컬용 가짜 값, 소셜 로그인 OAuth 값은 직접 채워야 함)
cp .env.example .env

# 2. 인프라 (MySQL, Redis)
docker compose up -d --wait

# 3. 백엔드 (서비스별로 실행, 또는 IDE 실행 설정 사용)
cd backend
./gradlew :gateway:bootRun
./gradlew :identity:bootRun
./gradlew :expo:bootRun
./gradlew :payment:bootRun
./gradlew :reservation:bootRun
./gradlew :review:bootRun

# 4. 프론트엔드 (http://localhost:5173)
cd frontend
npm install
npm run dev
```

* 관리자 계정은 가입 API가 없고 identity 기동 시 `ADMIN_EMAIL`, `ADMIN_PASSWORD`로 생성됩니다.
* 박람회는 관리자가 등록하고 공개(`OPEN`)해야 비회원 목록에 노출됩니다.
* 환경 변수 전체 목록과 운영 배포 방법은 [실행, 배포 가이드](docs/실행,배포가이드.md)를 참고하세요.

## 테스트

```bash
cd backend
./gradlew test
```

* 테스트에는 로컬 MySQL, Redis가 필요합니다(위 2번 단계).
* 전체 스택 기동이 필요한 e2e 테스트는 `./gradlew :reservation:acceptanceTest`로 별도 실행합니다.
* 실행 결과와 테스트별 근거는 [테스트 체크리스트](docs/테스트%20체크리스트.md), 전략은 [테스트 전략](docs/테스트전략.md)에 있습니다.

## CI/CD

`dev` 브랜치에 push하면 GitHub Actions가 다음 순서로 실행됩니다.

1. CI: 전체 테스트 실행 후 서비스별 이미지를 ghcr.io에 push
2. CD: CI가 성공하면 Oracle Cloud 서버에 SSH로 접속해 `docker compose pull`과 `up -d` 실행
3. 프론트엔드는 `frontend/**` 변경 시 Vercel이 자동 빌드하고 배포

`frontend/**`나 문서만 바뀐 push는 백엔드 CI와 CD가 실행되지 않습니다.

## 문서

| 문서 | 설명 |
|---|---|
| [요구사항정의서](docs/요구사항정의서.md) | 시나리오와 업무 규칙 |
| [화면설계](docs/화면설계.md) | 화면 구성 |
| [서비스 경계](docs/서비스경계.md) | 서비스별 책임과 데이터 소유 |
| [아키텍처](docs/아키텍처.md) | 시스템 구성 |
| [ERD](docs/ERD.md) | 데이터 모델 |
| [API](docs/API.md) | HTTP와 내부 API 계약 |
| [권한 Matrix](docs/권한매트릭스.md) | 역할별 접근 권한 |
| [시퀀스](docs/시퀀스.md) | 주요 흐름 |
| [공통 완료 기준](docs/Definition_of_Done.md) | PBI별 완료 판정과 Evidence |
| [테스트 전략](docs/테스트전략.md) | 테스트 수준과 시나리오 |
| [테스트 체크리스트](docs/테스트%20체크리스트.md) | 테스트 실행 결과 |
| [실행, 배포 가이드](docs/실행,배포가이드.md) | 환경 변수, 로컬 실행, 운영 배포 |
| [Sprint Review](docs/스프린트리뷰.md) | 스프린트별 결과 |

문서 원본은 Notion이며 Git의 `docs/`는 Snapshot입니다. 전체 목록은 [docs/README.md](docs/README.md)를 참고하세요.

## 팀 구성

|이름|역할|
|-|-|
|김재혁|팀장|
|김다솜|팀원|
|이동건|팀원|
|정의찬|팀원|

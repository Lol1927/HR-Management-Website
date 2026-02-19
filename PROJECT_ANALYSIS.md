# HR-Management-Website 프로젝트 전체 분석 보고서

> 분석일: 2026-02-15
> 분석 범위: backend, hr-management-web, Event-Job-Finder

---

## 1. 프로젝트 개요

이벤트(공연/전시/스포츠행사) 인력 파견 관리 시스템으로, 3개의 서브 프로젝트로 구성됨.

| 프로젝트 | 역할 | 상태 |
|----------|------|------|
| **backend** | 관리자용 Serverless API (AWS Lambda + DynamoDB) | 운영 중 (배포 완료) |
| **hr-management-web** | 관리자용 프론트엔드 (React) | 운영 중 |
| **Event-Job-Finder** | 일반 사용자(구직자)용 서비스 | Replit UI 프로토타입만 존재, 실제 백엔드 없음 |

### 시스템 흐름
```
[관리자] → hr-management-web → backend(Serverless) → DynamoDB
                                      ↕ (데이터 공유 필요)
[구직자] → Event-Job-Finder → (백엔드 미구현 - 새로 만들어야 함)
```

---

## 2. Backend (Serverless API) 분석

### 2.1 기술 스택
- **런타임:** Node.js 18.x
- **프레임워크:** Serverless Framework v4.29.0
- **클라우드:** AWS (API Gateway + Lambda + DynamoDB)
- **리전:** us-east-2
- **환경변수:** useDotenv: true (.env 파일 사용)

### 2.2 의존성
```json
{
  "@aws-sdk/client-dynamodb": "^3.958.0",
  "@aws-sdk/lib-dynamodb": "^3.958.0",
  "aws-sdk": "^2.1693.0",
  "uuid": "^13.0.0",
  "zod": "^4.2.1",
  "serverless": "^4.29.0",
  "serverless-offline": "^14.4.0"
}
```

### 2.3 DynamoDB 테이블 구조

| 테이블명 | PK | 용도 |
|----------|------|------|
| `hr-management-api-employees-{stage}` | id (S) - SHA256 해시 | 직원 마스터 데이터 |
| `Events` | id (S) | 이벤트/행사 관리 |
| `PositionsTable` | name (S) | 직무/포지션 (팀장, 일반 등) |
| `hr-management-api-provinces-{stage}` | provinceName (S) | 도/광역시 |
| `hr-management-api-cities-{stage}` | cityName (S) | 시/구 |
| `hr-management-api-history-{stage}` | employeeId (S) | 직원 이벤트 평가 이력 |

### 2.4 API 엔드포인트 전체 목록

#### 직원 관리 (employeeHandler.mjs)
| Method | Path | 설명 |
|--------|------|------|
| POST | /employees | 직원 생성 (주민번호 SHA256 해시로 ID 생성) |
| GET | /employees | 전체 직원 목록 |
| PUT | /employees/{id} | 직원 정보 수정 (주민번호 변경 시 트랜잭션 사용) |
| DELETE | /employees/{id} | 직원 삭제 |

#### 이벤트 관리 (eventHandler.mjs)
| Method | Path | 설명 |
|--------|------|------|
| GET | /events | 전체 이벤트 목록 |
| POST | /events | 이벤트 생성/수정 (근무시간 자동 계산) |
| PUT | /events | 이벤트 수정 |
| DELETE | /events/{id} | 이벤트 삭제 |

#### 포지션 관리 (positionHandler.mjs)
| Method | Path | 설명 |
|--------|------|------|
| GET | /positions | 포지션 목록 |
| POST | /positions | 포지션 생성 |
| DELETE | /positions/{name} | 포지션 삭제 |

#### 지역 관리 (provinceHandler.mjs, cityHandler.mjs)
| Method | Path | 설명 |
|--------|------|------|
| GET | /province | 도/광역시 목록 |
| POST | /province | 도/광역시 추가 |
| DELETE | /province/{provinceName} | 도/광역시 삭제 |
| GET | /city | 시/구 목록 |
| POST | /city | 시/구 추가 |
| DELETE | /city/{cityName} | 시/구 삭제 |

#### 평가 이력 (employeeEventHistory.mjs)
| Method | Path | 설명 |
|--------|------|------|
| POST | /history | 평가 추가 (DynamoDB list_append) |
| GET | /history/{employeeId} | 직원 평가 이력 조회 |
| PUT | /history/{employeeId}/{eventId} | 평가 수정 |
| DELETE | /history/{employeeId}/{eventId} | 평가 삭제 |

### 2.5 데이터 모델

#### Employee (직원)
```javascript
{
  id: "SHA256(residentNumber + SALT)",  // 주민번호 해시
  name: string,
  contact: string,                       // 전화번호
  bankName: string,
  accountNumber: string,
  residentNumber: string,                // 마스킹 처리 저장
  status: "활성" | "비활성",
  availableWork: string[],               // 가능 근무 지역 배열
  createdAt: ISO8601
}
```

#### Event (이벤트)
```javascript
{
  id: "timestamp_string",
  title: string,
  description: string,
  startDate: string,                     // YYYY-MM-DD
  endDate: string,
  location: string,
  assignedStaff: [{                      // 배정된 직원 목록
    employeeId, name, workStart, workEnd,
    workHours (자동계산)
  }],
  updatedAt: ISO8601
}
```

### 2.6 보안 현황
- **강점:** SHA256+SALT 해싱, 주민번호 마스킹, IAM 세분화 권한, 트랜잭션 지원
- **약점:** CORS `*` (모든 출처 허용), 인증 없음 (Open API), 요청 검증 미흡, Rate limiting 없음

### 2.7 미사용 코드
- `eventEmployee.js` - eventHandler.mjs와 중복, serverless.yml에서 참조 안됨
- `src/handlers/employees.js` - UUID 기반 대체 구현, 미배포
- `src/handlers/dashboard.js` - 대시보드 통계, 미배포

---

## 3. hr-management-web (관리자 프론트엔드) 분석

### 3.1 기술 스택
- **React** v19.2.3 (최신)
- **Tailwind CSS** v3.4.19
- **FullCalendar** v6.1.20 (캘린더 UI)
- **Axios** v1.13.2 (HTTP 클라이언트)
- **i18next** v25.7.3 (한/영 다국어)
- **XLSX** v0.18.5 (엑셀 가져오기)
- **Lucide React** v0.562.0 (아이콘)
- **빌드:** Create React App (react-scripts v5.0.1)

### 3.2 컴포넌트 구조
```
App.js (메인 컨테이너)
├── 사이드바 네비게이션 (4개 메뉴)
│   ├── 인력 관리 (StaffManagement.js)
│   ├── 이벤트 (EventManager.js)
│   │   ├── EventAddFullModal.jsx (이벤트 생성)
│   │   └── EventViewModal.jsx (이벤트 상세)
│   ├── 평가 (StaffEvaluation.js)
│   │   └── EventEvaluationFullModal.jsx (평가 폼)
│   └── 카테고리 관리 (CategoryManager.js)
│       └── WorkplaceManagement.js (지역 관리)
├── BulkEmployeeUpload.js (엑셀 일괄 등록)
└── 언어 전환 버튼 (한/영)
```

### 3.3 주요 기능

#### A. 인력 관리
- 직원 목록 조회/검색/필터 (이름, 전화번호, 지역)
- 직원 등록/수정/삭제 (모달 폼)
- **엑셀 일괄 등록** (템플릿 다운로드, 업로드, 중복 감지, 미리보기)
- 활성/비활성 상태 관리
- 은행 계좌 정보 저장
- 최대 5개 근무 가능 지역 지정

#### B. 이벤트 관리
- **FullCalendar** 기반 월별 캘린더 뷰
- 날짜 범위 선택으로 이벤트 생성
- 멀티 스텝 직원 배정 폼 (날짜별 직원, 근무시간, 급여, 포지션)
- 이벤트 상세보기/수정/삭제
- 확정 스케줄 사이드바 (미래 이벤트만 표시)
- 지역 필터링으로 직원 검색

#### C. 인력 평가
- 최근 1개월 완료 이벤트 표시
- 5점 별점 + 피드백 텍스트
- 직원별 개별 평가 인터페이스
- 평가 완료 시각적 표시 (녹색 펄스)

#### D. 카테고리 관리
- 도/광역시 → 시/구 계층 구조 관리 (CRUD)
- 이벤트 유형, 포지션 관리 (플레이스홀더)

### 3.4 환경변수
```
REACT_APP_API_BASE_URL=<backend API Gateway URL>
```

### 3.5 API 연동 패턴
```javascript
// 데이터 로딩 (App.js useEffect)
useEffect(() => {
  fetchEmployees();    // GET /employees
  fetchRegions();      // GET /province + GET /city
}, []);

// CRUD 패턴: axios → 성공 시 목록 재조회 → 모달 닫기 → alert 피드백
```

---

## 4. Event-Job-Finder (구직자 서비스) 분석

### 4.1 기술 스택 (Replit 프로토타입)
**프론트엔드:**
- React 18.3.1 + TypeScript 5.6.3
- Vite 7.3.0
- wouter 3.3.5 (라우팅)
- TanStack React Query 5.60.5
- React Hook Form + Zod
- Tailwind CSS 3.4.17 + shadcn/ui (Radix UI)
- Framer Motion 11.13.1
- date-fns 3.6.0 (한국 로케일)

**백엔드 (Replit 전용 - 실서비스 불가):**
- Express 5.0.1 + TypeScript
- Drizzle ORM 0.39.3 + PostgreSQL
- Passport + openid-client (Replit OpenID)
- express-session + connect-pg-simple

### 4.2 데이터베이스 스키마 (Replit PostgreSQL)

#### profiles (사용자 프로필)
```
id: UUID (PK)
userId: VARCHAR (UNIQUE)
name, phone, residentNumber, email: VARCHAR
selfIntroduction: TEXT
createdAt, updatedAt: TIMESTAMP
```

#### events (이벤트/채용공고)
```
id: UUID (PK)
title, category (sports|concert|exhibition): VARCHAR
date: DATE, workDates: TEXT[]
startTime, endTime, weekendStartTime, weekendEndTime: VARCHAR
location, address, region, jobType: VARCHAR
wage: INTEGER, wageType (hourly|daily|per_event): VARCHAR
wageNote: TEXT, positionsAvailable: INTEGER
description, dressCode, rules: TEXT
createdAt: TIMESTAMP
```

#### applications (지원서)
```
id: UUID (PK)
userId, eventId: VARCHAR
selfIntroduction: TEXT
status: pending | hired | rejected
bankAccount, bankName: VARCHAR
photoUrl, idCardUrl: TEXT
confirmedDressCode, confirmedRules: BOOLEAN
documentsSubmittedAt, appliedAt: TIMESTAMP
```

#### regularApplications (상시 근무 등록)
```
id: UUID (PK)
userId: VARCHAR (UNIQUE)
availableDays: TEXT[], preferredCategories: TEXT[]
availableStartTime, availableEndTime: VARCHAR
note: TEXT, isActive: BOOLEAN
createdAt, updatedAt: TIMESTAMP
```

### 4.3 페이지 구조 및 UI 흐름

```
Landing (/) → 로그인 CTA
Home (/home) → 이벤트 목록 (리스트/캘린더 뷰 전환, 카테고리/요일/지역 필터)
Event Detail (/events/:id) → 상세 + 지원하기
My Applications (/my-applications) → 대기|채용|이력 탭 + 서류제출
Profile (/profile) → 프로필 등록/수정
Regular (/regular) → 상시 근무 등록

하단 네비게이션 (모바일 최적화): 행사알바 | 지원현황 | 상시알바 | 프로필
```

### 4.4 API 라우트 (Replit 프로토타입)

| Method | Path | 설명 |
|--------|------|------|
| GET/POST/PATCH | /api/profile | 프로필 CRUD |
| GET | /api/events | 이벤트 목록 |
| GET | /api/events/:id | 이벤트 상세 |
| GET | /api/my-applications | 내 지원 목록 |
| POST | /api/applications | 지원하기 |
| GET | /api/applications/:eventId | 특정 이벤트 지원 조회 |
| PATCH | /api/applications/:id | 지원 수정 (서류 제출) |
| DELETE | /api/applications/:id | 지원 취소 |
| GET/POST/PATCH | /api/regular-application | 상시 근무 CRUD |
| GET/POST | /api/auth/* | Replit 인증 |

### 4.5 기능 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 사용자 인증 | 프로토타입 | Replit OpenID (실서비스 시 교체 필요) |
| 프로필 관리 | 기능 동작 | CRUD 완비 |
| 이벤트 브라우징 | 기능 동작 | 필터링, 캘린더/리스트 뷰 |
| 이벤트 지원 | 기능 동작 | 자기소개, 중복 방지 |
| 지원 현황 추적 | 기능 동작 | 대기/채용/거절 상태 |
| 서류 제출 | 기능 동작 | 은행, 사진, 신분증 (URL 입력만) |
| 상시 근무 등록 | 기능 동작 | 요일/카테고리/시간대 |
| 파일 업로드 | 미구현 | URL 입력만 가능 |
| 알림 (이메일/SMS) | 미구현 | |
| 결제 시스템 | 미구현 | 은행 정보만 저장 |
| 관리자 연동 | 미구현 | hr-management-web과 데이터 연결 안됨 |

### 4.6 프로토타입 자동 시딩
- 서버 시작 시 9개 샘플 이벤트 자동 생성 (배구, 야구, BTS, 블랙핑크, IU 콘서트, 현대미술관 등)
- 첫 접근 시 데모 프로필/지원서 자동 생성
- Mock 유저 ("mock-user-123") 인증 없이 테스트 가능

---

## 5. 두 시스템 간 데이터 연관성 분석

### 5.1 공유해야 할 데이터

```
[backend/DynamoDB]                    [Event-Job-Finder]
Events 테이블          ←→  연동 필요 →  events 테이블
  - title, startDate, endDate              - title, category, date, workDates
  - location                               - location, address, region
  - assignedStaff[]                        - positionsAvailable, wage
                                           - jobType, dressCode, rules

Employees 테이블       ←→  연동 필요 →  profiles 테이블
  - name, contact                          - name, phone, email
  - residentNumber                         - residentNumber
  - availableWork[]                        - (지역 선호 없음)
  - bankName, accountNumber                - bankAccount, bankName

(미존재)               ←→  신규 필요 →  applications 테이블
                                           - 지원서 관리 (대기/채용/거절)

History 테이블         ←→  연동 고려 →  (미존재)
  - 평가 이력                              - 구직자도 평가 열람 가능?
```

### 5.2 데이터 흐름 설계 필요 사항

1. **관리자가 등록한 이벤트** → 구직자 서비스에서 조회 가능해야 함
2. **구직자 지원** → 관리자 서비스에서 지원자 명단 조회 가능해야 함
3. **관리자 채용 결정** → 구직자에게 상태 변경 반영 (pending → hired/rejected)
4. **관리자 평가** → 구직자의 이력에 반영

---

## 6. Event-Job-Finder 백엔드 Serverless 전환 시 고려사항

### 6.1 현재 Replit 프로토타입 → AWS Serverless 전환 필요 사항

| 항목 | Replit (현재) | AWS Serverless (목표) |
|------|-------------|---------------------|
| 런타임 | Express 서버 | Lambda 함수 |
| DB | PostgreSQL (Replit) | DynamoDB (기존 backend과 통합) |
| 인증 | Replit OpenID | AWS Cognito 또는 자체 인증 |
| 세션 | connect-pg-simple | JWT 토큰 (Stateless) |
| ORM | Drizzle ORM | AWS SDK DynamoDB |
| 파일 업로드 | 미구현 | S3 + Pre-signed URL |

### 6.2 DynamoDB 테이블 추가 설계 (안)

```
# 구직자 프로필
job-finder-profiles-{stage}
  PK: userId (S)
  Attributes: name, phone, residentNumber, email, selfIntroduction, createdAt, updatedAt

# 지원서
job-finder-applications-{stage}
  PK: id (S)
  GSI1: userId-index (userId → 내 지원 목록)
  GSI2: eventId-index (eventId → 이벤트별 지원자 목록)
  Attributes: userId, eventId, selfIntroduction, status, bankAccount, bankName,
              photoUrl, idCardUrl, confirmedDressCode, confirmedRules,
              documentsSubmittedAt, appliedAt

# 상시 근무 등록
job-finder-regular-{stage}
  PK: userId (S)
  Attributes: availableDays, preferredCategories, availableStartTime,
              availableEndTime, note, isActive, createdAt, updatedAt
```

### 6.3 개발/운영 환경 분리 전략

```yaml
# serverless.yml 스테이지 기반 분리
provider:
  stage: ${opt:stage, 'dev'}  # dev | prod

# 테이블명 자동 분리
hr-management-api-employees-dev  ↔  hr-management-api-employees-prod
job-finder-profiles-dev          ↔  job-finder-profiles-prod
job-finder-applications-dev      ↔  job-finder-applications-prod

# API Gateway
dev:  https://xxxxx.execute-api.us-east-2.amazonaws.com/dev/
prod: https://xxxxx.execute-api.us-east-2.amazonaws.com/prod/

# 프론트엔드 환경변수
.env.development: REACT_APP_API_BASE_URL=https://xxx/dev
.env.production:  REACT_APP_API_BASE_URL=https://xxx/prod
```

---

## 7. 아키텍처 다이어그램

```
                    ┌─────────────────────────────────────┐
                    │         AWS Cloud (us-east-2)        │
                    │                                      │
┌──────────┐       │  ┌──────────────┐  ┌──────────────┐  │
│ 관리자   │──────→│  │ API Gateway  │  │ API Gateway  │←─│────┐
│ (Web)    │       │  │ (관리자 API) │  │ (구직자 API) │  │    │
└──────────┘       │  └──────┬───────┘  └──────┬───────┘  │    │
hr-management-web  │         │                  │          │    │
                   │  ┌──────▼───────┐  ┌──────▼───────┐  │    │
                   │  │   Lambda     │  │   Lambda     │  │    │
                   │  │ (관리자용)   │  │ (구직자용)   │  │ ┌──┴──────────┐
                   │  └──────┬───────┘  └──────┬───────┘  │ │ 구직자      │
                   │         │                  │          │ │ (Mobile Web)│
                   │  ┌──────▼──────────────────▼───────┐  │ └─────────────┘
                   │  │         DynamoDB Tables          │  │ Event-Job-Finder
                   │  │  • employees  • events           │  │
                   │  │  • positions  • provinces/cities  │  │
                   │  │  • history    • profiles (신규)   │  │
                   │  │              • applications (신규)│  │
                   │  │              • regular (신규)     │  │
                   │  └─────────────────────────────────┘  │
                   │                                      │
                   │  ┌─────────────┐  ┌───────────────┐  │
                   │  │  Cognito    │  │   S3 Bucket   │  │
                   │  │ (사용자인증)│  │ (파일 업로드) │  │
                   │  └─────────────┘  └───────────────┘  │
                   └──────────────────────────────────────┘
```

---

## 8. 핵심 이슈 및 권장사항

### 8.1 긴급 (보안)
1. **CORS `*` 제거** → 특정 도메인만 허용
2. **API 인증 추가** → 관리자 API에 API Key 또는 Cognito 적용
3. **Rate Limiting** → API Gateway 스로틀링 설정

### 8.2 Event-Job-Finder 백엔드 구현 우선순위
1. **인증 시스템** (Cognito 또는 자체 JWT)
2. **이벤트 조회 API** (기존 Events 테이블 공유)
3. **프로필 CRUD API** (신규 테이블)
4. **지원 관리 API** (신규 테이블 + GSI)
5. **관리자 측 지원자 조회/채용 결정 API**
6. **상시 근무 등록 API**
7. **파일 업로드** (S3 Pre-signed URL)
8. **알림 시스템** (SNS/SES)

### 8.3 데이터 통합 과제
- Events 테이블 스키마 확장 필요 (category, wage, dressCode 등 필드 추가)
- 또는 구직자용 이벤트 뷰 테이블 별도 생성 (관리자가 "공개" 설정한 이벤트만)
- 직원(employees)과 프로필(profiles) 간 연결 전략 결정 필요

---

## 9. 파일 구조 요약

```
HR-Management-Website/
├── backend/                          # 관리자용 Serverless API
│   ├── serverless.yml                # Serverless 설정 (6개 핸들러)
│   ├── .env                          # 환경변수 (SALT)
│   ├── package.json                  # 의존성
│   └── functions/                    # Lambda 핸들러
│       ├── employeeHandler.mjs       # 직원 CRUD
│       ├── eventHandler.mjs          # 이벤트 CRUD
│       ├── positionHandler.mjs       # 포지션 CRUD
│       ├── provinceHandler.mjs       # 도/광역시 CRUD
│       ├── cityHandler.mjs           # 시/구 CRUD
│       ├── employeeEventHistory.mjs  # 평가 이력 CRUD
│       └── eventEmployee.js          # (미사용 중복)
│
├── hr-management-web/                # 관리자 프론트엔드 (React)
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.js                    # 메인 (라우팅 + 상태관리)
│       ├── i18n.js                   # 다국어 설정
│       ├── locales/                  # ko.json, en.json
│       └── components/
│           ├── StaffManagement.js    # 인력 관리
│           ├── EventManager.js       # 이벤트 관리 (캘린더)
│           ├── EventAddFullModal.jsx  # 이벤트 생성 모달
│           ├── EventViewModal.jsx     # 이벤트 상세 모달
│           ├── StaffEvaluation.js    # 평가 메인
│           ├── EventEvaluationFullModal.jsx  # 평가 폼
│           ├── CategoryManager.js    # 카테고리 관리
│           ├── WorkplaceManagement.js # 지역 관리
│           └── BulkEmployeeUpload.js  # 엑셀 일괄등록
│
└── Event-Job-Finder/                 # 구직자 서비스 (Replit 프로토타입)
    ├── package.json
    ├── drizzle.config.ts
    ├── vite.config.ts
    ├── shared/
    │   ├── schema.ts                 # DB 스키마 (Drizzle)
    │   └── models/auth.ts            # 인증 모델
    ├── server/
    │   ├── index.ts                  # Express 서버
    │   ├── routes.ts                 # API 라우트 + 자동시딩
    │   ├── storage.ts                # DB 스토리지 구현체
    │   ├── db.ts                     # Drizzle 인스턴스
    │   └── replit_integrations/auth/ # Replit 인증
    └── client/src/
        ├── App.tsx                   # 라우터 설정
        ├── pages/                    # 7개 페이지
        │   ├── landing.tsx           # 랜딩
        │   ├── home.tsx              # 이벤트 목록
        │   ├── event-detail.tsx      # 이벤트 상세 + 지원
        │   ├── my-applications.tsx   # 지원 현황
        │   ├── profile.tsx           # 프로필
        │   ├── regular.tsx           # 상시 근무
        │   └── not-found.tsx         # 404
        ├── hooks/                    # use-auth, use-toast
        ├── lib/                      # 유틸리티
        └── components/ui/            # shadcn/ui 컴포넌트
```

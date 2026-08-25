# Work Process

이 문서는 프로젝트에서 수행한 주요 작업 명령과 목적을 간략하게 기록합니다.
비밀번호, API 키, `.env` 값 등 민감정보는 기록하지 않습니다.

## 2026-08-20 - Git 저장소 초기 설정

### Git 설정 및 저장소 상태 확인

```bash
git status --short --branch
git remote -v
git config --global --get user.name
git config --global --get user.email
git config --global --get init.defaultBranch
```

- 현재 디렉터리가 Git 저장소인지 확인했습니다.
- 연결된 원격 저장소와 전역 사용자 이름, 이메일, 기본 브랜치를 확인했습니다.
- 전역 설정은 사용자 이름 `loveits`, 이메일 `devkukjs@gmail.com`, 기본 브랜치 `main`으로 확인되었습니다.

### 제외 파일 확인

```bash
git check-ignore -v .env target .DS_Store
```

- `.env`, `target/`, `.DS_Store`가 `.gitignore`에 의해 제외되는지 확인했습니다.
- 실제 `.env` 내용은 조회하거나 기록하지 않았습니다.

### Git 저장소 초기화

```bash
git init
```

- 프로젝트 루트에 Git 저장소를 생성했습니다.

### 파일 스테이징 및 검토

```bash
git add .
git status --short
git diff --cached --check
```

- Git에서 추적할 프로젝트 파일을 스테이징했습니다.
- 커밋 대상에 제외 파일이 포함되지 않았는지 확인했습니다.
- 커밋 전 공백 형식을 검사했습니다. 일부 파일 끝의 추가 빈 줄 경고만 확인되었습니다.

### 첫 커밋 생성 및 결과 확인

```bash
git commit -m "Initial commit"
git status --short --branch
git log -1 --oneline
```

- `8049fcc Initial commit` 첫 커밋을 생성했습니다.
- 커밋 후 `main` 브랜치의 작업 트리가 깨끗한 상태임을 확인했습니다.

## 2026-08-25 - 화면 정적 리소스 경로 수정

### 원인 확인

- Thymeleaf 템플릿이 CSS와 JavaScript를 `../static/...` 경로로 요청하고 있었습니다.
- Spring Boot는 `src/main/resources/static` 디렉터리 아래의 파일을 URL 루트에 매핑하므로 URL에 `static`을 포함하지 않습니다.

### 변경 내용

- CSS 경로를 `/css/styles.css`로 변경했습니다.
- JavaScript 경로를 `/js/app.js`로 변경했습니다.
- 확인 당시 로컬 8080 포트에 실행 중인 서버가 없어 HTTP 응답 검증은 수행하지 못했습니다.

## 2026-08-25 - PostgreSQL `managehw` 스키마 연결 설정

### 기존 상태와 판단

- PostgreSQL의 `managehw` 스키마에 애플리케이션 테이블이 이미 생성되어 있습니다.
- 해당 스키마에 Flyway 이력 테이블이 없어 애플리케이션 시작 시 비어 있지 않은 스키마 오류가 발생했습니다.
- 기존 테이블을 삭제하지 않고 현재 상태를 Flyway 버전 1의 기준점으로 등록하는 방식을 적용했습니다.

### 변경 내용

- 로컬 및 Docker JDBC URL에 `currentSchema=${DB_SCHEMA:managehw}`를 추가했습니다.
- Hibernate의 기본 스키마를 `${DB_SCHEMA:managehw}`로 설정했습니다.
- Flyway의 관리 스키마와 기본 스키마를 `${DB_SCHEMA:managehw}`로 설정했습니다.
- Flyway가 기존 스키마를 버전 1로 등록하도록 `baseline-on-migrate`와 `baseline-version`을 설정했습니다.
- `DB_SCHEMA` 환경변수를 생략하면 `managehw`를 사용합니다.

### 실행 및 검증

```bash
set -a
source .env
set +a
SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
```

- `.env` 값 자체는 문서나 명령 출력에 기록하지 않습니다.
- `./mvnw -q -DskipTests compile`로 프로젝트 컴파일 성공을 확인했습니다.
- 최초 정상 실행 시 `managehw.flyway_schema_history`가 생성되어야 합니다.
- 이후 Flyway 변경 스크립트는 기준 버전 다음인 `V2__...sql`부터 작성합니다.

## 2026-08-25 - 초기 공통코드·사용자·과목 데이터 구성

### Flyway 마이그레이션 추가

- `V2__insert_initial_reference_data.sql`을 추가했습니다.
- 기존 `managehw` 스키마는 Flyway 버전 1로 기준 등록되어 있으므로 초기 데이터는 버전 2로 작성했습니다.
- 각 참조 데이터는 코드나 로그인 아이디로 FK를 조회하며, DB에서 생성된 숫자 ID를 SQL에 고정하지 않았습니다.
- 재실행 또는 기존 데이터와의 충돌을 방지하기 위해 유일 제약조건 충돌 시 기존 행을 유지합니다.

### 입력 데이터

- 공통코드 그룹: 사용자 역할, 연결 상태, 기본 과목, 숙제 진행률, 숙제 이력 작업
- 역할 코드: 학생, 학부모
- 연결 코드: 초대, 승인, 해제
- 기본 과목 코드: 국어, 영어, 수학, 기타
- 진행률 코드: 0%, 25%, 50%, 75%, 100%
- 이력 코드: 등록, 수정, 삭제
- 테스트 학생: 김하늘(`student-1`), 이서준(`student-2`)
- 테스트 학부모: 김민지(`parent-1`), 이지영(`parent-2`)
- 승인 연결: 김민지-김하늘, 이지영-이서준
- 학생별 기본 과목: 국어, 영어, 수학

### 실행 및 검증

```bash
set -a
source .env
set +a
SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=0
```

- 제한된 실행 환경에서는 외부 DB 호스트 DNS 조회가 차단되어 최초 연결이 실패했습니다.
- 외부 DB 연결 권한으로 다시 검증했으며 PostgreSQL 17의 `managehw` 스키마에 정상 연결되었습니다.
- Flyway가 마이그레이션 2건을 검증했고 현재 스키마 버전이 2이며 최신 상태임을 확인했습니다.
- Hibernate 기본 스키마가 `managehw`로 인식되고 애플리케이션이 정상 기동되는 것을 확인했습니다.
- 검증을 위해 임의 포트로 실행한 애플리케이션 프로세스는 확인 후 종료했습니다.

## 2026-08-25 - 테스트 사용자 및 과목 조회 API 구현

### 구현 구조

- 조회 전용 SQL은 Spring `JdbcClient`를 사용하는 Repository에 분리했습니다.
- 역할 필터와 요청 검증은 Service에서 처리합니다.
- HTTP 경로와 JSON 응답은 REST Controller와 record DTO로 구성했습니다.
- 현재 단계는 조회 기능만 필요하므로 변경 감지용 JPA Entity를 먼저 만들지 않고 조회 DTO에 필요한 컬럼만 명시적으로 조회합니다.

### 테스트 사용자 목록 API

```http
GET /api/test-users
GET /api/test-users?role=student
GET /api/test-users?role=parent
```

- 역할을 생략하면 학생과 학부모를 모두 반환합니다.
- 학생 응답에는 승인된 연결 관계의 학부모 이름을 포함합니다.
- 학부모 응답에는 승인된 연결 학생의 ID, 로그인 ID, 이름을 포함합니다.
- 지원하지 않는 역할 값은 HTTP 400으로 처리합니다.

### 학생별 과목 목록 API

```http
GET /api/students/{studentId}/subjects
```

- 대상 학생에게 생성된 기본 과목과 사용자 정의 과목을 반환합니다.
- 기본 과목은 공통코드 순서로 정렬하고 사용자 정의 과목은 이름순으로 정렬합니다.
- 응답의 `custom` 값으로 기본 과목과 사용자 정의 과목을 구분합니다.

### 검증 결과

- `./mvnw -q -DskipTests compile`과 `git diff --check`를 통과했습니다.
- PostgreSQL `managehw` 데이터를 사용하는 애플리케이션을 검증용 18081 포트에서 실행했습니다.
- 학생 목록 2건과 학부모 목록 2건이 각각 HTTP 200으로 반환되는 것을 확인했습니다.
- 학생 ID 1의 국어, 영어, 수학 과목 3건이 HTTP 200으로 반환되는 것을 확인했습니다.
- 잘못된 역할 필터가 HTTP 400으로 반환되는 것을 확인했습니다.
- 검증용 애플리케이션은 확인 후 정상 종료했습니다.

## 2026-08-25 - 사용자·과목 API 화면 연동

### 사용자 데이터 교체

- `app.js`에 있던 학생 및 학부모 하드코딩 배열을 제거했습니다.
- 최초 화면 진입 시 `GET /api/test-users`를 호출하고 역할별 사용자 카드로 변환합니다.
- API의 `loginId`는 기존 브라우저 세션과 로컬 숙제 데이터 호환용 ID로 사용합니다.
- API의 숫자 `id`는 학생별 과목 API를 호출할 때 사용하는 DB ID로 별도 보관합니다.
- 마지막 선택 사용자는 API 로딩이 완료된 뒤 세션 값과 비교하여 복원합니다.
- 사용자 로딩 중, 조회 실패, 빈 목록 및 다시 시도 화면을 추가했습니다.
- 현재 DB 모델에 나이 컬럼이 없으므로 학생 카드에서는 나이 대신 연결 학부모 정보를 표시합니다.

### 과목 데이터 교체

- 대시보드 진입 시 `GET /api/students/{studentId}/subjects`를 호출합니다.
- 숙제 등록·수정 화면의 과목 선택지는 API에서 받은 학생별 과목과 `기타` 항목으로 구성합니다.
- 과목 필터는 DB 과목과 아직 로컬에 보관 중인 숙제의 과목을 합쳐 표시합니다.
- 과목 로딩 중에는 필터를 비활성화하고, 실패하면 사용자에게 토스트 메시지를 표시합니다.
- 사용자 정의 과목의 중복 검증에 DB에서 조회한 기존 과목도 포함했습니다.

### 현재 데이터 경계

- 사용자와 과목은 PostgreSQL API를 사용합니다.
- 숙제 조회·등록·수정·삭제는 숙제 API 구현 전까지 기존 `localStorage` 방식을 유지합니다.
- DB 사용자 `loginId`를 기존 숙제의 `studentId`와 연결하여 단계적 전환 중에도 기존 화면 데이터를 표시합니다.

### 검증 결과

- `node --check src/main/resources/static/js/app.js`로 JavaScript 문법 검사를 통과했습니다.
- Maven 컴파일과 `git diff --check`를 통과했습니다.
- PostgreSQL 연결 상태에서 화면 HTML, `app.js`, 사용자 API, 과목 API가 모두 HTTP 200으로 반환되는 것을 확인했습니다.
- 검증용 18081 포트 애플리케이션은 확인 후 정상 종료했습니다.

## 2026-08-25 - 숙제 CRUD API 및 화면 DB 연동

### 백엔드 API

```http
GET    /api/students/{studentId}/homeworks?date=
POST   /api/students/{studentId}/homeworks
PATCH  /api/homeworks/{homeworkId}
DELETE /api/homeworks/{homeworkId}?actorId=
```

- 숙제 목록은 삭제되지 않은 데이터만 마감일과 ID 순으로 조회합니다.
- 등록과 수정 요청은 과목, 제목, 상세내용, 마감일 및 작업자 ID를 검증합니다.
- 입력한 과목이 학생에게 없으면 사용자 정의 과목으로 함께 생성합니다.
- 새 숙제의 진행률은 `PROGRESS_0`으로 설정합니다.
- 삭제는 실제 행을 제거하지 않고 삭제 사용자·시각·상태를 기록하는 소프트 삭제로 처리합니다.
- 학생 본인 또는 승인된 연결 학부모만 해당 학생의 숙제를 변경할 수 있습니다.
- 등록·수정·삭제 시 변경 전후 JSON 스냅샷을 `homework_histories`에 트랜잭션으로 기록합니다.

### 초기 숙제 데이터 이전

- `app.js`에 있던 예시 숙제를 Flyway `V3__insert_initial_homeworks.sql`로 이전했습니다.
- PostgreSQL의 data-modifying CTE 스냅샷 특성 때문에 같은 SQL에서 새로 생성한 과목의 숙제는 조회되지 않아 `V4__complete_initial_homework_examples.sql`로 과학·사회 예시를 보완했습니다.
- 실행 중이던 개발 서버가 최초 V3를 즉시 적용한 뒤 V3 파일을 수정해 일시적인 체크섬 불일치가 발생했습니다.
- 적용된 V3 원본을 복원해 체크섬을 일치시켰고, 이후 보완은 기존 마이그레이션을 수정하지 않고 V4로 분리했습니다.
- 최종 Flyway 스키마 버전은 4입니다.

### 프런트 화면 연동

- 초기 숙제 배열과 `localStorage` 읽기·쓰기 코드를 제거했습니다.
- 대시보드 진입 시 현재 학생의 전체 숙제를 API에서 조회합니다.
- 숙제 등록·수정·삭제 화면 동작을 각각 POST·PATCH·DELETE API와 연결했습니다.
- 저장 성공 후 숙제와 과목 목록을 다시 조회해 DB 결과를 화면에 반영합니다.
- 숙제 조회 로딩, 오류 및 다시 시도 상태를 추가했습니다.

### 실제 DB 검증

- 학생 1의 예시 숙제 5건과 학생 2의 예시 숙제 1건을 조회했습니다.
- 검증용 숙제를 생성해 HTTP 201과 진행률 0%를 확인했습니다.
- 동일 숙제를 수정해 HTTP 200과 변경 값을 확인했습니다.
- 권한이 없는 다른 학생의 수정 요청이 HTTP 403으로 거부되는 것을 확인했습니다.
- 검증용 숙제를 소프트 삭제해 HTTP 204와 기본 목록 제외를 확인했습니다.
- 등록·수정·삭제 이력 저장은 같은 트랜잭션에 포함되므로 이력 실패 시 숙제 변경도 함께 롤백됩니다.
- 검증 과정에서 만든 `코딩` 사용자 정의 과목은 과목 정책상 숙제 소프트 삭제 후에도 학생 과목으로 유지됩니다.
- 화면 JavaScript와 숙제 API가 HTTP 200으로 반환되고 검증 서버가 정상 종료되는 것을 확인했습니다.
- JavaScript 문법 검사, Maven 컴파일 및 `git diff --check`를 통과했습니다.

## 2026-08-25 - 숙제 진행률 변경 기능

### 진행률 API 및 이력

```http
PATCH /api/homeworks/{homeworkId}/progress
Content-Type: application/json

{
  "progress": 25,
  "actorId": 1
}
```

- 진행률은 0, 25, 50, 75, 100만 허용합니다.
- 학생 본인 또는 승인된 연결 학부모만 진행률을 변경할 수 있습니다.
- 진행률 코드, 최근 수정 사용자 및 수정 시각을 한 트랜잭션에서 변경합니다.
- `V5__add_homework_progress_action.sql`로 `HW_PROGRESS_UPDATED` 이력 코드를 추가했습니다.
- 변경 전후 숙제 JSON을 `homework_histories`에 진행률 변경 이력으로 저장합니다.

### 상태 선택 UI

- 숙제 카드의 작은 상태 표시를 최소 높이 48px의 큰 상태 버튼으로 변경했습니다.
- 버튼에는 자동 계산 상태와 현재 진행률을 함께 표시합니다.
- 버튼을 누르면 미완료 0%, 진행 중 25·50·75%, 완료 100% 선택 메뉴가 열립니다.
- `기한 지남`은 선택 항목이 아니며 마감일과 진행률로 계속 자동 계산합니다.
- 저장 중에는 해당 버튼을 비활성화하고 `저장 중`을 표시합니다.
- 저장 성공 후 카드 상태, 진행 바, 날짜 개수와 상단 상태 요약을 즉시 다시 계산합니다.
- 실패하면 기존 데이터를 유지하고 오류 토스트를 표시합니다.
- 모바일에서는 상태 버튼을 카드 하단 전체 너비로 확장하고 선택 메뉴 폭도 조정했습니다.
- Escape 키로 진행률 메뉴와 카드 작업 메뉴를 닫을 수 있습니다.

### 검증 결과

- 실제 숙제의 진행률을 0%에서 25%로 변경해 HTTP 200과 응답값 25를 확인했습니다.
- 허용되지 않은 30% 요청이 HTTP 400으로 거부되는 것을 확인했습니다.
- 검증 후 진행률을 원래 값인 0%로 복원했습니다.
- 진행률 변경 이력은 두 번의 정상 변경에 대해 각각 저장되었습니다.
- Flyway V5 적용, CSS 응답 HTTP 200, JavaScript 문법 검사, Maven 컴파일 및 `git diff --check`를 확인했습니다.
- 검증용 서버는 확인 후 정상 종료했습니다.

## 2026-08-25 - 숙제 상세내용 펼침·접힘

### 화면 동작

- 숙제 제목을 클릭 가능한 아코디언 버튼으로 변경했습니다.
- 제목을 누르면 같은 카드 안에 상세내용이 펼쳐지고 다시 누르면 접힙니다.
- 여러 숙제의 상세내용을 동시에 펼칠 수 있습니다.
- 상세내용이 없는 숙제는 `등록된 상세 내용이 없어요.` 안내를 표시합니다.
- 줄바꿈이 포함된 상세내용은 입력 형태를 유지해 표시합니다.
- 학생 또는 숙제 목록을 새로 조회하면 기존 펼침 상태를 초기화합니다.

### 접근성 및 스타일

- 제목은 기존 제목 계층을 유지하면서 내부를 `button`으로 구성했습니다.
- `aria-expanded`와 `aria-controls`로 제목 버튼과 상세 영역의 관계를 표현했습니다.
- 펼침 상태에 따라 화살표 방향을 변경합니다.
- 제목 hover와 키보드 focus 상태를 제공하며 상세내용은 현재 숙제 상태 색상의 구분선으로 표시합니다.
- 상세내용은 HTML 이스케이프 후 표시해 사용자 입력이 마크업으로 실행되지 않도록 했습니다.

### 검증

- JavaScript 문법 검사, Maven 컴파일 및 `git diff --check`를 수행했습니다.

## 기록 원칙

- 이후 실행하는 주요 명령을 날짜와 작업 단위로 이 문서에 계속 추가합니다.
- 각 명령의 목적과 중요한 결과를 짧게 설명합니다.
- 단순 조회 명령도 작업 판단에 의미가 있으면 기록합니다.
- 민감정보, 인증 토큰, 비밀번호 및 `.env` 값은 기록하지 않습니다.

## 2026-08-25 - 운영 서버 포팅 사전 점검

### 현재 구성

- Spring Boot 4.1.0, Java 21, 실행 가능한 JAR 및 내장 Tomcat 구성을 확인했습니다.
- PostgreSQL 연결은 `docker` 프로필과 환경변수로 주입되며 기본 스키마는 `managehw`입니다.
- Flyway는 스키마를 자동 생성하지 않으므로 서버 DB에 `managehw` 스키마와 필요한 권한이 먼저 준비되어야 합니다.
- 운영 시 Thymeleaf 캐시는 활성화되고 애플리케이션 기본 포트는 8080입니다.

### 배포 전 보완 항목

- 저장소에 실제 `Dockerfile`, Compose 파일 및 `.dockerignore`는 아직 없습니다.
- 운영 전용 프로필, 비밀정보 관리, HTTPS 리버스 프록시, 프로세스 자동 재시작, 상태 점검, 로그·모니터링 및 DB 백업 정책을 준비해야 합니다.
- 현재 화면은 테스트 사용자 선택 방식이므로 외부 공개 전 인증·인가 적용이 필요합니다.
- `.env`는 배포 산출물이나 Git에 포함하지 않고 서버 비밀정보 또는 제한된 권한의 환경 파일로 관리합니다.

## 2026-08-25 - 내부망 운영 배포 준비

### 추가한 배포 구성

- Java 21 멀티 스테이지 빌드와 비관리자 계정 실행을 적용한 `Dockerfile`을 추가했습니다.
- `.env`와 개발 산출물을 이미지에서 제외하는 `.dockerignore`를 추가했습니다.
- 애플리케이션만 실행하는 `compose.yml`을 추가했습니다. PostgreSQL은 기존 별도 서버를 그대로 사용합니다.
- 기본 포트 바인딩을 `127.0.0.1`로 제한하고, `.env`의 `APP_BIND_ADDRESS`에 운영 서버 내부 IP를 명시해야 내부 사용자가 접속할 수 있게 구성했습니다.
- 컨테이너 자동 재시작, 헬스체크 및 JSON 로그 회전 설정을 적용했습니다.
- `spring-boot-starter-actuator`를 추가하고 운영 프로필에서는 상세정보 없는 `/actuator/health`만 공개했습니다.
- 정상 종료 대기, 응답 압축 및 운영용 Thymeleaf 캐시 설정을 적용했습니다.
- 민감정보가 없는 `.env.example`과 실제 배포 절차를 설명하는 `DEPLOYMENT.md`를 추가했습니다.

### 검증 결과

- `./mvnw -B -DskipTests clean package`로 Java 21 실행형 JAR 빌드를 확인했습니다.
- `docker compose config -q`로 Compose 설정 문법을 확인했습니다.
- `git diff --check`를 통과했습니다.
- 전체 테스트는 로컬 Docker 데몬이 실행되지 않아 Testcontainers가 PostgreSQL 컨테이너를 시작하지 못해 완료하지 못했습니다. 운영 서버 또는 Docker가 실행되는 환경에서 다시 수행해야 합니다.

## 2026-08-25 - Ubuntu Docker 설치 절차 보완

- Docker 공식 APT 저장소를 이용한 Engine, CLI, containerd, Buildx 및 Compose 플러그인 설치 절차를 `DEPLOYMENT.md`에 추가했습니다.
- Docker 서비스를 부팅 시 자동 시작하도록 설정하고 `hello-world`, Docker 버전 및 Compose 버전 확인 명령을 정리했습니다.
- `docker` 그룹은 root 수준 권한을 제공하므로 운영 정책 확인 후 선택적으로만 사용하도록 주의사항을 기록했습니다.

## 2026-08-25 - 운영 서버 프로젝트 배치 단계 명확화

- `docker compose` 실행 전에 프로젝트 소스를 운영 서버에 배치해야 한다는 선행 조건을 `DEPLOYMENT.md`에 추가했습니다.
- `compose.yml`, `Dockerfile`, `.env.example`, `pom.xml`, `mvnw`, `.mvn/`, `src/`가 있는 프로젝트 최상위 디렉터리에서 명령을 실행하도록 설명했습니다.

## 2026-08-25 - Git 게시 전 상태 점검

- 현재 디렉터리가 Git 저장소이고 브랜치는 `main`, 기존 커밋은 `Initial commit` 1건임을 확인했습니다.
- 연결된 원격 저장소가 아직 없으므로 GitHub 또는 사내 Git에 빈 저장소를 만든 뒤 `origin`을 등록해야 합니다.
- 실제 DB 비밀번호가 있는 `.env`는 `.gitignore`에 의해 제외되고 Git 추적 대상이 아님을 확인했습니다.
- 커밋 대상에서 비밀번호·개인키 패턴을 점검했으며 설정 파일과 예제 문서의 환경변수·자리표시자 외에 즉시 제거해야 할 노출은 확인되지 않았습니다.
- 기능·DB 화면 연동 커밋과 내부망 Docker 배포 구성 커밋을 분리하는 절차를 안내합니다.

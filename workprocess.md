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

## 2026-08-25 - 작업 종료 체크포인트 및 다음 재개 지점

### 로컬 및 원격 Git 완료 상태

- 로컬 브랜치는 `main`이고 GitHub 원격 저장소 `origin`과 연결되어 있습니다.
- `7ddf107 feat:connect homework screen to database` 커밋에 DB·화면 연동 작업이 반영되었습니다.
- `a2f01dc chore: add internal Docker deployment configuration` 커밋에 내부망 Docker 배포 구성이 반영되었습니다.
- 로컬 `main`, `origin/main`, `origin/HEAD`가 모두 `a2f01dc`를 가리키는 것을 확인했습니다.
- `docs/refdoc/`, `docs/ui/`는 아직 Git 미추적 상태입니다. 내용과 공개 범위를 확인하기 전까지 커밋하지 않습니다.
- 이 체크포인트 기록 자체는 작업 종료 시점에 새로 변경되었으므로 다음 작업 시작 시 커밋·push 여부를 확인합니다.

### 운영 서버 진행 상태

- 사용자가 운영 Ubuntu 서버에 원격 저장소 소스를 clone 완료했다고 확인했습니다.
- 실제 clone 경로는 다음 작업 시작 시 운영 서버에서 `pwd`로 다시 확인합니다. 문서의 `/opt/hwmvp`는 예시 경로입니다.
- Docker 설치 완료 여부, Docker 서비스 상태, 운영 `.env` 작성 여부 및 컨테이너 실행 여부는 아직 확인되지 않았습니다.
- 운영 서버의 실제 IP, DB 주소, 계정 및 비밀번호는 보안상 이 문서에 기록하지 않습니다.

### 다음 작업 시작 시 1차 확인

운영 서버의 clone 디렉터리에서 다음 순서로 확인합니다.

```bash
pwd
git status
git log --oneline -3
ls -la
docker version
docker compose version
sudo systemctl status docker --no-pager
```

확인 기준:

- 최근 커밋이 `a2f01dc`인지 확인합니다.
- `Dockerfile`, `compose.yml`, `.env.example`, `pom.xml`, `mvnw`, `.mvn/`, `src/`가 존재해야 합니다.
- Docker 서비스가 `active (running)`이어야 합니다.

### 다음 작업 시작 시 2차 설정

운영 서버의 프로젝트 최상위 디렉터리에서 `.env`가 없을 때만 생성합니다.

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

필수 확인값:

- `APP_BIND_ADDRESS`: 애플리케이션 Ubuntu 서버의 내부 IP
- `APP_PORT`: 기본 8080 또는 내부 서비스 포트
- `DB_HOST`: 별도 PostgreSQL 서버의 내부 IP 또는 호스트명
- `DB_PORT`, `DB_NAME`, `DB_SCHEMA=managehw`
- `DB_USERNAME`, `DB_PASSWORD`, `DB_SSLMODE`

기존 `.env`가 있다면 덮어쓰지 말고 내용을 확인합니다.

### 다음 작업 시작 시 3차 배포 및 검증

```bash
docker compose config -q
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=200 hwmvp
curl http://127.0.0.1:8080/actuator/health
```

Docker 권한 오류가 발생하는 서버에서는 운영 정책에 따라 위 Docker 명령에 `sudo`를 붙입니다.

완료 기준:

- Compose 설정 검사와 이미지 빌드가 성공해야 합니다.
- `docker compose ps`에서 `hwmvp`가 `healthy`여야 합니다.
- 헬스 응답이 `{"status":"UP"}`여야 합니다.
- 내부 PC에서 `http://<운영 서버 내부 IP>:<APP_PORT>/` 화면과 사용자·과목·숙제 DB 조회를 확인합니다.

### 이후 남은 운영 확인

- 운영 서버에서 PostgreSQL 5432 포트 접근과 `managehw` 스키마 권한을 확인합니다.
- 내부망 방화벽은 필요한 사용자 대역에서 애플리케이션 포트만 허용합니다.
- 컨테이너 재시작 및 Ubuntu 재부팅 후 자동 기동을 확인합니다.
- 운영 반영 전 PostgreSQL 백업과 복구 방법을 확인합니다.
- 로컬 전체 테스트는 Docker 데몬 부재로 완료하지 못했으므로 Docker 사용 가능 환경에서 Testcontainers 테스트를 다시 실행합니다.

## 2026-08-29 - MyBatis 도입 검토

### 현재 판단

- 현재 사용자·과목·숙제 Repository는 Spring `JdbcClient`와 Java Text Block으로 SQL을 직접 관리하고 있습니다.
- 핵심 SQL이 명시적으로 보이고 파라미터 바인딩과 DTO 매핑도 단순하여, 현재 규모에서는 MyBatis 도입 효과보다 Mapper·XML·설정 증가 비용이 더 큽니다.
- 따라서 당장은 `JdbcClient`를 유지하고 Repository의 역할과 공통 매핑을 정돈하는 방향을 권장합니다.
- 현재 `spring-boot-starter-data-jpa` 의존성은 실제 Entity나 JPA Repository가 없어 사용 여부를 별도로 재검토할 필요가 있습니다.

### MyBatis 재검토 기준

- 검색 조건 조합과 동적 SQL이 크게 늘어날 때
- 여러 조회에서 반복되는 SQL 조각과 ResultMap 재사용이 필요할 때
- 개발팀이 XML Mapper 기반 SQL 검토·튜닝 방식을 표준으로 사용할 때
- 복잡한 통계·리포트 쿼리가 다수 추가되어 Java Repository의 가독성이 떨어질 때

Spring Boot 4.1 및 Java 21과 호환되는 MyBatis Spring Boot Starter 4.1 계열이 제공되므로, 기술적 호환성은 도입 장애가 아닙니다.

## 2026-08-29 - Java 메서드 목적 주석 보강

### 적용 범위와 기준

- 직접 작성한 `src/main/java`의 Controller, Service, Repository 메서드와 주요 내부 헬퍼에 목적 중심 Javadoc을 추가했습니다.
- 숙제 권한 확인, 사용자 정의 과목 재사용, 소프트 삭제, 진행률 공통코드 변환, 변경 이력 스냅샷처럼 메서드명만으로 파악하기 어려운 업무 규칙을 설명했습니다.
- API 메서드에는 어떤 화면 요청을 처리하고 어떤 HTTP 결과를 의도하는지 기록했습니다.
- DTO record에는 어느 API와 화면에서 사용하는 데이터인지 클래스 수준 설명을 추가했습니다.
- 코드 한 줄을 그대로 번역하는 주석은 피하고, 호출자가 알아야 할 목적·조건·결과를 중심으로 작성했습니다.

### 검증

- Maven 컴파일 성공과 `git diff --check` 통과를 확인했습니다.

## 2026-08-29 - 학생·학부모 숙제 공유 화면 오류 수정

### 역할 및 데이터 소유 기준

- 학생을 숙제·과목 데이터의 소유자로 유지합니다.
- 승인된 연결 학부모는 자신의 사용자 ID를 변경 수행자 `actorId`로 사용하되, 조회와 저장 대상은 연결 학생 ID를 사용합니다.
- 학생과 학부모가 서로 다른 숙제 사본을 갖지 않고 동일한 학생 소유 데이터를 조회·변경하도록 구성합니다.

### 원인 확인

- 실제 API에서 `국서준`의 사용자 ID와 `국지상` 응답에 포함된 연결 학생 ID가 모두 1로 정상임을 확인했습니다.
- 학생 ID 1의 숙제 API가 국서준 숙제 6건을 정상 반환하는 것도 확인했습니다.
- 화면은 이미 학생 ID로 제한된 API 결과를 받은 뒤 `item.studentId === 현재 학생 ID` 조건으로 다시 필터링했습니다. 클라이언트 ID 타입 또는 세션 상태가 어긋나면 정상 응답 전체가 숨겨질 수 있는 중복 조건이었습니다.

### 수정 내용

- 사용자와 연결 학생의 DB ID를 화면 상태에 넣을 때 명시적으로 숫자 타입으로 정규화했습니다.
- 숙제 API 응답은 이미 관리 대상 학생으로 제한되므로 날짜·과목·중복 검사에서 불필요한 학생 ID 2차 필터를 제거했습니다.
- 승인된 연결 학생 정보가 없는 학부모는 대시보드 시작 버튼을 사용할 수 없고 `연결된 학생이 없습니다`가 표시되도록 했습니다.
- 학생 ID는 조회·저장 대상, 학부모 ID는 변경 수행자로 계속 분리해 변경 이력과 권한 검사가 유지됩니다.

### 검증

- 임시 18080 포트 서버에서 `국서준 ID=1`, `국지상의 관리 학생 ID=1`, 공유 숙제 6건을 확인했습니다.
- 수정된 JavaScript가 서버에서 HTTP 200으로 제공되는 것을 확인했습니다.
- JavaScript 문법 검사와 `git diff --check`를 통과했습니다.
- 검증용 서버는 확인 후 정상 종료했습니다.

## 2026-08-29 - DB 숙제가 화면에 보이지 않는 날짜 필터 수정

### 원인 확인

- 실제 DB와 숙제 API에는 국서준 숙제가 정상 저장·조회되고 있었습니다.
- 확인일은 2026-08-29이고 API 숙제 마감일은 2026-08-23, 24, 25, 26 및 2026-09-04였습니다.
- 화면은 최초 진입 시 항상 오늘을 선택하고 선택 날짜의 숙제만 보여주므로, 오늘 마감 숙제가 없는 경우 DB와 API에 데이터가 있어도 빈 목록처럼 보였습니다.
- 신규 확인 데이터 `독서록쓰기`는 2026-09-04 마감으로 API에 정상 포함되어 있었지만 다음 주를 선택해야 보이는 상태였습니다.

### 수정 내용

- 숙제 로딩 후 현재 선택 날짜에 숙제가 없으면 가장 가까운 예정 숙제 날짜로 자동 이동합니다.
- 예정 숙제가 하나도 없으면 가장 최근 과거 숙제 날짜로 이동합니다.
- 자동 이동 시 주간 달력도 해당 날짜가 포함된 주로 함께 이동합니다.
- 사용자가 직접 선택한 날짜의 빈 상태에는 `8월 29일에는 숙제가 없어요.`처럼 실제 선택 날짜를 표시해 DB 누락과 날짜 필터를 구분할 수 있게 했습니다.

### 검증

- 현재 데이터 기준 자동 선택 대상이 가장 가까운 예정일인 2026-09-04임을 확인했습니다.
- 수정된 JavaScript가 임시 서버에서 HTTP 200으로 제공되는 것을 확인했습니다.
- JavaScript 문법 검사, Maven 컴파일 및 `git diff --check`를 통과했습니다.
- 검증용 서버는 확인 후 정상 종료했습니다.

## 2026-08-29 - 기능별 업무 로직 기준 문서 작성

- 향후 구현 기준으로 사용할 `job_desc.md`를 신규 작성했습니다.
- 로그인, 회원가입, 사용자 매핑, 사용자 전환, 숙제 등록·수정·진행률·삭제 및 화면 표출 로직을 입력·검증·DB 처리·화면 반영·오류 기준으로 구분했습니다.
- 학생을 숙제 데이터 소유자, 현재 로그인 사용자를 작업 수행자로 정의하고 `studentId`와 `actorId`의 역할을 분리했습니다.
- 달력의 `selectedDate`가 등록 폼의 `dueDateInput`, API 요청의 `dueDate`, DB의 `homeworks.due_date`로 이어져야 한다는 날짜 매핑 규칙을 명시했습니다.
- 현재 구현 상태와 미구현·재검토 항목을 함께 기록해 문서 수정 후 코드에 반영할 수 있도록 했습니다.

## 2026-08-29 - 숙제 선택일과 마감일 분리

### 업무 규칙 변경

- 숙제가 달력에 표시되는 날짜를 `assignedDate`(숙제 선택일·배정일)로 새로 정의했습니다.
- `dueDate`는 숙제를 완료해야 하는 마감일로만 사용하며 달력 목록 매핑 기준에서 제외했습니다.
- 마감일은 선택일과 같거나 이후여야 하며 화면, 서비스 및 DB 제약조건에서 검증합니다.
- 등록·수정 후 화면은 마감일이 아닌 저장된 선택일로 이동합니다.
- 상태의 `기한 지남` 판단은 계속 마감일을 기준으로 계산합니다.

### DB 및 서버 변경

- Flyway V6에서 `homeworks.assigned_date`를 추가했습니다.
- 기존 데이터는 화면 동작을 보존하기 위해 `assigned_date = due_date`로 이관한 뒤 NOT NULL 제약을 적용했습니다.
- 선택일 기준 활성 숙제 조회 인덱스와 `due_date >= assigned_date` 체크 제약을 추가했습니다.
- 숙제 요청·응답 DTO에 `assignedDate`를 추가했습니다.
- 등록·수정 SQL에서 선택일과 마감일을 각각 저장하고, 날짜 조건 목록 조회와 정렬은 선택일을 기준으로 변경했습니다.

### 화면 변경

- 숙제 등록·수정 화면 상단에 변경 가능한 `숙제 선택일` 입력을 추가했습니다.
- 신규 등록 시 달력 선택 날짜를 선택일 기본값으로 사용하고 마감일 기본값도 같은 날로 설정합니다.
- 수정 시 기존 선택일과 마감일을 각각 표시합니다.
- 주간 날짜 개수, 날짜별 목록 및 가장 가까운 숙제 자동 이동은 `assignedDate`를 기준으로 변경했습니다.
- 선택일과 마감일의 용도를 설명하는 안내 문구와 모바일 레이아웃을 추가했습니다.

### 실제 DB/API 검증

- Flyway V6가 실제 DB에 적용되고 기존 데이터가 정상 조회되는 것을 확인했습니다.
- 검증 숙제를 선택일 2026-08-29, 마감일 2026-09-02로 생성해 HTTP 201과 두 날짜의 분리 저장을 확인했습니다.
- 선택일 2026-08-29 조회에는 숙제가 포함되고 마감일 2026-09-02를 날짜 조건으로 조회할 때는 포함되지 않아 선택일 기준 조회를 확인했습니다.
- 마감일이 선택일보다 빠른 요청이 HTTP 400으로 거부되는 것을 확인했습니다.
- 검증 숙제는 확인 후 HTTP 204로 소프트 삭제했습니다.

## 2026-08-30 - `app.js` 목적 중심 주석 보강

### 적용 범위와 기준

- 전역 설정과 화면 상태가 담당하는 역할을 설명하는 주석을 추가했습니다.
- 날짜 처리, 사용자 정규화, 숙제 상태 판정, HTML 이스케이프 등 공통 유틸리티의 목적을 기록했습니다.
- 사용자·과목·숙제 API 조회와 화면 렌더링 함수가 어떤 데이터를 동기화하는지 설명했습니다.
- 숙제 등록·수정 폼의 초기화, 검증, 이탈 방지 및 진행률 저장 흐름을 주석으로 정리했습니다.
- 동적으로 생성되는 UI를 처리하는 이벤트 위임과 세션 사용자 복원의 이유를 명시했습니다.
- 코드 한 줄을 그대로 풀어 쓰는 주석보다 업무 목적, 데이터 기준, 유지보수 시 알아야 할 동작을 중심으로 작성했습니다.

### 검증

- `node --check src/main/resources/static/js/app.js`로 JavaScript 문법을 검사했습니다.
- `git diff --check`로 변경 파일의 공백 오류를 검사했습니다.

## 2026-08-31 - 서버 세션 로그인 및 인증 기반 권한 처리

### DB 인증 정보 추가

- Flyway `V7__add_user_authentication.sql`에서 `users` 테이블에 비밀번호 해시, 계정 활성 여부, 로그인 실패 횟수, 잠금 종료 시각 및 마지막 로그인 시각을 추가했습니다.
- 기존 테스트 사용자에는 BCrypt로 해시한 공통 초기 비밀번호 `test1234!`를 설정했습니다.
- 로그인에 5회 연속 실패하면 계정을 15분 동안 잠그고, 성공하면 실패 횟수와 잠금 상태를 초기화하도록 구성했습니다.
- 실제 PostgreSQL `managehw` 스키마에 V7을 적용해 스키마 버전 7을 확인했습니다.

### Spring Security 서버 세션 인증

- Spring Security 의존성과 `SecurityFilterChain`, BCrypt `PasswordEncoder`, DB 기반 `UserDetailsService`를 추가했습니다.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/csrf` API를 구현했습니다.
- 로그인 성공 시 인증 주체를 HTTP 세션에 저장하고 세션 ID를 변경해 세션 고정 공격을 방지합니다.
- 세션 쿠키에 HttpOnly, SameSite=Lax 및 30분 만료 설정을 적용했습니다. 운영 HTTPS에서는 `SESSION_COOKIE_SECURE=true`를 사용합니다.
- 상태 변경 요청은 CSRF 토큰을 검증하고, 미인증 요청은 HTTP 401로 처리합니다.

### API 권한 경계 변경

- 브라우저 요청 DTO와 쿼리 파라미터에서 신뢰할 수 없던 `actorId`를 제거했습니다.
- 숙제 등록·수정·삭제·진행률 변경 작업자는 서버 세션의 인증 사용자 ID로만 결정합니다.
- 숙제와 과목 조회에도 학생 본인 또는 승인된 연결 학부모 권한 검사를 추가했습니다.
- 권한이 없는 다른 학생 ID 요청은 HTTP 403으로 차단합니다.

### 로그인 UI 및 사용자 전환

- 테스트 사용자 카드 선택 화면을 로그인 ID와 비밀번호 입력 화면으로 교체했습니다.
- 학생 로그인 시 본인 숙제 화면으로, 학부모 로그인 시 승인된 연결 학생의 숙제 화면으로 이동합니다.
- 사용자 전환은 기존 서버 세션을 로그아웃한 후 로그인 화면에서 다른 계정으로 다시 인증하도록 변경했습니다.
- 브라우저 `sessionStorage` 사용자 복원을 제거하고 새로고침 시 `/api/auth/me`로 서버 세션을 확인합니다.
- JavaScript의 POST·PATCH·DELETE 요청에 서버가 발급한 CSRF 토큰을 자동으로 포함합니다.

### 검증 결과

- Maven 컴파일, JavaScript 문법 검사와 `git diff --check`를 통과했습니다.
- 학생 계정 로그인과 세션 복원, 본인 숙제 조회 HTTP 200을 확인했습니다.
- 학생이 다른 학생 숙제를 조회하면 HTTP 403, 로그아웃 후 현재 사용자 조회는 HTTP 401임을 확인했습니다.
- 학부모 계정에서 승인된 연결 학생 과목은 HTTP 200, 연결되지 않은 학생 과목은 HTTP 403임을 확인했습니다.
- 전체 테스트는 로컬 Docker 데몬이 없어 Testcontainers PostgreSQL을 시작하지 못해 완료하지 못했습니다.

## 2026-08-31 - 인증 패키지 구조 정리

- 다른 기능 패키지와 구조를 통일하기 위해 `auth` 루트에 있던 클래스를 역할별로 재배치했습니다.
- 보안 설정은 `auth/config`, 인증 DTO와 세션 사용자 모델은 `auth/dto`에 배치했습니다.
- DB 조회는 `auth/repository`, 사용자 인증 조회 서비스는 `auth/service`, 인증 API는 `auth/web`으로 분리했습니다.
- 숙제와 과목 Controller의 인증 사용자 import를 새 패키지 경로로 변경했습니다.
- Maven 컴파일과 `git diff --check`를 통과했습니다.

## 2026-08-31 - 현재 구현 및 향후 개발 로직 문서 갱신

- `job_desc.md`의 로그인, 사용자 전환, API와 권한 설명을 현재 서버 세션 구현 기준으로 변경했습니다.
- DB 인증 컬럼, 로그인 실패 잠금, CSRF, 세션 복원과 인증 사용자 기반 작업자 결정 상태를 반영했습니다.
- 현재 구현 완료 기능을 영역별 요약표로 정리했습니다.
- 회원가입, 마이페이지, 학생·학부모 관계 설정, 연결 없는 학부모 안내와 다중 학생 선택을 미구현·구현 예정 기능으로 분리했습니다.
- 각 예정 기능의 처리 흐름, 예정 API, 선행 조건과 착수 전 정책 결정 항목을 기록했습니다.
- 문서의 기존 업무 규칙과 현재 코드 상태가 충돌하는 표현을 교차 검토했습니다.

## 2026-09-02 - 화면별 HTML 및 JavaScript 모듈 분리

### 작업 목적

- 하나의 `index.html`과 `app.js`에 집중된 화면 마크업과 이벤트 처리를 화면 단위로 분리했습니다.
- 기존 단일 페이지 전환 방식과 DOM ID, CSS 및 서버 API 계약은 유지했습니다.

### HTML 구조 변경

- `index.html`은 공통 문서 구조와 Thymeleaf fragment 조립만 담당하도록 축소했습니다.
- 로그인, 대시보드, 숙제 등록·수정 화면을 각각 `fragments/login.html`, `fragments/dashboard.html`, `fragments/homework-form.html`로 분리했습니다.
- 화면들이 함께 사용하는 작성 취소·삭제 확인 대화상자, 모바일 가림막과 토스트를 `fragments/dialogs.html`로 분리했습니다.

### JavaScript 구조 변경

- 브라우저 진입점인 `app.js`를 ES module로 변경했습니다.
- API 및 CSRF 처리를 `api.js`, 공유 화면 상태를 `state.js`, DOM·날짜·이스케이프 함수를 `utils.js`로 분리했습니다.
- 로그인, 대시보드, 숙제 폼 이벤트를 `screens/login.js`, `screens/dashboard.js`, `screens/homework-form.js`로 분리했습니다.
- 화면 모듈은 초기화 함수에서 이벤트를 한 번만 등록하고, `app.js`가 필요한 작업 함수를 전달하도록 구성했습니다.

### 파일 역할 문서화

- `job_desc.md`의 `프런트엔드 화면 및 모듈 구조` 절에 분리 원칙과 HTML·JavaScript 파일별 책임을 기록했습니다.
- 업무 로직 정의와 작업 이력을 구분하기 위해 구조의 현재 기준은 `job_desc.md`, 실제 수행 내용과 검증 결과는 이 문서에 기록했습니다.

### 검증

```bash
node --check src/main/resources/static/js/*.js
node --check src/main/resources/static/js/screens/*.js
./mvnw -q -DskipTests compile
git diff --check
```

- 모든 JavaScript 모듈의 문법 검사를 통과했습니다.
- Maven 컴파일로 Thymeleaf fragment를 포함한 리소스 패키징과 Java 소스 컴파일을 확인했습니다.
- 변경 파일에서 공백 오류가 없음을 확인했습니다.

## 2026-09-02 - 학생·학부모 가족 연결 및 다중 학생 전환 구현

### 업무 정책 확정

- 학생 계정에 8자리 연결 코드를 발급하고 학부모가 코드를 입력해 연결을 요청하도록 정했습니다.
- 연결 요청은 `LINK_INVITED`, 학생 승인 후에는 `LINK_APPROVED`, 거절·요청 취소·연결 해제 후에는 `LINK_DISCONNECTED` 상태로 관리합니다.
- 승인된 관계에서만 학부모가 학생의 과목과 숙제에 접근할 수 있으며, 연결 해제 후에도 기존 숙제와 변경 이력은 유지합니다.
- 학생이 연결 승인 권한을 가지며 학생과 학부모 양쪽에서 활성 연결을 해제할 수 있게 했습니다.

### DB 및 서버 구현

- Flyway `V8__add_student_invite_code.sql`에서 학생별 연결 코드 컬럼, 형식 제약 및 부분 유니크 인덱스를 추가했습니다.
- 기존 학생 계정에도 마이그레이션 시 연결 코드를 채우고, 재발급하면 이전 코드가 즉시 무효화되도록 구현했습니다.
- 가족 연결 조회, 연결 요청, 학생 승인, 거절·취소·해제 및 코드 재발급 API를 추가했습니다.
- 요청자의 서버 세션 역할과 관계 소유자를 검증하며 승인 대기가 아닌 관계의 임의 승인을 차단했습니다.
- 현재 사용자 인증 응답을 단일 `student`에서 승인된 `students` 목록으로 변경했습니다.

### fragment 및 화면 흐름 구현

- `fragments/family-links.html`과 `screens/family-links.js`를 추가해 별도 페이지 없이 기존 단일 페이지 안에서 가족 연결 화면을 전환합니다.
- 연결 학생이 없는 학부모는 로그아웃하지 않고 연결 안내 화면으로 이동하며 연결 요청과 승인 대기 상태를 확인할 수 있습니다.
- 학생은 자신의 연결 코드를 복사·재발급하고 들어온 학부모 요청을 승인하거나 거절할 수 있습니다.
- 대시보드 프로필 메뉴에 가족 연결 관리 진입점을 추가했습니다.
- 학부모에게 승인된 학생이 여러 명이면 대시보드 상단 선택기로 관리 학생을 전환하고 숙제·과목·필터 상태를 다시 불러옵니다.
- 연결 현황 새로고침 시 현재 사용자 정보도 갱신해 외부에서 승인된 직후 숙제 화면으로 이동할 수 있게 했습니다.
- 데스크톱과 모바일 화면에 맞춘 가족 연결 카드·목록·학생 선택기 스타일을 추가했습니다.

### 문서 및 검증

- `job_desc.md`의 로그인, 사용자 매핑, 구현 현황, API 및 프런트엔드 모듈 구조를 현재 구현 기준으로 갱신했습니다.
- 다음 검증 명령을 통과했습니다.

```bash
./mvnw -q -DskipTests package
node --check src/main/resources/static/js/app.js
node --check src/main/resources/static/js/screens/family-links.js
node --check src/main/resources/static/js/screens/dashboard.js
node --check src/main/resources/static/js/screens/login.js
git diff --check
```

- 전체 `./mvnw test`는 로컬 Docker 엔진이 실행 중이지 않아 Testcontainers PostgreSQL 시작 단계에서 중단되었습니다.

## 2026-09-02 - 가족 연결 요청 성공 응답 처리 수정 및 로컬 로그 설정

### 장애 원인과 수정

- 학부모 연결 요청 API는 관계 저장 성공 후 본문 없는 HTTP 201을 반환했습니다.
- 브라우저 공통 API 모듈이 HTTP 204만 빈 응답으로 간주하고 201 응답 본문을 JSON으로 파싱해, 서버 처리가 성공해도 JavaScript `SyntaxError`가 발생했습니다.
- `requestJson()`이 응답 본문을 먼저 문자열로 읽고, 본문이 있을 때만 JSON으로 변환하도록 수정했습니다.
- 이에 따라 본문 없는 200번대 응답은 상태 코드와 관계없이 `null`로 정상 처리합니다.
- HTTP 오류 응답에 JSON Problem Detail이 있으면 `error.detail`로 보존하도록 보완했습니다.

### VS Code 및 로컬 로그 설정

- `.vscode/launch.json`을 추가해 `.env`와 `local` Spring 프로필로 `HwmvpApplication`을 실행할 수 있게 했습니다.
- `application-local.yml`에 Spring JDBC SQL과 애플리케이션 패키지 DEBUG 로그를 추가했습니다.
- 가족 연결 요청·승인·해제와 코드 재발급 시 식별자 중심의 동작 로그를 남기고, 보안상 연결 코드 값은 로그에 기록하지 않습니다.
- `DEVELOPMENT_SETUP.md`의 예전 애플리케이션 클래스명과 프로젝트명을 현재 프로젝트 기준으로 수정하고 Debug Console 확인 방법을 기록했습니다.

### 검증

```bash
./mvnw -q -DskipTests package
node --check src/main/resources/static/js/api.js
node --input-type=module -e 'globalThis.fetch=async()=>new Response("",{status:201}); const api=await import("./src/main/resources/static/js/api.js"); const result=await api.requestJson("/test",{method:"POST"}); if(result!==null) process.exit(1)'
git diff --check
```

- Maven 패키징과 JavaScript 문법 검사를 통과했습니다.
- 본문 없는 HTTP 201 모의 응답이 오류 없이 `null`로 처리되는 것을 확인했습니다.

## 2026-09-03 - 숙제 Task 체크리스트 및 자동 진행률 구현

### 업무 규칙 변경

- 숙제 과목을 국어, 영어, 수학, 기타 네 분류로 고정했습니다.
- 기존 단일 상세내용 입력을 최소 1개, 최대 50개의 독립 Task 입력으로 변경했습니다.
- Task 내용은 필수이며 한 건당 최대 500자로 제한했습니다.
- 진행률 수동 선택을 제거하고 `완료 Task 수 ÷ 전체 Task 수 × 100`을 정수로 반올림해 계산하도록 변경했습니다.
- 전체 Task 완료는 완료, 일부 완료는 진행 중, 완료 Task가 없으면 미완료로 표시하며 미완료 Task가 있는 기한 경과 숙제는 기한 지남을 우선 표시합니다.

### DB 마이그레이션

- Flyway `V9__add_homework_tasks.sql`에서 `homework_tasks` 테이블과 숙제·완료자 외래키, 내용·순서·완료 상태 제약 및 조회 인덱스를 추가했습니다.
- 기존 숙제는 상세내용이 있으면 상세내용을, 없으면 숙제 제목을 Task 한 건으로 이관합니다.
- 기존 진행률이 100%인 숙제의 이관 Task만 완료 상태로 보존하고, 부분 진행률은 정확한 Task 근거가 없어 미완료로 이관합니다.
- 기존 과학·사회 등 네 분류 밖의 숙제는 학생별 기타 과목으로 변경하며 원본 과목 레코드는 삭제하지 않습니다.

### 서버 구현

- 숙제 저장 요청에 Task ID와 내용을 포함하고 응답에 Task 목록, 완료 개수, 전체 개수 및 계산 진행률을 반환하도록 DTO를 변경했습니다.
- 숙제 등록 시 Task를 함께 만들고, 수정 시 기존 Task ID의 완료 상태를 유지하면서 내용·순서를 수정합니다.
- 폼에서 제거한 Task는 삭제하고 새 Task는 미완료 상태로 추가합니다.
- `PATCH /api/homework-tasks/{taskId}/completion` API에서 Task 완료·취소, 완료자와 완료 시각, 숙제 최근 수정자를 하나의 트랜잭션으로 저장합니다.
- 숙제 이력 스냅샷에 숙제 본문과 정렬된 Task 목록을 함께 저장합니다.
- 기존 수동 진행률 API와 요청 DTO를 제거하고 조회 SQL에서 Task 집계로 진행률을 계산합니다.

### UI 및 JavaScript 변경

- 숙제 등록·수정 fragment에 동적 Task 입력 목록과 할 일 추가·삭제 버튼을 구현했습니다.
- Enter 키로 Task 입력을 추가할 수 있고 빈 Task가 있으면 저장을 차단합니다.
- 과목 선택과 과목 필터를 국어, 영어, 수학, 기타로 고정했습니다.
- 숙제 카드를 펼치면 Task별 체크박스를 표시하고 체크 결과를 서버에 즉시 저장합니다.
- 카드에는 완료 Task 수, 전체 Task 수와 자동 계산된 진행률을 함께 표시합니다.
- 기존 0·25·50·75·100 진행률 선택 메뉴를 제거했습니다.

### 검증

```bash
./mvnw -q -DskipTests package
node --check src/main/resources/static/js/app.js
node --check src/main/resources/static/js/screens/homework-form.js
node --check src/main/resources/static/js/screens/dashboard.js
git diff --check
```

- Java 소스 컴파일과 애플리케이션 패키징을 통과했습니다.
- 변경한 JavaScript 모듈의 문법 검사와 공백 검사를 통과했습니다.
- 전체 DB 통합 테스트는 로컬 Docker/Testcontainers 실행 환경이 없어 수행하지 못했습니다.

## 2026-09-03 - 테스트 사용자별 비밀번호 분리 및 프로필 정렬 수정

### 인증 데이터 변경

- Flyway `V10__set_individual_test_user_passwords.sql`을 추가해 사용자 ID 1~4의 비밀번호를 요청된 서로 다른 BCrypt cost 12 해시로 변경했습니다.
- 평문 복원이 불가능한 단방향 해시만 `users.password_hash`에 저장합니다.
- 로그인 화면에서 공통 테스트 비밀번호를 표시하던 문구를 삭제했습니다.

### 대시보드 정렬 수정

- 숨겨진 관리 학생 선택기에도 인접 형제 CSS가 적용되면서 프로필·사용자 전환 버튼의 `margin-left: auto`가 해제되는 원인을 확인했습니다.
- 관리 학생 선택기가 실제로 표시될 때만 인접 프로필 버튼의 여백을 조정하도록 `.student-switcher:not(.hidden) + .profile-button` 선택자로 제한했습니다.
- 선택기가 숨겨진 학생 화면과 단일 연결 학생 화면에서는 프로필 버튼이 상단 오른쪽에 정렬됩니다.

### 검증

- `TestUserPasswordHashTest`에서 네 개의 평문과 V10 BCrypt 해시가 각각 일치하는지 검증합니다.
- Maven 패키징과 `git diff --check`로 컴파일 및 공백 오류를 확인했습니다.

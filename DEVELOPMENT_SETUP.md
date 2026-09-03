# 숙제관리 서비스 개발환경 구성 가이드

> 기준일: 2026-08-19
> 대상: Spring 기반 Java 개발 경험이 있고 VS Code 및 컨테이너 기반 검증 환경을 구성하는 개발자
> 목표: VS Code에서 Java 21, Spring Boot 4.1, Maven, Thymeleaf, 별도 PostgreSQL 17 서버, Flyway로 개발하고 애플리케이션 컨테이너를 검증한다.

## 1. 최종 기술 구성

| 영역 | 선택 기술 | 역할 |
|---|---|---|
| 언어 | Java 21 LTS | 애플리케이션 개발 |
| 프레임워크 | Spring Boot 4.1.x | 웹 애플리케이션 기반 |
| 웹 계층 | Spring MVC | 요청 처리와 화면/API 제공 |
| 화면 | Thymeleaf, HTML, CSS, JavaScript | 서버 렌더링 UI와 화면 상호작용 |
| 데이터 접근 | Spring Data JPA | 엔티티와 데이터 저장소 관리 |
| 데이터베이스 | PostgreSQL 17 | 서비스 데이터 저장 |
| DB 변경 관리 | Flyway | 스키마 버전 및 마이그레이션 관리 |
| 빌드 | Maven Wrapper | 빌드 환경 통일 |
| 테스트 | JUnit 5, Spring Boot Test, Testcontainers | 단위·통합 테스트 |
| 개발 IDE | Visual Studio Code | Java 작성, 실행, 디버깅 |
| 컨테이너 런타임 | OrbStack 또는 Docker Desktop | 테스트 컨테이너와 애플리케이션 이미지 실행 |
| WAS | Spring Boot 내장 Tomcat | 별도 Tomcat 설치 없이 애플리케이션 실행 |

별도의 Tomcat 서버에 WAR 파일을 배포하지 않는다. Spring Boot 실행형 JAR 안의 내장 Tomcat을 사용하고, 운영과 유사한 확인이 필요할 때 애플리케이션 자체를 Docker 컨테이너로 실행한다.

## 2. 완성될 실행 구조

```text
웹 브라우저
    │ http://localhost:8080
    ▼
Spring Boot 애플리케이션 컨테이너
├─ Spring MVC
├─ Thymeleaf
├─ Spring Data JPA
└─ 내장 Tomcat
    │ jdbc:postgresql://<DB_HOST>:5432/<DB_NAME>
    ▼
별도 PostgreSQL 17 서버
```

개발 중에는 다음 두 가지 실행 방식을 사용한다.

1. 일반 개발: VS Code에서 Spring Boot 실행 + 별도 PostgreSQL 17 서버 사용
2. 통합 확인: 애플리케이션만 컨테이너로 실행 + 같은 PostgreSQL 17 서버 사용

개발 DB는 Docker로 생성하지 않는다. 컨테이너 런타임은 Testcontainers 기반 통합 테스트와 애플리케이션 이미지 검증에만 사용한다.

## 3. 사전 설치

### 3.1 필수 프로그램

- Git
- JDK 21
- Visual Studio Code
- OrbStack 또는 Docker Desktop
- 별도 PostgreSQL 17 서버의 접속 정보와 네트워크 접근 권한

Maven은 별도로 설치하지 않아도 된다. 프로젝트에 포함할 Maven Wrapper인 `mvnw`를 사용한다.

### 3.2 설치 확인

터미널에서 다음 명령을 각각 실행한다.

```bash
git --version
java -version
docker --version
docker compose version
```

확인 기준:

- `java -version`에 `21`이 표시된다.
- `docker --version`이 오류 없이 버전을 출력한다.
- `docker compose version`이 `Docker Compose version ...`을 출력한다.

Docker 명령이 연결 오류를 표시하면 Docker Desktop을 먼저 실행한 후 다시 확인한다.

OrbStack을 선택했다면 위 문장의 Docker Desktop 대신 OrbStack을 실행한다.

### 3.3 VS Code 확장 설치

VS Code의 Extensions 화면에서 다음 확장을 설치한다.

- Extension Pack for Java (`vscjava.vscode-java-pack`)
- Spring Boot Extension Pack (`vmware.vscode-boot-dev-pack`)
- Thymeleaf 확장(`thymeleaf` 검색 후 유지보수 상태가 양호한 확장 선택, 선택 사항)
- Docker (`ms-azuretools.vscode-docker`, 선택 사항)

설치 후 VS Code를 다시 시작한다. 아직 `pom.xml`과 Java 소스가 없는 현재 작업 폴더에서는 `Java: Configure Java Runtime`을 실행하면 `There are no Java projects opened in the current workspace` 메시지가 나오는 것이 정상이다. 프로젝트 JDK 지정은 4장에서 Spring Boot 프로젝트를 생성한 후 진행한다.

이 단계에서는 VS Code의 새 통합 터미널을 열고 JDK 21 설치 여부만 확인한다.

```bash
java -version
```

결과에 `21`이 표시되면 4장으로 진행한다. 설치된 JDK 목록과 경로는 다음 명령으로 확인할 수 있다.

```bash
/usr/libexec/java_home -V
/usr/libexec/java_home -v 21
```

### 3.4 Spring 프로젝트 생성 후 실행할 JDK 설정 절차

이 절차는 4장의 Spring Boot 프로젝트 생성과 `pom.xml` 배치가 끝난 후 실행한다.

1. VS Code에서 이 프로젝트 폴더를 연다.
2. macOS에서는 `Command + Shift + P`, Windows/Linux에서는 `Ctrl + Shift + P`를 눌러 **명령 팔레트(Command Palette)**를 연다.
3. 입력창에 `Java: Configure Java Runtime`을 입력한다.
4. 검색 결과에 표시된 **Java: Configure Java Runtime**을 선택하고 `Enter`를 누른다.
5. 열린 설정 화면의 `Project JDKs`에서 `managehw` 프로젝트에 Java 21이 지정되어 있는지 확인한다.
6. Java 21이 없다면 `Installed JDKs`의 `Add` 또는 `Download JDK`를 선택한다. 이미 설치했다면 JDK 홈 디렉터리를 지정한다.

VS Code 설정 화면에 경로를 직접 입력해야 한다면 앞에서 `/usr/libexec/java_home -v 21`이 출력한 디렉터리를 사용한다.

## 4. Spring Boot 프로젝트 생성

현재 저장소에는 화면 시안인 `index.html`, `styles.css`, `app.js`가 루트에 있다. Spring 프로젝트를 구성한 다음 각각 `src/main/resources` 아래로 이동할 예정이다. 원본은 이동이 끝나고 화면이 정상 출력되는 것을 확인할 때까지 보존한다.

### 4.1 Spring Initializr 설정

[Spring Initializr](https://start.spring.io/)에서 다음과 같이 선택한다.

| 항목 | 값 |
|---|---|
| Project | Maven |
| Language | Java |
| Spring Boot | 표시되는 최신 3.5.x 안정 버전 |
| Group | `com.managehw` |
| Artifact | `managehw` |
| Name | `managehw` |
| Package name | `com.managehw` |
| Packaging | Jar |
| Java | 21 |

Dependencies에는 다음 항목을 추가한다.

- Spring Web
- Thymeleaf
- Spring Data JPA
- PostgreSQL Driver
- Flyway Migration
- Validation
- Spring Boot DevTools
- Testcontainers

`Docker Compose Support` 의존성은 추가하지 않는다. 개발 DB가 별도 서버에 있고 애플리케이션 컨테이너도 명령으로 직접 관리하기 때문이다.

Generate 버튼으로 프로젝트를 내려받아 압축을 푼다. 생성된 파일을 이 저장소 루트에 배치한다. `pom.xml`, `mvnw`, `mvnw.cmd`, `.mvn/`, `src/`가 저장소 루트에 있어야 한다.

파일 배치 후 VS Code에서 `Developer: Reload Window` 명령을 실행한다. Java 확장이 `pom.xml`을 읽을 때까지 잠시 기다린 다음 3.4절의 `Java: Configure Java Runtime` 절차를 실행한다.

### 4.2 생성 결과 확인

```text
managehw/
├─ .mvn/
├─ src/
│  ├─ main/
│  │  ├─ java/com/managehw/
│  │  └─ resources/
│  └─ test/
├─ mvnw
├─ mvnw.cmd
└─ pom.xml
```

macOS 또는 Linux에서 Wrapper 실행 권한이 없다면 다음 명령을 한 번 실행한다.

```bash
chmod +x mvnw
```

프로젝트가 빌드되는지 확인한다.

```bash
./mvnw clean test
```

Windows PowerShell에서는 다음 명령을 사용한다.

```powershell
.\mvnw.cmd clean test
```

마지막에 `BUILD SUCCESS`가 나오면 다음 단계로 진행한다.

## 5. 권장 디렉터리 구조

초기 패키지는 다음 구조로 구성한다.

```text
src/main/java/com/managehw/
├─ ManagehwApplication.java
├─ common/
│  ├─ config/
│  ├─ exception/
│  └─ web/
├─ user/
│  ├─ domain/
│  ├─ repository/
│  ├─ service/
│  └─ web/
├─ homework/
│  ├─ domain/
│  ├─ repository/
│  ├─ service/
│  └─ web/
└─ subject/
   ├─ domain/
   ├─ repository/
   ├─ service/
   └─ web/

src/main/resources/
├─ db/migration/
├─ static/
│  ├─ css/
│  ├─ js/
│  └─ images/
├─ templates/
├─ application.yml
├─ application-local.yml
├─ application-test.yml
└─ application-docker.yml
```

기능별 패키지를 먼저 나누고 그 안에서 `domain`, `repository`, `service`, `web`을 구분한다. 모든 Controller나 모든 Service를 하나의 전역 패키지에 모으지 않는다.

## 6. 별도 PostgreSQL 17 서버 연결 준비

### 6.1 로컬 환경 변수 파일

저장소 루트에 `.env.example`을 만들고 다음 내용을 기록한다.

```dotenv
DB_HOST=your-postgresql-host
DB_PORT=5432
DB_NAME=managehw
DB_USERNAME=managehw_app
DB_PASSWORD=replace-with-local-secret
DB_SSLMODE=prefer
```

`.env.example`을 복사하여 실제 로컬 설정인 `.env`를 만든다.

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

`.env`는 Git에 커밋하지 않는다. `.gitignore`에 다음 항목을 추가한다.

```gitignore
.env
target/
.vscode/*.local.json
```

### 6.2 서버 측 준비 항목

DB 관리자에게 다음 항목을 확인하거나 요청한다.

- PostgreSQL 버전이 17인지
- 개발 전용 데이터베이스와 애플리케이션 계정이 준비되었는지
- 개발 Mac의 IP 또는 접속 네트워크가 허용되었는지
- VPN이나 SSH 터널이 필요한지
- TLS 연결이 필수인지와 필요한 인증서 위치
- 애플리케이션 계정에 스키마 생성·변경 권한이 있는지
- Flyway가 사용할 `flyway_schema_history` 테이블 생성 권한이 있는지
- 개발 DB 백업 및 초기화 담당자가 누구인지

애플리케이션 계정에 PostgreSQL 슈퍼유저 권한을 주지 않는다. 가능하면 이 프로젝트가 사용하는 데이터베이스 또는 스키마에만 권한을 부여한다.

### 6.3 DB 접속 확인

로컬에 `psql`이 설치되어 있다면 다음처럼 확인한다. 실제 값은 `.env`의 값으로 바꾼다.

```bash
psql "host=<DB_HOST> port=5432 dbname=<DB_NAME> user=<DB_USERNAME> sslmode=prefer" \
  -c "select version(), current_database(), current_user;"
```

`psql`이 없다면 VS Code의 PostgreSQL 클라이언트 확장 또는 조직에서 사용하는 DB 도구로 같은 접속 정보를 검증해도 된다. PostgreSQL 17 버전, 데이터베이스명, 애플리케이션 계정이 결과에 표시되어야 한다.

공용 개발 서버에 대해 데이터베이스 삭제, 스키마 전체 삭제 또는 볼륨 초기화 명령을 실행하지 않는다.

## 7. Spring 프로필과 DB 연결

### 7.1 공통 설정

`src/main/resources/application.yml`:

```yaml
spring:
  application:
    name: managehw
  profiles:
    default: local
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        format_sql: true
  flyway:
    enabled: true

server:
  port: 8080
```

`ddl-auto`는 `create`나 `update`가 아닌 `validate`로 둔다. 테이블 변경은 Flyway SQL 파일로만 관리한다.

### 7.2 로컬 프로필

`src/main/resources/application-local.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:${DB_PORT:5432}/${DB_NAME}?sslmode=${DB_SSLMODE:prefer}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  thymeleaf:
    cache: false

logging:
  level:
    org.hibernate.SQL: debug
    org.springframework.jdbc.core.JdbcTemplate: debug
    org.loveits.hwmvp: debug
```

VS Code의 Java 실행도 `.env`를 자동으로 Spring 환경 변수에 전달하지 않을 수 있다. 저장소 루트에 `.vscode/launch.json`을 만들고 다음처럼 `envFile`을 지정한다.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "HwmvpApplication (local)",
      "request": "launch",
      "mainClass": "org.loveits.hwmvp.HwmvpApplication",
      "projectName": "hwmvp",
      "envFile": "${workspaceFolder}/.env",
      "env": {
        "SPRING_PROFILES_ACTIVE": "local"
      }
    }
  ]
}
```

`.vscode/launch.json`은 비밀값을 포함하지 않으므로 Git에 커밋해 팀 실행환경을 통일할 수 있다.

### 7.3 Docker 프로필

`src/main/resources/application-docker.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:${DB_PORT:5432}/${DB_NAME}?sslmode=${DB_SSLMODE:prefer}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  thymeleaf:
    cache: true
```

애플리케이션 컨테이너에서도 별도 DB 서버 주소를 사용한다. DB 방화벽이 Docker VM/컨테이너에서 나가는 연결을 허용하는지 확인한다. SSH 터널의 `localhost`를 사용하는 환경이라면 컨테이너에서 같은 터널에 접근하는 추가 설정이 필요하므로, 우선 VS Code 로컬 실행으로 개발한다.

## 8. Flyway 첫 마이그레이션

`src/main/resources/db/migration/V1__create_initial_schema.sql`을 만든다.

초기 파일에는 다음 테이블이 들어갈 예정이다.

- `users`
- `parent_student_links`
- `subjects`
- `homeworks`
- `homework_histories`

파일 이름 규칙은 다음과 같다.

```text
V1__create_initial_schema.sql
V2__insert_test_users.sql
V3__add_homework_indexes.sql
```

한번 공유되거나 운영 DB에 적용된 마이그레이션 파일은 수정하지 않는다. 변경이 필요하면 다음 번호의 새 파일을 만든다.

초기 마이그레이션 SQL은 데이터 모델을 확정한 다음 작성한다. 빈 `V1` 파일을 먼저 실행하지 않는다.

## 9. 기존 화면 시안 연결

Spring 프로젝트 생성 후 기존 시안 파일을 다음 위치로 옮긴다.

```text
index.html  → src/main/resources/templates/home.html
styles.css → src/main/resources/static/css/home.css
app.js     → src/main/resources/static/js/home.js
```

`home.html`의 참조 경로는 Thymeleaf 방식으로 변경한다.

```html
<link rel="stylesheet" th:href="@{/css/home.css}">
<script th:src="@{/js/home.js}" defer></script>
```

홈 화면 Controller의 최소 형태는 다음과 같다.

```java
package com.managehw.homework.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "home";
    }
}
```

서버 실행 후 `http://localhost:8080`에서 기존 화면이 표시되는지 확인한다.

## 10. 로컬 애플리케이션 실행

### 10.1 DB 연결 확인

별도 PostgreSQL 17 서버에 접속 가능한 네트워크 또는 VPN에 연결하고 `.env`의 접속 정보를 확인한다. DB 서버를 로컬에서 시작하거나 중지하지 않는다.

### 10.2 Spring Boot 실행

VS Code의 Run and Debug에서 `HwmvpApplication (local)`을 선택해 실행한다. 실행 중인 애플리케이션 로그와 JDBC SQL은 VS Code의 Debug Console에서 확인한다. 터미널에서 실행할 때는 셸에 DB 환경변수가 설정되어 있어야 한다.

```bash
./mvnw spring-boot:run
```

정상 확인:

- 로그에 `Tomcat started on port 8080`이 나타난다.
- 로그에 Flyway 마이그레이션 성공 내용이 나타난다.
- 브라우저에서 `http://localhost:8080`에 접속할 수 있다.

종료는 실행 터미널에서 `Ctrl+C`를 누른다.

## 11. 애플리케이션 Docker 이미지 구성

DB 연결과 기본 화면이 먼저 정상 동작한 다음 이 단계를 진행한다.

### 11.1 `.dockerignore`

저장소 루트에 `.dockerignore`를 만든다.

```dockerignore
.git
.vscode
.env
target
```

### 11.2 `Dockerfile`

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline

COPY src src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=builder /workspace/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

외부 Tomcat 이미지는 사용하지 않는다. `app.jar`가 내장 Tomcat과 애플리케이션을 함께 포함한다.

### 11.3 Compose에 애플리케이션 추가

저장소 루트에 다음 내용으로 `compose.yml`을 만든다. DB 서비스는 정의하지 않는다.

```yaml
services:
  app:
    build:
      context: .
    container_name: managehw-app
    restart: unless-stopped
    environment:
      SPRING_PROFILES_ACTIVE: docker
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT:-5432}
      DB_NAME: ${DB_NAME}
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_SSLMODE: ${DB_SSLMODE:-prefer}
    ports:
      - "8080:8080"
```

애플리케이션을 빌드하고 실행한다.

```bash
docker compose up --build
```

별도 터미널에서 상태를 확인한다.

```bash
docker compose ps
docker compose logs app
```

브라우저에서 `http://localhost:8080`에 접속한다. 컨테이너에서 별도 DB 서버로 연결되지 않으면 DB 방화벽, VPN 경로, DNS 및 TLS 설정을 먼저 확인한다. 확인이 끝나면 포그라운드 실행 터미널에서 `Ctrl+C`를 누르고 다음 명령으로 애플리케이션 컨테이너를 정리한다.

```bash
docker compose down
```

## 12. 테스트 구성 원칙

### 12.1 테스트 구분

| 테스트 | 대상 | DB |
|---|---|---|
| 단위 테스트 | 숙제 상태 계산, 권한 규칙 | 사용하지 않음 |
| MVC 테스트 | Controller 요청·응답, 입력 검증 | Mock 또는 필요한 슬라이스만 사용 |
| 통합 테스트 | Repository, Flyway, 트랜잭션 | Testcontainers PostgreSQL |
| 화면 흐름 테스트 | 등록부터 완료까지 주요 흐름 | 추후 도입 |

H2를 PostgreSQL 대신 사용하지 않는다. SQL과 타입 동작 차이를 줄이기 위해 자동화된 DB 통합 테스트는 Testcontainers의 PostgreSQL 17 컨테이너로 실행한다. 이 컨테이너는 테스트마다 격리된 임시 DB이며 별도 개발 서버의 데이터를 변경하지 않는다.

### 12.2 전체 테스트

```bash
./mvnw test
```

### 12.3 빌드 검증

```bash
./mvnw clean verify
```

`BUILD SUCCESS`가 나오고 `target/` 아래 실행 가능한 JAR가 생성되면 정상이다.

## 13. Git과 비밀정보 관리

Git에 커밋할 파일:

- `.env.example`
- `compose.yml`
- `Dockerfile`
- `pom.xml`
- Maven Wrapper
- Flyway 마이그레이션
- 애플리케이션 소스와 테스트

Git에 커밋하지 않을 파일:

- `.env`
- 실제 DB 비밀번호
- 개인 VS Code 설정 중 비밀정보를 포함한 파일
- 빌드 결과인 `target/`
- 운영 인증키와 외부 서비스 키

설정 파일에는 비밀값 자체를 기록하지 않고 `${ENVIRONMENT_VARIABLE}` 형식으로 참조한다.

## 14. 일상적인 개발 순서

매번 개발을 시작할 때:

```bash
./mvnw spring-boot:run
```

일반적으로는 VS Code의 Run and Debug를 사용한다. 실행 전 별도 DB 서버 접속에 필요한 VPN과 `.env` 값을 확인한다.

코드를 변경한 후:

```bash
./mvnw test
```

커밋 또는 작업 종료 전:

```bash
./mvnw clean verify
```

애플리케이션 컨테이너 환경 확인이 필요할 때:

```bash
docker compose up --build
```

작업을 마칠 때 애플리케이션 컨테이너를 실행했다면 `docker compose down`으로 해당 컨테이너만 종료한다. 별도 PostgreSQL 서버는 이 프로젝트의 Compose가 관리하지 않는다.

## 15. 단계별 완료 체크리스트

아래 항목을 위에서부터 한 단계씩 확인한다.

- [ ] Git, Java 21, VS Code, OrbStack 또는 Docker Desktop 설치 확인
- [ ] VS Code Java 및 Spring Boot 확장 설치
- [ ] Spring Boot 3.5.x Maven 프로젝트 생성
- [ ] `./mvnw clean test` 성공
- [ ] `.env.example`, `.env`, `.gitignore` 구성
- [ ] 별도 PostgreSQL 17 서버 주소, 계정, 네트워크 권한 확인
- [ ] `psql` 또는 DB 도구를 이용한 원격 DB 접속 확인
- [ ] `application.yml`과 local/docker 프로필 작성
- [ ] 초기 Flyway 스키마 작성 및 실행
- [ ] 기존 HTML/CSS/JS를 Thymeleaf/static 경로로 이동
- [ ] 로컬 Spring Boot 실행 및 `localhost:8080` 접속
- [ ] 단위 테스트와 Testcontainers 통합 테스트 구성
- [ ] Dockerfile 작성
- [ ] 애플리케이션 컨테이너에서 별도 DB 서버 연결 확인
- [ ] `./mvnw clean verify` 성공

## 16. 자주 발생하는 문제

### `Connection refused` 또는 DB 연결 실패

```bash
nc -vz <DB_HOST> 5432
```

다음 순서로 확인한다.

1. DB 호스트와 포트가 정확한지 확인한다.
2. VPN 또는 사내 네트워크 연결을 확인한다.
3. 개발 Mac의 IP가 DB 방화벽에 허용되어 있는지 확인한다.
4. `DB_SSLMODE`와 서버 TLS 정책이 일치하는지 확인한다.
5. 계정 비밀번호와 대상 데이터베이스 권한을 확인한다.

컨테이너에서만 연결이 실패하면 Docker VM의 네트워크 경로가 DB 서버에 허용되는지 확인한다.

### Flyway checksum 오류

이미 실행한 마이그레이션 파일을 수정했을 가능성이 크다. 적용된 파일을 임의로 다시 편집하지 말고 새로운 버전 파일을 추가한다.

### Docker 빌드에서 테스트 또는 의존성 오류

먼저 호스트 환경에서 다음 명령을 실행해 애플리케이션 자체의 문제인지 구분한다.

```bash
./mvnw clean verify
```

그다음 Docker 빌드 로그를 자세히 확인한다.

```bash
docker compose build --no-cache app
```

### 화면 변경이 바로 보이지 않음

로컬 프로필에서 Thymeleaf 캐시가 비활성화되어 있는지 확인한다. Java 클래스 변경은 DevTools가 재시작하며, 동작하지 않으면 VS Code에서 애플리케이션을 직접 재실행한다.

## 17. 첫 구현 순서

환경 구성이 끝나면 다음 순서로 기능을 개발한다.

1. 초기 DB 스키마와 테스트 사용자 데이터
2. 개발용 학생·학부모 사용자 전환
3. 숙제 상태 계산 도메인 로직과 단위 테스트
4. 날짜별 숙제 조회 화면
5. 숙제 등록·수정·삭제
6. 진행률 변경과 변경 이력 기록
7. 학부모의 연결 학생 전환 및 요약 화면
8. 권한 통합 테스트와 반응형·접근성 검증

환경 구성과 기능 구현을 한 번에 진행하지 않는다. 체크리스트의 한 단계를 통과한 다음 다음 단계로 이동한다.

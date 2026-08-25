# 내부망 운영 서버 배포

이 문서는 별도 PostgreSQL 서버를 사용하는 애플리케이션 컨테이너 배포 절차입니다. PostgreSQL 컨테이너는 생성하지 않습니다.

## 1. 서버 준비

- 64비트 Linux 서버
- Docker Engine 및 Docker Compose 플러그인
- 운영 서버에서 PostgreSQL 서버의 5432 포트로 접속 가능한 네트워크
- `managehw` 스키마 및 애플리케이션 DB 계정

서버 방화벽은 서비스 이용자 내부망에서 `APP_PORT`로 들어오는 연결만 허용합니다. PostgreSQL은 운영 서버 IP에서 오는 연결만 허용하고 인터넷에는 공개하지 않습니다.

### Ubuntu에 Docker 설치

Ubuntu 22.04, 24.04 등 Docker가 지원하는 64비트 Ubuntu에서 공식 APT 저장소를 사용합니다.

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

```bash
. /etc/os-release
DOCKER_UBUNTU_CODENAME="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
DOCKER_ARCH="$(dpkg --print-architecture)"

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${DOCKER_UBUNTU_CODENAME}
Components: stable
Architectures: ${DOCKER_ARCH}
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

설치를 확인합니다.

```bash
sudo docker run --rm hello-world
sudo docker version
sudo docker compose version
```

일반 계정에서 `sudo` 없이 Docker를 사용해야 할 때만 해당 계정을 `docker` 그룹에 추가합니다. `docker` 그룹은 사실상 root 수준 권한을 가지므로 운영 정책을 확인한 후 적용합니다.

```bash
sudo usermod -aG docker "$USER"
```

적용하려면 SSH 연결을 종료하고 다시 접속합니다. 그룹에 추가하지 않을 경우 이후 배포 명령 앞에 `sudo`를 붙입니다.

## 2. 환경변수 준비

먼저 개발 PC의 프로젝트를 운영 서버에 복사하거나 Git 저장소에서 내려받습니다. 아래 명령은 운영 서버에서 `compose.yml`, `Dockerfile`, `pom.xml`, `mvnw`, `.mvn/`, `src/`가 있는 프로젝트 최상위 디렉터리로 이동한 뒤 실행합니다.

```bash
cd /opt/hwmvp
pwd
ls -la
```

`ls` 결과에서 최소한 `compose.yml`, `Dockerfile`, `.env.example`, `pom.xml`, `mvnw`, `src`를 확인해야 합니다. `/opt/hwmvp`는 예시이므로 실제 프로젝트를 배치한 경로를 사용합니다.

```bash
cp .env.example .env
chmod 600 .env
```

`.env`의 다음 값을 운영 환경에 맞게 변경합니다.

- `APP_BIND_ADDRESS`: 운영 서버의 내부 IP
- `APP_PORT`: 사용자가 접속할 포트, 기본 8080
- `DB_HOST`, `DB_PORT`, `DB_NAME`: PostgreSQL 접속 대상
- `DB_SCHEMA`: `managehw`
- `DB_USERNAME`, `DB_PASSWORD`: 애플리케이션 전용 계정
- `DB_SSLMODE`: DB의 SSL 정책에 따라 `prefer`, `require` 등 지정

`.env`는 Git이나 Docker 이미지에 포함되지 않습니다.

## 3. DB 사전 확인

배포 전에 DB 관리자에게 다음을 확인합니다.

- `managehw` 스키마가 존재하는지
- 계정에 스키마 USAGE와 테이블·시퀀스 사용 및 변경 권한이 있는지
- 기존 데이터 백업이 완료되었는지
- `flyway_schema_history`와 애플리케이션 테이블이 일관된 상태인지

애플리케이션 시작 시 Flyway가 미적용 마이그레이션을 실행하고 Hibernate가 테이블 구조를 검증합니다. `create-schemas`는 비활성화되어 있어 스키마를 자동 생성하지 않습니다.

## 4. 배포 및 확인

다음 명령도 `compose.yml`과 `.env`가 있는 프로젝트 최상위 디렉터리에서 실행합니다.

```bash
docker compose config
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=200 hwmvp
```

헬스체크:

```bash
curl http://127.0.0.1:8080/actuator/health
```

다른 내부 PC에서는 다음 주소로 화면을 확인합니다.

```text
http://<APP_BIND_ADDRESS>:<APP_PORT>/
```

정상 기준은 컨테이너 상태가 `healthy`이고 헬스 응답이 `{"status":"UP"}`인 것입니다.

## 5. 갱신과 이전 버전 복구

배포 전 DB를 백업한 뒤 새 소스를 배치하고 다음을 실행합니다.

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=200 hwmvp
```

Flyway 마이그레이션은 앞으로만 적용되므로 애플리케이션 이미지만 이전 버전으로 되돌려도 DB 구조가 자동 복구되지는 않습니다. DB 변경이 있는 배포는 반드시 DB 백업과 복구 절차를 함께 준비합니다.

## 6. 운영 점검

- `docker compose ps`로 컨테이너 상태 확인
- `docker compose logs hwmvp`로 애플리케이션 로그 확인
- 디스크 사용량 및 Docker 로그 크기 확인
- PostgreSQL 정기 백업과 실제 복구 시험
- OS, Docker 및 Java 기반 이미지의 보안 업데이트 적용
- 서버 재부팅 후 컨테이너가 자동 시작되는지 확인

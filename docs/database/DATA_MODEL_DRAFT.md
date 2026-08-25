# 숙제관리 데이터 모델 초안

> 기준: `docs/refdoc/db.txt`  
> DBMS: PostgreSQL 17  
> 상태: 물리명·타입 검토용

## 설계 원칙

- 영문 `snake_case`, 복수형 테이블명을 사용한다.
- PK는 `bigint identity`, FK는 `bigint`로 통일한다.
- 일시는 `timestamptz`, 날짜만 의미하는 종료일은 `date`를 사용한다.
- 사용/삭제 여부는 `boolean`, 상세 내용은 `text`, 변경 값은 `jsonb`를 사용한다.
- 공통코드는 문자열을 중복 저장하지 않고 `common_codes.id`를 FK로 참조한다.

## 관계

```text
common_codes 1 ── N common_codes (parent)
common_codes 1 ── N users / links / subjects / homeworks / histories
users(parent) 1 ── N parent_student_links N ── 1 users(student)
users(student) 1 ── N subjects
users(student) 1 ── N homeworks N ── 1 subjects
homeworks 1 ── N homework_histories
```

## 물리 정의

### 공통코드 `common_codes`

| 논리명 | 물리명 | 타입 | 필수 | 비고 |
|---|---|---|:---:|---|
| 시퀀스 | `id` | `bigint identity` | Y | PK |
| 코드 | `code` | `varchar(50)` | Y | UNIQUE |
| 코드명 | `code_name` | `varchar(100)` | Y | 표시명 |
| 코드설명 | `description` | `varchar(500)` | N |  |
| 비고 | `remark` | `varchar(500)` | N |  |
| 순번 | `sort_order` | `integer` | Y | 기본 0 |
| 계층 | `hierarchy_level` | `smallint` | Y | 1 이상 |
| 부모코드 | `parent_code_id` | `bigint` | N | 자기참조 FK |
| 사용여부 | `is_active` | `boolean` | Y | 기본 true |
| 생성일/수정일 | `created_at`, `updated_at` | `timestamptz` | Y |  |

### 사용자 `users`

| 논리명 | 물리명 | 타입 | 필수 | 비고 |
|---|---|---|:---:|---|
| 시퀀스 | `id` | `bigint identity` | Y | PK |
| 역할 | `role_code_id` | `bigint` | Y | 공통코드 FK |
| 이름 | `name` | `varchar(100)` | Y | 공백 불가 |
| 아이디 | `login_id` | `varchar(100)` | Y | 대소문자 무시 UNIQUE |
| 지역 | `region_code_id` | `bigint` | N | 법정동 5자리 공통코드 FK |
| 생성일/수정일 | `created_at`, `updated_at` | `timestamptz` | Y |  |

지역은 선택 입력으로 가정했다. 필수라면 `region_code_id NOT NULL`로 변경한다.

### 역할관계 `parent_student_links`

| 논리명 | 물리명 | 타입 | 필수 | 비고 |
|---|---|---|:---:|---|
| 시퀀스 | `id` | `bigint identity` | Y | PK |
| 부모아이디 | `parent_id` | `bigint` | Y | 사용자 FK |
| 학생아이디 | `student_id` | `bigint` | Y | 사용자 FK |
| 상태 | `status_code_id` | `bigint` | Y | 공통코드 FK |
| 생성일/수정일 | `created_at`, `updated_at` | `timestamptz` | Y |  |

동일한 부모·학생 조합은 한 건만 허용한다. 실제 역할 적합성은 서비스에서 검증한다.

### 과목 `subjects`

| 논리명 | 물리명 | 타입 | 필수 | 비고 |
|---|---|---|:---:|---|
| 시퀀스 | `id` | `bigint identity` | Y | PK |
| 학생아이디 | `student_id` | `bigint` | Y | 사용자 FK |
| 과목코드 | `subject_code_id` | `bigint` | N | 공통코드 FK |
| 과목명 | `name` | `varchar(100)` | Y | 학생별 UNIQUE |
| 과목설명 | `description` | `text` | N |  |
| 생성일/수정일 | `created_at`, `updated_at` | `timestamptz` | Y |  |

사용자 정의 과목을 고려해 `subject_code_id`는 NULL을 허용한다. 기본 과목은 코드를 연결한다.

### 숙제 `homeworks`

| 논리명 | 물리명 | 타입 | 필수 | 비고 |
|---|---|---|:---:|---|
| 시퀀스 | `id` | `bigint identity` | Y | PK |
| 학생아이디 | `student_id` | `bigint` | Y | 사용자 FK |
| 과목시퀀스 | `subject_id` | `bigint` | Y | 과목 FK |
| 타이틀 | `title` | `varchar(200)` | Y | 공백 불가 |
| 상세내용 | `description` | `text` | N |  |
| 종료일 | `due_date` | `date` | Y | 마감일 의미 |
| 진행율 | `progress_code_id` | `bigint` | Y | 공통코드 FK |
| 등록/수정아이디 | `created_by`, `updated_by` | `bigint` | Y | 사용자 FK |
| 삭제아이디 | `deleted_by` | `bigint` | N | 사용자 FK |
| 삭제일시 | `deleted_at` | `timestamptz` | N |  |
| 삭제여부 | `is_deleted` | `boolean` | Y | 기본 false |
| 생성일/수정일 | `created_at`, `updated_at` | `timestamptz` | Y |  |

`(subject_id, student_id)` 복합 FK로 다른 학생의 과목 연결을 차단한다. 삭제 여부·시각·작업자는 CHECK로 일치시킨다.

### 숙제이력관리 `homework_histories`

| 논리명 | 물리명 | 타입 | 필수 | 비고 |
|---|---|---|:---:|---|
| 시퀀스 | `id` | `bigint identity` | Y | PK |
| 숙제 시퀀스 | `homework_id` | `bigint` | Y | 숙제 FK |
| 상태 | `action_code_id` | `bigint` | Y | 공통코드 FK |
| 작업 사용자아이디 | `actor_id` | `bigint` | Y | 사용자 FK |
| 변경전값 | `before_data` | `jsonb` | N | 생성 시 NULL 가능 |
| 변경후값 | `after_data` | `jsonb` | N | 삭제 시 NULL 가능 |
| 작업일시(추가 권장) | `created_at` | `timestamptz` | Y | 이력 발생 시각 |

감사 이력에는 시점이 반드시 필요하므로 원문에 없는 `created_at`을 보완했다. 두 JSON이 동시에 NULL인 행은 허용하지 않는다.

## 공통코드 예시

| 그룹 | 하위 코드 |
|---|---|
| `ROLE` | `ROLE_PARENT`, `ROLE_STUDENT` |
| `LINK_STATUS` | `LINK_INVITED`, `LINK_APPROVED`, `LINK_DISCONNECTED` |
| `SUBJECT` | `SUBJECT_KOREAN`, `SUBJECT_MATH`, `SUBJECT_ENGLISH`, `SUBJECT_OTHER` |
| `PROGRESS` | `PROGRESS_0`, `PROGRESS_25`, `PROGRESS_50`, `PROGRESS_75`, `PROGRESS_100` |
| `HW_ACTION` | `HW_CREATED`, `HW_UPDATED`, `HW_DELETED` |
| `REGION` | 법정동 코드 앞 5자리(예: `11680`) |

## 결정이 필요한 부분

1. 범용 공통코드는 FK만으로 역할 컬럼에 역할 그룹만 들어오는지 보장하지 못한다. 서비스 검증 또는 그룹별 테이블 분리가 필요하다.
2. 법정동 코드의 적용 기준일과 갱신 방식을 정해야 한다.
3. `is_deleted`는 `deleted_at`으로 계산할 수 있는 중복 값이다. 원문에 맞춰 포함했지만 제거를 권장한다.
4. 진행률 집계가 많다면 공통코드 FK보다 `smallint`와 CHECK가 단순하고 효율적이다.
5. `updated_at` 자동 갱신은 JPA 감사 기능이나 DB 트리거 중 하나를 선택해야 한다.

실제 제약조건과 인덱스는 [`schema-draft.sql`](./schema-draft.sql)에 정의했다. 확정 전까지 Flyway 경로로 옮기지 않는다.

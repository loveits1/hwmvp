// 날짜 비교 시 시각의 영향을 받지 않도록 오늘을 자정 기준으로 고정합니다.
const today = startOfDay(new Date());
let csrfHeaderName = "X-CSRF-TOKEN";
let csrfToken = "";

// 숙제 상태별 표시 문구와 강조색을 한곳에서 관리해 요약 카드와 목록의 표현을 통일합니다.
const statusInfo = {
  all: { label: "전체", color: "#2f7659" },
  done: { label: "완료", color: "#277a55" },
  doing: { label: "진행 중", color: "#bd6a1d" },
  todo: { label: "미완료", color: "#c74f4f" },
  overdue: { label: "기한 지남", color: "#991f2b" }
};
// 과목 카드에서 사용할 대표 문자를 정의하며, 등록되지 않은 과목은 과목명의 첫 글자를 사용합니다.
const subjectIcons = { 국어: "가", 영어: "A", 수학: "＋", 과학: "⚗", 사회: "⌁" };

// 여러 화면이 공유하는 사용자 선택, 필터, 로딩, 폼 상태를 단일 객체에서 관리합니다.
const state = {
  currentUser: null,
  selectedDate: today,
  weekStart: startOfWeek(today),
  statusFilter: "all",
  subjectFilter: "all",
  selectedSubject: "",
  subjects: [],
  subjectsLoading: false,
  homeworkLoading: false,
  homeworkError: false,
  progressSavingId: null,
  expandedHomeworkIds: new Set(),
  homework: [],
  formDirty: false,
  editingId: null,
  deleteTargetId: null
};

const $ = selector => document.querySelector(selector);
// 화면 전환 시 표시할 최상위 영역을 이름으로 조회할 수 있도록 보관합니다.
const screens = { login: $("#loginScreen"), dashboard: $("#dashboardScreen"), form: $("#formScreen") };

// 달력 계산과 API 날짜 문자열 변환에 사용하는 공통 유틸리티입니다.
function startOfDay(date) { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; }
function addDays(date, days) { const value = new Date(date); value.setDate(value.getDate() + days); return value; }
function startOfWeek(date) { const value = startOfDay(date); const day = value.getDay() || 7; return addDays(value, 1 - day); }
function isoDate(date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-"); }
function parseDate(value) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); }
function sameDay(a, b) { return isoDate(a) === isoDate(b); }
function studentDatabaseId() { return state.currentUser?.role === "student" ? state.currentUser.databaseId : state.currentUser?.studentDatabaseId; }
function studentName() { return state.currentUser?.role === "student" ? state.currentUser.name : state.currentUser?.studentName; }
// 진행률을 우선 적용하고, 미완료 숙제는 마감일과 오늘을 비교해 화면 상태를 결정합니다.
function statusOf(item) {
  if (item.progress === 100) return "done";
  if (parseDate(item.dueDate) < today) return "overdue";
  if (item.progress > 0) return "doing";
  return "todo";
}
// 사용자 및 API 데이터를 HTML 문자열에 넣기 전에 이스케이프하여 의도하지 않은 마크업 실행을 막습니다.
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}
// 지정한 화면만 노출하고 스크롤 위치를 초기화해 화면 전환의 시작점을 일정하게 맞춥니다.
function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => screen.classList.toggle("hidden", key !== name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
// 짧은 작업 결과나 오류를 알리고 일정 시간이 지나면 자동으로 닫습니다.
function showToast(message) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

// 모든 JSON API 요청의 헤더, 오류 처리, 204 응답 처리를 공통화합니다.
async function requestJson(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken ? { [csrfHeaderName]: csrfToken } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const error = new Error(`API request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

// 인증 API 응답을 대시보드가 사용하는 사용자 구조로 변환하고 DB ID를 숫자로 통일합니다.
function normalizeUser(user) {
  if (user.role === "student") {
    return { id: user.loginId, databaseId: Number(user.id), role: user.role, name: user.name };
  }
  return {
    id: user.loginId,
    databaseId: Number(user.id),
    role: user.role,
    name: user.name,
    studentDatabaseId: user.student?.id == null ? null : Number(user.student.id),
    studentName: user.student?.name
  };
}

// 서버가 발급한 CSRF 토큰을 이후 로그인과 데이터 변경 요청에 사용합니다.
async function loadCsrfToken() {
  const csrf = await requestJson("/api/auth/csrf");
  csrfHeaderName = csrf.headerName;
  csrfToken = csrf.token;
}

// 현재 관리 대상 학생의 과목을 조회해 필터와 등록·수정 폼에서 함께 사용합니다.
async function loadSubjects() {
  const databaseId = studentDatabaseId();
  state.subjects = []; state.subjectsLoading = true; renderSubjects();
  if (!databaseId) { state.subjectsLoading = false; renderSubjects(); return; }
  try {
    state.subjects = await requestJson(`/api/students/${databaseId}/subjects`);
  } catch {
    showToast("과목 정보를 불러오지 못했어요.");
  } finally {
    state.subjectsLoading = false; renderSubjects();
    if (!screens.form.classList.contains("hidden")) renderSubjectOptions();
  }
}

// 현재 관리 대상 학생의 숙제를 조회하고 대시보드에 표시할 날짜와 목록을 갱신합니다.
async function loadHomeworks() {
  const databaseId = studentDatabaseId();
  state.homework = []; state.expandedHomeworkIds.clear(); state.homeworkLoading = true; state.homeworkError = false; renderDashboard();
  if (!databaseId) { state.homeworkLoading = false; state.homeworkError = true; renderDashboard(); return; }
  try {
    state.homework = await requestJson(`/api/students/${databaseId}/homeworks`);
    moveToNearestHomeworkDate();
  } catch {
    state.homeworkError = true;
  } finally {
    state.homeworkLoading = false; renderDashboard();
  }
}

// 오늘 숙제가 없을 때 빈 화면 대신 가장 가까운 예정일, 없으면 가장 최근 과거일로 이동합니다.
function moveToNearestHomeworkDate() {
  const selectedDateValue = isoDate(state.selectedDate);
  if (!state.homework.length || state.homework.some(item => item.assignedDate === selectedDateValue)) return;

  const assignedDates = [...new Set(state.homework.map(item => item.assignedDate))]
    .map(parseDate)
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);
  const nearestDate = assignedDates.find(date => date >= today) || assignedDates.at(-1);
  if (!nearestDate) return;

  state.selectedDate = nearestDate;
  state.weekStart = startOfWeek(nearestDate);
}

// 선택한 사용자 세션을 시작하고 학생 또는 연결 학생 기준의 대시보드 데이터를 불러옵니다.
function enterDashboard(user) {
  state.currentUser = normalizeUser(user);
  user = state.currentUser;
  state.selectedDate = today; state.weekStart = startOfWeek(today); state.statusFilter = "all"; state.subjectFilter = "all";
  $("#profileName").textContent = user.name;
  $("#profileContext").textContent = user.role === "student" ? "학생" : `${user.studentName} 학생의 숙제`;
  $("#profileAvatar").textContent = user.name[0];
  $("#profileMenuLabel").textContent = `${user.name} · ${user.role === "student" ? "학생" : "학부모"}`;
  renderDashboard(); showScreen("dashboard"); loadSubjects(); loadHomeworks();
}

// 날짜, 요약, 과목, 숙제 영역을 현재 상태 기준으로 한 번에 동기화합니다.
function renderDashboard() {
  renderDates(); renderSummary(); renderSubjects(); renderHomework();
  const date = state.selectedDate;
  $("#badgeMonth").textContent = `${date.getMonth() + 1}월`;
  $("#badgeDay").textContent = date.getDate();
  $("#selectedDateTitle").textContent = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(date);
}

function itemsForDate() {
  // 숙제 API가 관리 대상 학생으로 이미 범위를 제한하므로 날짜 조건만 적용합니다.
  return state.homework.filter(item => item.assignedDate === isoDate(state.selectedDate));
}
// 선택한 주의 7일과 날짜별 숙제 개수를 표시합니다.
function renderDates() {
  $("#yearLabel").textContent = `${state.weekStart.getFullYear()}년`;
  const end = addDays(state.weekStart, 6);
  $("#weekLabel").textContent = `${state.weekStart.getMonth() + 1}월 ${Math.ceil(state.weekStart.getDate() / 7)}주`;
  const formatter = new Intl.DateTimeFormat("ko-KR", { weekday: "long" });
  $("#dateList").innerHTML = Array.from({ length: 7 }, (_, index) => addDays(state.weekStart, index)).map(date => {
    const count = state.homework.filter(item => item.assignedDate === isoDate(date)).length;
    const active = sameDay(date, state.selectedDate);
    return `<button class="date-item ${active ? "active" : ""}" type="button" data-date="${isoDate(date)}" aria-current="${active ? "date" : "false"}">
      <span class="date-number">${date.getDate()}</span>
      <span class="date-copy"><strong>${formatter.format(date)}</strong><small>${sameDay(date, today) ? "오늘" : `${date.getMonth() + 1}월`}</small></span>
      <span class="date-count" aria-label="숙제 ${count}개">${count}</span>
    </button>`;
  }).join("");
  void end;
}
// 선택 날짜의 숙제를 상태별로 집계해 요약 필터를 구성합니다.
function renderSummary() {
  const items = itemsForDate();
  const counts = { all: items.length, done: 0, doing: 0, todo: 0, overdue: 0 };
  items.forEach(item => counts[statusOf(item)]++);
  $("#summaryGrid").innerHTML = Object.entries(statusInfo).map(([key, info]) => `<button class="summary-card ${state.statusFilter === key ? "active" : ""}" type="button" data-status="${key}" style="--status-color:${info.color}" aria-pressed="${state.statusFilter === key}">
    <span class="summary-dot" aria-hidden="true"></span><span><small>${info.label}</small><strong>${counts[key]}</strong></span>
  </button>`).join("");
  $("#selectedDateSummary").textContent = `숙제 ${items.length}개 중 ${counts.done}개를 완료했어요.`;
}
// 학생 과목과 숙제에 남아 있는 과목을 합쳐 누락 없는 과목 필터를 만듭니다.
function renderSubjects() {
  const select = $("#subjectFilter");
  const apiSubjects = state.subjects.map(subject => subject.name);
  const homeworkSubjects = state.homework.map(item => item.subject);
  const subjects = [...new Set([...apiSubjects, ...homeworkSubjects])];
  if (state.subjectsLoading) {
    select.innerHTML = '<option value="all">과목 불러오는 중...</option>'; select.disabled = true; return;
  }
  select.disabled = false;
  select.innerHTML = '<option value="all">전체 과목</option>' + subjects.map(subject => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("");
  if (!subjects.includes(state.subjectFilter)) state.subjectFilter = "all";
  select.value = state.subjectFilter;
}
// 마감일을 오늘과 비교해 사용자가 이해하기 쉬운 상대 날짜 문구로 변환합니다.
function dueLabel(item) {
  const date = parseDate(item.dueDate); const diff = Math.round((date - today) / 86400000);
  if (statusOf(item) === "overdue") return `기한 지남 · ${date.getMonth() + 1}월 ${date.getDate()}일까지`;
  if (diff === 0) return `오늘 · ${date.getMonth() + 1}월 ${date.getDate()}일까지`;
  if (diff === 1) return `내일 · ${date.getMonth() + 1}월 ${date.getDate()}일까지`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일까지`;
}
// 마지막 변경 작업자와 시각을 숙제 카드의 이력 안내 문구로 변환합니다.
function updatedLabel(item) {
  const date = new Date(item.updatedAt);
  const formatted = Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
  return `최종 수정 · ${item.updatedByName || item.createdByName} · ${formatted}`;
}
// 로딩·오류·빈 결과·필터 상태를 반영해 숙제 카드 목록을 다시 그립니다.
function renderHomework() {
  if (state.homeworkLoading) {
    $("#homeworkList").innerHTML = '<div class="empty-state"><h3>숙제를 불러오는 중이에요.</h3><p>잠시만 기다려 주세요.</p></div>';
    return;
  }
  if (state.homeworkError) {
    $("#homeworkList").innerHTML = '<div class="empty-state"><h3>숙제 정보를 불러오지 못했어요.</h3><p>서버 연결을 확인하고 다시 시도해 주세요.</p><button class="primary-button" type="button" data-retry-homework>다시 시도</button></div>';
    return;
  }
  let items = itemsForDate();
  if (state.statusFilter !== "all") items = items.filter(item => statusOf(item) === state.statusFilter);
  if (state.subjectFilter !== "all") items = items.filter(item => item.subject === state.subjectFilter);
  $("#filterDescription").textContent = state.statusFilter === "all" && state.subjectFilter === "all" ? "선택한 날짜의 숙제를 확인해 보세요." : "선택한 조건으로 목록을 필터링했어요.";
  if (!items.length) {
    const filtered = state.statusFilter !== "all" || state.subjectFilter !== "all";
    const selectedDateLabel = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(state.selectedDate);
    $("#homeworkList").innerHTML = `<div class="empty-state"><h3>${filtered ? "조건에 맞는 숙제가 없어요." : `${selectedDateLabel}에는 숙제가 없어요.`}</h3><p>${filtered ? "필터를 초기화하거나 다른 조건을 선택해 보세요." : "다른 날짜를 선택하거나 새 숙제를 등록해 주세요."}</p><button class="primary-button" type="button" data-empty-action="${filtered ? "reset" : "add"}">${filtered ? "필터 초기화" : "숙제 추가"}</button></div>`;
    return;
  }
  $("#homeworkList").innerHTML = items.map(item => {
    const status = statusOf(item), info = statusInfo[status];
    const expanded = state.expandedHomeworkIds.has(item.id);
    return `<article class="homework-card ${status}" style="--status-color:${info.color}">
      <span class="status-bar" aria-hidden="true"></span>
      <span class="subject-icon" aria-hidden="true">${escapeHtml(subjectIcons[item.subject] || item.subject[0])}</span>
      <div class="homework-info"><div class="homework-meta"><span class="subject-name">${escapeHtml(item.subject)}</span>${item.createdByRole === "parent" ? `<span class="parent-badge">학부모 등록 · ${escapeHtml(item.createdByName)}</span>` : ""}</div>
        <h3><button class="homework-title-button" type="button" data-detail-id="${item.id}" aria-expanded="${expanded}" aria-controls="homework-detail-${item.id}" title="${escapeHtml(item.title)}"><span>${escapeHtml(item.title)}</span><span class="detail-chevron" aria-hidden="true">⌄</span></button></h3>
        <div class="homework-description ${expanded ? "" : "hidden"}" id="homework-detail-${item.id}"><strong>상세내용</strong><p>${escapeHtml(item.description || "등록된 상세 내용이 없어요.")}</p></div>
        <span class="due">${dueLabel(item)}</span><small class="update-meta">${escapeHtml(updatedLabel(item))}</small></div>
      <div class="progress" aria-label="진행률 ${item.progress}%"><div class="progress-label"><span>진행률</span><strong>${item.progress}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${item.progress}%"></div></div></div>
      <div class="status-control">
        <button class="status-button" type="button" data-progress-menu-id="${item.id}" aria-label="${escapeHtml(item.title)} 진행률 변경" aria-expanded="false" ${state.progressSavingId === item.id ? "disabled" : ""}>
          <span>${state.progressSavingId === item.id ? "저장 중" : info.label}</span><strong>${item.progress}%</strong><span aria-hidden="true">⌄</span>
        </button>
        <div class="progress-menu hidden" data-progress-menu="${item.id}" role="menu" aria-label="진행률 선택">
          ${[0, 25, 50, 75, 100].map(progress => `<button type="button" role="menuitemradio" aria-checked="${item.progress === progress}" data-progress-id="${item.id}" data-progress-value="${progress}"><span>${progress === 0 ? "미완료" : progress === 100 ? "완료" : "진행 중"}</span><strong>${progress}%</strong></button>`).join("")}
        </div>
      </div>
      <button class="card-menu-button" type="button" data-menu-id="${item.id}" aria-label="${escapeHtml(item.title)} 메뉴 열기" aria-expanded="false">⋯</button>
      <div class="card-action-menu hidden" data-action-menu="${item.id}"><button type="button" data-edit-id="${item.id}">수정</button><button class="delete-action" type="button" data-delete-id="${item.id}">삭제</button></div>
    </article>`;
  }).join("");
}

// 선택한 진행률을 서버에 저장하고 성공한 응답으로 로컬 목록을 즉시 동기화합니다.
async function updateHomeworkProgress(homeworkId, progress) {
  state.progressSavingId = homeworkId; renderHomework();
  try {
    const updated = await requestJson(`/api/homeworks/${homeworkId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ progress })
    });
    const index = state.homework.findIndex(item => item.id === homeworkId);
    if (index >= 0) state.homework[index] = updated;
    showToast(progress === 100 ? "숙제를 완료했어요." : `진행률을 ${progress}%로 변경했어요.`);
  } catch {
    showToast("진행률을 저장하지 못했어요. 다시 시도해 주세요.");
  } finally {
    state.progressSavingId = null; renderDashboard();
  }
}

// 등록과 수정이 같은 폼을 공유하도록 대상 숙제 유무에 따라 초기값과 문구를 구성합니다.
function openForm(item = null) {
  state.editingId = item?.id || null; state.selectedSubject = ""; state.formDirty = false; $("#homeworkForm").reset();
  $("#formTitle").textContent = item ? "숙제 수정" : "숙제 등록";
  $("#saveButton").textContent = item ? "수정 내용 저장" : "숙제 저장";
  const defaultAssignedDate = item?.assignedDate || isoDate(state.selectedDate);
  $("#targetStudent").textContent = studentName();
  $("#assignedDateInput").value = defaultAssignedDate;
  $("#dueDateInput").value = item?.dueDate || defaultAssignedDate;
  if (item) {
    state.selectedSubject = state.subjects.some(subject => subject.name === item.subject) ? item.subject : "기타";
    $("#customSubject").value = state.selectedSubject === "기타" ? item.subject : "";
    $("#titleInput").value = item.title;
    $("#descriptionInput").value = item.description || "";
  }
  $("#descriptionCount").textContent = "0 / 2,000자"; $("#formError").classList.add("hidden");
  if (item) $("#descriptionCount").textContent = `${($("#descriptionInput").value.length).toLocaleString()} / 2,000자`;
  clearErrors(); renderSubjectOptions(); showScreen("form");
}
// 조회된 과목과 사용자 정의 과목 입력 진입점인 '기타' 선택지를 렌더링합니다.
function renderSubjectOptions() {
  const subjects = [...state.subjects.map(subject => subject.name), "기타"];
  $("#subjectOptions").innerHTML = subjects.map(subject => `<button class="subject-option ${state.selectedSubject === subject ? "selected" : ""}" type="button" data-subject="${escapeHtml(subject)}">${escapeHtml(subject)}${subject === "기타" ? " +" : ""}</button>`).join("");
  $("#customSubjectField").classList.toggle("hidden", state.selectedSubject !== "기타");
}
// 재검증 전에 기존 오류 표시를 제거해 현재 입력값의 오류만 남깁니다.
function clearErrors() {
  ["subject", "customSubject", "title", "assignedDate", "dueDate"].forEach(name => { $("[id='" + name + "Error']").textContent = ""; });
  document.querySelectorAll(".invalid").forEach(element => element.classList.remove("invalid"));
}
// 필수값, 과목 중복, 선택일과 마감일 순서를 저장 요청 전에 검증합니다.
function validateForm() {
  clearErrors(); let valid = true;
  const title = $("#titleInput").value.trim(), assignedDate = $("#assignedDateInput").value, dueDate = $("#dueDateInput").value, custom = $("#customSubject").value.trim();
  if (!state.selectedSubject) { $("#subjectError").textContent = "과목을 선택해 주세요."; valid = false; }
  if (state.selectedSubject === "기타" && !custom) { $("#customSubjectError").textContent = "기타 과목명을 입력해 주세요."; $("#customSubject").classList.add("invalid"); valid = false; }
  const duplicate = state.subjects.some(subject => subject.name.toLowerCase() === custom.toLowerCase()) || state.homework.some(item => item.id !== state.editingId && item.subject.toLowerCase() === custom.toLowerCase());
  if (state.selectedSubject === "기타" && duplicate) { $("#customSubjectError").textContent = "이미 등록된 과목이에요."; $("#customSubject").classList.add("invalid"); valid = false; }
  if (!title) { $("#titleError").textContent = "숙제 제목을 입력해 주세요."; $("#titleInput").classList.add("invalid"); valid = false; }
  if (!assignedDate) { $("#assignedDateError").textContent = "숙제 선택일을 선택해 주세요."; $("#assignedDateInput").classList.add("invalid"); valid = false; }
  if (!dueDate) { $("#dueDateError").textContent = "마감일을 선택해 주세요."; $("#dueDateInput").classList.add("invalid"); valid = false; }
  if (assignedDate && dueDate && dueDate < assignedDate) { $("#dueDateError").textContent = "마감일은 숙제 선택일보다 빠를 수 없어요."; $("#dueDateInput").classList.add("invalid"); valid = false; }
  if (!valid) document.querySelector(".invalid")?.focus();
  return valid;
}
// 작성 중인 내용이 있을 때만 확인 대화상자를 열어 실수로 입력값을 잃지 않게 합니다.
function attemptLeaveForm() {
  if (state.formDirty) { $("#dialogBackdrop").classList.remove("hidden"); $("#keepEditingButton").focus(); }
  else showScreen("dashboard");
}

// 동적으로 다시 생성되는 카드와 메뉴를 처리하기 위해 문서 수준에서 클릭 이벤트를 위임합니다.
document.addEventListener("click", event => {
  if (event.target.closest("[data-retry-homework]")) loadHomeworks();
  const dateValue = event.target.closest("[data-date]")?.dataset.date;
  if (dateValue) { state.selectedDate = parseDate(dateValue); state.statusFilter = "all"; renderDashboard(); closeSidebar(); }
  const status = event.target.closest("[data-status]")?.dataset.status;
  if (status) { state.statusFilter = status; renderSummary(); renderHomework(); }
  const subject = event.target.closest("[data-subject]")?.dataset.subject;
  if (subject) { state.selectedSubject = subject; state.formDirty = true; renderSubjectOptions(); }
  const detailId = Number(event.target.closest("[data-detail-id]")?.dataset.detailId);
  if (detailId) {
    if (state.expandedHomeworkIds.has(detailId)) state.expandedHomeworkIds.delete(detailId);
    else state.expandedHomeworkIds.add(detailId);
    renderHomework();
  }
  const progressMenuId = Number(event.target.closest("[data-progress-menu-id]")?.dataset.progressMenuId);
  if (progressMenuId) {
    const menu = document.querySelector(`[data-progress-menu="${progressMenuId}"]`);
    const willOpen = menu.classList.contains("hidden");
    document.querySelectorAll(".progress-menu").forEach(element => element.classList.add("hidden"));
    document.querySelectorAll("[data-progress-menu-id]").forEach(button => button.setAttribute("aria-expanded", "false"));
    menu.classList.toggle("hidden", !willOpen);
    event.target.closest("[data-progress-menu-id]").setAttribute("aria-expanded", String(willOpen));
  }
  const progressButton = event.target.closest("[data-progress-value]");
  if (progressButton) updateHomeworkProgress(Number(progressButton.dataset.progressId), Number(progressButton.dataset.progressValue));
  const menuId = Number(event.target.closest("[data-menu-id]")?.dataset.menuId);
  if (menuId) {
    const menu = document.querySelector(`[data-action-menu="${menuId}"]`);
    const willOpen = menu.classList.contains("hidden");
    document.querySelectorAll(".card-action-menu").forEach(element => element.classList.add("hidden"));
    document.querySelectorAll(".card-menu-button").forEach(button => button.setAttribute("aria-expanded", "false"));
    document.querySelectorAll(".progress-menu").forEach(element => element.classList.add("hidden"));
    menu.classList.toggle("hidden", !willOpen);
    event.target.closest("[data-menu-id]").setAttribute("aria-expanded", String(willOpen));
  }
  const editId = Number(event.target.closest("[data-edit-id]")?.dataset.editId);
  if (editId) openForm(state.homework.find(item => item.id === editId));
  const deleteId = Number(event.target.closest("[data-delete-id]")?.dataset.deleteId);
  if (deleteId) {
    const item = state.homework.find(homework => homework.id === deleteId);
    state.deleteTargetId = deleteId;
    $("#deleteDialogDescription").textContent = `“${item.title}” 숙제를 삭제하면 다시 되돌릴 수 없어요.`;
    $("#deleteDialogBackdrop").classList.remove("hidden");
    $("#cancelDeleteButton").focus();
  }
  const emptyAction = event.target.closest("[data-empty-action]")?.dataset.emptyAction;
  if (emptyAction === "reset") { state.statusFilter = "all"; state.subjectFilter = "all"; renderDashboard(); }
  if (emptyAction === "add") openForm();
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".progress-menu,.card-action-menu").forEach(element => element.classList.add("hidden"));
  document.querySelectorAll("[data-progress-menu-id],.card-menu-button").forEach(button => button.setAttribute("aria-expanded", "false"));
});
$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const loginId = $("#loginIdInput").value.trim();
  const password = $("#passwordInput").value;
  const error = $("#loginError");
  const button = $("#loginButton");
  error.classList.add("hidden");
  if (!loginId || !password) {
    error.textContent = "로그인 ID와 비밀번호를 모두 입력해 주세요.";
    error.classList.remove("hidden");
    return;
  }
  button.disabled = true; button.textContent = "로그인 중...";
  try {
    const user = await requestJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ loginId, password })
    });
    if (user.role === "parent" && !user.student) {
      await requestJson("/api/auth/logout", { method: "POST" });
      throw new Error("managed-student-missing");
    }
    $("#loginForm").reset();
    enterDashboard(user);
  } catch (requestError) {
    error.textContent = requestError.message === "managed-student-missing"
      ? "승인된 연결 학생이 없어 숙제 화면을 열 수 없습니다."
      : "로그인 ID 또는 비밀번호가 올바르지 않습니다.";
    error.classList.remove("hidden");
    $("#passwordInput").focus();
  } finally {
    button.disabled = false; button.textContent = "로그인";
  }
});
$("#subjectFilter").addEventListener("change", event => { state.subjectFilter = event.target.value; renderHomework(); });
$("#prevWeek").addEventListener("click", () => { state.weekStart = addDays(state.weekStart, -7); state.selectedDate = state.weekStart; renderDashboard(); });
$("#nextWeek").addEventListener("click", () => { state.weekStart = addDays(state.weekStart, 7); state.selectedDate = state.weekStart; renderDashboard(); });
$("#todayButton").addEventListener("click", () => { state.weekStart = startOfWeek(today); state.selectedDate = today; renderDashboard(); closeSidebar(); showToast("오늘 날짜로 이동했어요."); });
$("#homeBrand").addEventListener("click", event => { event.preventDefault(); state.weekStart = startOfWeek(today); state.selectedDate = today; renderDashboard(); });
$("#addButton").addEventListener("click", openForm);
$("#menuButton").addEventListener("click", () => { $("#sidebar").classList.add("open"); $("#scrim").classList.add("show"); });
$("#scrim").addEventListener("click", closeSidebar);
// 모바일 사이드바와 배경 가림막을 함께 닫아 표시 상태가 어긋나지 않게 합니다.
function closeSidebar() { $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("show"); }
$("#profileButton").addEventListener("click", () => { const menu = $("#profileMenu"); menu.classList.toggle("hidden"); $("#profileButton").setAttribute("aria-expanded", String(!menu.classList.contains("hidden"))); });
$("#changeUserButton").addEventListener("click", async () => {
  try {
    await requestJson("/api/auth/logout", { method: "POST" });
  } finally {
    state.currentUser = null; state.homework = []; state.subjects = [];
    $("#profileMenu").classList.add("hidden");
    showScreen("login"); $("#loginIdInput").focus();
  }
});
$("#backButton").addEventListener("click", attemptLeaveForm);
$("#cancelButton").addEventListener("click", attemptLeaveForm);
$("#keepEditingButton").addEventListener("click", () => $("#dialogBackdrop").classList.add("hidden"));
$("#discardButton").addEventListener("click", () => { state.formDirty = false; $("#dialogBackdrop").classList.add("hidden"); showScreen("dashboard"); });
$("#cancelDeleteButton").addEventListener("click", () => { state.deleteTargetId = null; $("#deleteDialogBackdrop").classList.add("hidden"); });
$("#confirmDeleteButton").addEventListener("click", async () => {
  const homeworkId = state.deleteTargetId;
  $("#confirmDeleteButton").disabled = true;
  try {
    await requestJson(`/api/homeworks/${homeworkId}`, { method: "DELETE" });
    state.deleteTargetId = null; $("#deleteDialogBackdrop").classList.add("hidden");
    await loadHomeworks(); showToast("숙제를 삭제했어요.");
  } catch {
    showToast("숙제를 삭제하지 못했어요. 다시 시도해 주세요.");
  } finally {
    $("#confirmDeleteButton").disabled = false;
  }
});
$("#descriptionInput").addEventListener("input", event => { state.formDirty = true; $("#descriptionCount").textContent = `${event.target.value.length.toLocaleString()} / 2,000자`; });
$("#homeworkForm").addEventListener("input", () => { state.formDirty = true; });
$("#homeworkForm").addEventListener("submit", async event => {
  event.preventDefault(); if (!validateForm()) return;
  const button = $("#saveButton"); button.disabled = true; button.textContent = "저장 중...";
  try {
    const subject = state.selectedSubject === "기타" ? $("#customSubject").value.trim() : state.selectedSubject;
    const homeworkId = state.editingId;
    const payload = JSON.stringify({ subject, title: $("#titleInput").value.trim(), description: $("#descriptionInput").value.trim(), assignedDate: $("#assignedDateInput").value, dueDate: $("#dueDateInput").value });
    const url = homeworkId ? `/api/homeworks/${homeworkId}` : `/api/students/${studentDatabaseId()}/homeworks`;
    await requestJson(url, { method: homeworkId ? "PATCH" : "POST", body: payload });
    state.selectedDate = parseDate($("#assignedDateInput").value); state.weekStart = startOfWeek(state.selectedDate); state.formDirty = false; state.editingId = null;
    await Promise.all([loadHomeworks(), loadSubjects()]);
    showScreen("dashboard"); showToast(homeworkId ? "숙제를 수정했어요." : "숙제를 등록했어요.");
  } catch {
    $("#formError").textContent = "숙제를 저장하지 못했어요. 다시 시도해 주세요."; $("#formError").classList.remove("hidden");
  } finally { button.disabled = false; if (!screens.form.classList.contains("hidden")) button.textContent = state.editingId ? "수정 내용 저장" : "숙제 저장"; }
});

// CSRF 토큰을 준비하고 서버 세션에 로그인된 사용자가 있으면 대시보드로 복원합니다.
async function initialize() {
  try {
    await loadCsrfToken();
    const user = await requestJson("/api/auth/me");
    enterDashboard(user);
  } catch (error) {
    showScreen("login");
    if (error.status && error.status !== 401) {
      $("#loginError").textContent = "로그인 화면을 준비하지 못했습니다. 새로고침해 주세요.";
      $("#loginError").classList.remove("hidden");
    }
  }
}

initialize();

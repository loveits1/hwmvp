import { loadCsrfToken, requestJson } from "./api.js";
import { state, studentDatabaseId, studentName, today } from "./state.js";
import { $, addDays, escapeHtml, isoDate, parseDate, sameDay, startOfWeek } from "./utils.js";
import { initializeLoginScreen } from "./screens/login.js";
import { initializeDashboardScreen } from "./screens/dashboard.js";
import { initializeHomeworkFormScreen } from "./screens/homework-form.js";
import { initializeFamilyLinksScreen, renderFamilyLinks } from "./screens/family-links.js";

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

// 화면 전환 시 표시할 최상위 영역을 이름으로 조회할 수 있도록 보관합니다.
const screens = { login: $("#loginScreen"), family: $("#familyScreen"), dashboard: $("#dashboardScreen"), form: $("#formScreen") };
// 진행률을 우선 적용하고, 미완료 숙제는 마감일과 오늘을 비교해 화면 상태를 결정합니다.
function statusOf(item) {
  if (item.progress === 100) return "done";
  if (parseDate(item.dueDate) < today) return "overdue";
  if (item.progress > 0) return "doing";
  return "todo";
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
    students: (user.students || []).map(student => ({ ...student, id: Number(student.id) })),
    selectedStudentId: (user.students || []).some(student => Number(student.id) === state.currentUser?.selectedStudentId)
      ? state.currentUser.selectedStudentId : (user.students?.[0]?.id == null ? null : Number(user.students[0].id))
  };
}

function setCurrentUser(user) { state.currentUser = normalizeUser(user); }

function enterApplication(user) {
  setCurrentUser(user);
  if (state.currentUser.role === "parent" && !state.currentUser.students.length) openFamilyManagement(true);
  else enterDashboard();
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
function enterDashboard(userResponse = null) {
  if (userResponse) setCurrentUser(userResponse);
  const user = state.currentUser;
  if (user.role === "parent" && !user.students.length) { openFamilyManagement(true); return; }
  state.selectedDate = today; state.weekStart = startOfWeek(today); state.statusFilter = "all"; state.subjectFilter = "all";
  $("#profileName").textContent = user.name;
  $("#profileContext").textContent = user.role === "student" ? "학생" : `${studentName()} 학생의 숙제`;
  $("#profileAvatar").textContent = user.name[0];
  $("#profileMenuLabel").textContent = `${user.name} · ${user.role === "student" ? "학생" : "학부모"}`;
  renderStudentSwitcher(); renderDashboard(); showScreen("dashboard"); loadSubjects(); loadHomeworks();
}

function renderStudentSwitcher() {
  const parent = state.currentUser.role === "parent";
  $("#studentSwitcher").classList.toggle("hidden", !parent || state.currentUser.students.length < 2);
  $("#studentSelect").innerHTML = parent ? state.currentUser.students.map(student => `<option value="${student.id}">${escapeHtml(student.name)}</option>`).join("") : "";
  if (parent) $("#studentSelect").value = String(state.currentUser.selectedStudentId);
}

async function loadFamilyLinks() {
  $("#familyListSummary").textContent = "연결 정보를 불러오는 중이에요.";
  $("#familyLinkList").innerHTML = '<div class="family-empty"><p>잠시만 기다려 주세요.</p></div>';
  try { renderFamilyLinks(await requestJson("/api/family-links")); }
  catch { $("#familyLinkList").innerHTML = '<div class="family-empty"><strong>연결 정보를 불러오지 못했어요.</strong><p>잠시 후 새로고침해 주세요.</p></div>'; }
}

function openFamilyManagement(onboarding = false) {
	updateFamilyMode(onboarding);
	$("#inviteCodeError").textContent = "";
	showScreen("family"); loadFamilyLinks();
}

function updateFamilyMode(onboarding = false) {
  const noStudent = state.currentUser.role === "parent" && !state.currentUser.students.length;
  $("#familyTitle").textContent = noStudent ? "먼저 학생과 연결해 주세요" : "가족 연결 관리";
  $("#familyDescription").textContent = noStudent ? "연결 요청을 보내고 학생이 승인하면 숙제 화면을 사용할 수 있어요." : "학생과 학부모의 연결 요청과 승인 상태를 관리해요.";
  $("#familyBackButton").classList.toggle("hidden", onboarding || noStudent);
}

async function refreshUser() { setCurrentUser(await requestJson("/api/auth/me")); }

async function refreshFamilyScreen() {
  try { await refreshUser(); updateFamilyMode(); await loadFamilyLinks(); }
  catch { showToast("연결 현황을 새로고침하지 못했어요."); }
}

async function logout() {
  try { await requestJson("/api/auth/logout", { method: "POST" }); }
  finally { state.currentUser = null; state.homework = []; state.subjects = []; showScreen("login"); $("#loginIdInput").focus(); }
}

async function switchStudent(studentId) {
  state.currentUser.selectedStudentId = studentId;
  state.selectedDate = today; state.weekStart = startOfWeek(today); state.statusFilter = "all"; state.subjectFilter = "all";
  $("#profileContext").textContent = `${studentName()} 학생의 숙제`;
  await Promise.all([loadSubjects(), loadHomeworks()]);
  showToast(`${studentName()} 학생의 숙제로 전환했어요.`);
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
  const subjects = ["국어", "영어", "수학", "기타"];
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
        <div class="homework-description ${expanded ? "" : "hidden"}" id="homework-detail-${item.id}"><strong>할 일 · ${item.completedTaskCount}/${item.totalTaskCount} 완료</strong><div class="homework-task-list">${item.tasks.map(task => `<label class="homework-task ${task.completed ? "completed" : ""}"><input type="checkbox" data-task-id="${task.id}" ${task.completed ? "checked" : ""} ${state.taskSavingIds.has(task.id) ? "disabled" : ""}><span>${escapeHtml(task.content)}</span></label>`).join("")}</div></div>
        <span class="due">${dueLabel(item)}</span><small class="update-meta">${escapeHtml(updatedLabel(item))}</small></div>
      <div class="progress" aria-label="진행률 ${item.progress}%"><div class="progress-label"><span>진행률</span><strong>${item.progress}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${item.progress}%"></div></div></div>
      <div class="status-control"><span class="status-pill"><span>${info.label}</span><strong>${item.completedTaskCount}/${item.totalTaskCount} · ${item.progress}%</strong></span></div>
      <button class="card-menu-button" type="button" data-menu-id="${item.id}" aria-label="${escapeHtml(item.title)} 메뉴 열기" aria-expanded="false">⋯</button>
      <div class="card-action-menu hidden" data-action-menu="${item.id}"><button type="button" data-edit-id="${item.id}">수정</button><button class="delete-action" type="button" data-delete-id="${item.id}">삭제</button></div>
    </article>`;
  }).join("");
}

// Task 체크 상태를 저장하고 서버가 Task 개수로 다시 계산한 진행률을 반영합니다.
async function updateTaskCompletion(taskId, completed) {
  state.taskSavingIds.add(taskId); renderHomework();
  try {
    const updated = await requestJson(`/api/homework-tasks/${taskId}/completion`, {
      method: "PATCH",
      body: JSON.stringify({ completed })
    });
    const index = state.homework.findIndex(item => item.id === updated.id);
    if (index >= 0) state.homework[index] = updated;
    showToast(updated.progress === 100 ? "모든 할 일을 완료했어요." : `진행률이 ${updated.progress}%로 변경됐어요.`);
  } catch {
    showToast("할 일 상태를 저장하지 못했어요. 다시 시도해 주세요.");
  } finally {
    state.taskSavingIds.delete(taskId); renderDashboard();
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
  state.formTasks = (item?.tasks || [{ id: null, content: "" }]).map((task, index) => ({ id: task.id || null, content: task.content || "", key: index + 1 }));
  if (item) {
    state.selectedSubject = ["국어", "영어", "수학", "기타"].includes(item.subject) ? item.subject : "기타";
    $("#titleInput").value = item.title;
  }
  $("#formError").classList.add("hidden");
  clearErrors(); renderSubjectOptions(); renderTaskInputs(); showScreen("form");
}
// 업무 분류를 국어, 영어, 수학, 기타 네 과목으로 고정해 렌더링합니다.
function renderSubjectOptions() {
  const subjects = ["국어", "영어", "수학", "기타"];
  $("#subjectOptions").innerHTML = subjects.map(subject => `<button class="subject-option ${state.selectedSubject === subject ? "selected" : ""}" type="button" data-subject="${escapeHtml(subject)}">${escapeHtml(subject)}${subject === "기타" ? " +" : ""}</button>`).join("");
}

function renderTaskInputs(focusLast = false) {
  $("#taskInputList").innerHTML = state.formTasks.map((task, index) => `<div class="task-input-row"><span>${index + 1}</span><input type="text" maxlength="500" data-task-input="${task.key}" value="${escapeHtml(task.content)}" placeholder="예) 리딩 p.113~115" aria-label="할 일 ${index + 1}"><button type="button" data-remove-task="${task.key}" aria-label="할 일 ${index + 1} 삭제" ${state.formTasks.length === 1 ? "disabled" : ""}>×</button></div>`).join("");
  $("#addTaskButton").disabled = state.formTasks.length >= 50;
  if (focusLast) $("#taskInputList").querySelector(".task-input-row:last-child input")?.focus();
}

function addTaskInput() {
  if (state.formTasks.length >= 50) return;
  const key = Math.max(0, ...state.formTasks.map(task => task.key)) + 1;
  state.formTasks.push({ id: null, content: "", key }); state.formDirty = true; renderTaskInputs(true);
}

function removeTaskInput(key) {
  if (state.formTasks.length === 1) return;
  state.formTasks = state.formTasks.filter(task => task.key !== key); state.formDirty = true; renderTaskInputs();
}
// 재검증 전에 기존 오류 표시를 제거해 현재 입력값의 오류만 남깁니다.
function clearErrors() {
  ["subject", "title", "assignedDate", "dueDate", "tasks"].forEach(name => { $("[id='" + name + "Error']").textContent = ""; });
  document.querySelectorAll(".invalid").forEach(element => element.classList.remove("invalid"));
}
// 필수값, 과목 중복, 선택일과 마감일 순서를 저장 요청 전에 검증합니다.
function validateForm() {
  clearErrors(); let valid = true;
  const title = $("#titleInput").value.trim(), assignedDate = $("#assignedDateInput").value, dueDate = $("#dueDateInput").value;
  if (!state.selectedSubject) { $("#subjectError").textContent = "과목을 선택해 주세요."; valid = false; }
  const blankTask = state.formTasks.find(task => !task.content.trim());
  if (blankTask) { $("#tasksError").textContent = "모든 할 일의 내용을 입력해 주세요."; document.querySelector(`[data-task-input="${blankTask.key}"]`)?.classList.add("invalid"); valid = false; }
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

function openDeleteDialog(deleteId) {
  const item = state.homework.find(homework => homework.id === deleteId);
  state.deleteTargetId = deleteId;
  $("#deleteDialogDescription").textContent = `“${item.title}” 숙제를 삭제하면 다시 되돌릴 수 없어요.`;
  $("#deleteDialogBackdrop").classList.remove("hidden");
  $("#cancelDeleteButton").focus();
}

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
async function submitHomeworkForm(event) {
  event.preventDefault(); if (!validateForm()) return;
  const button = $("#saveButton"); button.disabled = true; button.textContent = "저장 중...";
  try {
    const subject = state.selectedSubject;
    const homeworkId = state.editingId;
    const tasks = state.formTasks.map(task => ({ id: task.id, content: task.content.trim() }));
    const payload = JSON.stringify({ subject, title: $("#titleInput").value.trim(), assignedDate: $("#assignedDateInput").value, dueDate: $("#dueDateInput").value, tasks });
    const url = homeworkId ? `/api/homeworks/${homeworkId}` : `/api/students/${studentDatabaseId()}/homeworks`;
    await requestJson(url, { method: homeworkId ? "PATCH" : "POST", body: payload });
    state.selectedDate = parseDate($("#assignedDateInput").value); state.weekStart = startOfWeek(state.selectedDate); state.formDirty = false; state.editingId = null;
    await Promise.all([loadHomeworks(), loadSubjects()]);
    showScreen("dashboard"); showToast(homeworkId ? "숙제를 수정했어요." : "숙제를 등록했어요.");
  } catch {
    $("#formError").textContent = "숙제를 저장하지 못했어요. 다시 시도해 주세요."; $("#formError").classList.remove("hidden");
  } finally { button.disabled = false; if (!screens.form.classList.contains("hidden")) button.textContent = state.editingId ? "수정 내용 저장" : "숙제 저장"; }
}

initializeLoginScreen({ enterApplication });
initializeDashboardScreen({ loadHomeworks, renderDashboard, renderSummary, renderHomework, updateTaskCompletion, openForm, openDeleteDialog, showToast, showScreen, openFamilyManagement, logout, switchStudent });
initializeHomeworkFormScreen({ renderSubjectOptions, renderTaskInputs, addTaskInput, removeTaskInput, attemptLeaveForm, submitHomeworkForm, showScreen });
initializeFamilyLinksScreen({ loadFamilyLinks, refreshUser, refreshFamilyScreen, updateFamilyMode, enterDashboard, showToast, logout });

// CSRF 토큰을 준비하고 서버 세션에 로그인된 사용자가 있으면 대시보드로 복원합니다.
async function initialize() {
  try {
    await loadCsrfToken();
    const user = await requestJson("/api/auth/me");
    enterApplication(user);
  } catch (error) {
    showScreen("login");
    if (error.status && error.status !== 401) {
      $("#loginError").textContent = "로그인 화면을 준비하지 못했습니다. 새로고침해 주세요.";
      $("#loginError").classList.remove("hidden");
    }
  }
}

initialize();

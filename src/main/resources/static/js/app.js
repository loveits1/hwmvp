const SESSION_KEY = "haru-user-v1";
const today = startOfDay(new Date());

const users = { student: [], parent: [] };

const statusInfo = {
  all: { label: "전체", color: "#2f7659" },
  done: { label: "완료", color: "#277a55" },
  doing: { label: "진행 중", color: "#bd6a1d" },
  todo: { label: "미완료", color: "#c74f4f" },
  overdue: { label: "기한 지남", color: "#991f2b" }
};
const subjectIcons = { 국어: "가", 영어: "A", 수학: "＋", 과학: "⚗", 사회: "⌁" };

const state = {
  role: "student",
  selectedUser: null,
  currentUser: null,
  selectedDate: today,
  weekStart: startOfWeek(today),
  statusFilter: "all",
  subjectFilter: "all",
  selectedSubject: "",
  subjects: [],
  usersLoading: true,
  usersError: false,
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
const screens = { user: $("#userScreen"), dashboard: $("#dashboardScreen"), form: $("#formScreen") };

function startOfDay(date) { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; }
function addDays(date, days) { const value = new Date(date); value.setDate(value.getDate() + days); return value; }
function startOfWeek(date) { const value = startOfDay(date); const day = value.getDay() || 7; return addDays(value, 1 - day); }
function isoDate(date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-"); }
function parseDate(value) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); }
function sameDay(a, b) { return isoDate(a) === isoDate(b); }
function studentId() { return studentDatabaseId(); }
function studentDatabaseId() { return state.currentUser?.role === "student" ? state.currentUser.databaseId : state.currentUser?.studentDatabaseId; }
function actorDatabaseId() { return state.currentUser?.databaseId; }
function studentName() { return state.currentUser?.role === "student" ? state.currentUser.name : state.currentUser?.studentName; }
function statusOf(item) {
  if (item.progress === 100) return "done";
  if (parseDate(item.dueDate) < today) return "overdue";
  if (item.progress > 0) return "doing";
  return "todo";
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}
function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => screen.classList.toggle("hidden", key !== name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function showToast(message) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

function normalizeUser(user) {
  if (user.role === "student") {
    return { id: user.loginId, databaseId: user.id, role: user.role, name: user.name, parentName: user.parentName };
  }
  return {
    id: user.loginId,
    databaseId: user.id,
    role: user.role,
    name: user.name,
    studentId: user.student?.loginId,
    studentDatabaseId: user.student?.id,
    studentName: user.student?.name
  };
}

async function loadUsers() {
  state.usersLoading = true; state.usersError = false; state.selectedUser = null; renderUsers();
  try {
    const loadedUsers = await requestJson("/api/test-users");
    users.student = loadedUsers.filter(user => user.role === "student").map(normalizeUser);
    users.parent = loadedUsers.filter(user => user.role === "parent").map(normalizeUser);
  } catch {
    users.student = []; users.parent = []; state.usersError = true;
  } finally {
    state.usersLoading = false; renderUsers();
  }
}

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

async function loadHomeworks() {
  const databaseId = studentDatabaseId();
  state.homework = []; state.expandedHomeworkIds.clear(); state.homeworkLoading = true; state.homeworkError = false; renderDashboard();
  if (!databaseId) { state.homeworkLoading = false; state.homeworkError = true; renderDashboard(); return; }
  try {
    state.homework = await requestJson(`/api/students/${databaseId}/homeworks`);
  } catch {
    state.homeworkError = true;
  } finally {
    state.homeworkLoading = false; renderDashboard();
  }
}

function renderUsers() {
  document.querySelectorAll(".role-tab").forEach(button => {
    const active = button.dataset.role === state.role;
    button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active));
  });
  if (state.usersLoading) {
    $("#userList").innerHTML = '<div class="empty-state"><h3>사용자 정보를 불러오는 중이에요.</h3><p>잠시만 기다려 주세요.</p></div>';
    $("#startButton").disabled = true; $("#startButton").textContent = "불러오는 중...";
    return;
  }
  if (state.usersError) {
    $("#userList").innerHTML = '<div class="empty-state"><h3>사용자 정보를 불러오지 못했어요.</h3><p>서버 연결을 확인하고 다시 시도해 주세요.</p><button class="secondary-button" type="button" data-retry-users>다시 시도</button></div>';
    $("#startButton").disabled = true; $("#startButton").textContent = "사용자를 선택해 주세요";
    return;
  }
  if (!users[state.role].length) {
    $("#userList").innerHTML = '<div class="empty-state"><h3>선택할 수 있는 테스트 사용자가 없어요.</h3></div>';
  } else $("#userList").innerHTML = users[state.role].map(user => {
    const selected = state.selectedUser?.id === user.id;
    const detail = user.role === "student" ? `학부모 · ${user.parentName || "연결 정보 없음"}` : `연결 학생 · ${user.studentName || "연결 정보 없음"}`;
    return `<button class="user-card ${selected ? "selected" : ""}" type="button" role="radio" aria-checked="${selected}" data-user-id="${user.id}">
      <span class="user-avatar">${escapeHtml(user.name[0])}</span>
      <span class="user-card-copy"><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(detail)}</small></span>
      <span class="radio-mark" aria-hidden="true">${selected ? "●" : "○"}</span>
    </button>`;
  }).join("");
  $("#startButton").disabled = !state.selectedUser;
  $("#startButton").textContent = state.selectedUser ? `${state.role === "student" ? "학생" : "학부모"}으로 시작` : "사용자를 선택해 주세요";
}

function enterDashboard(user) {
  state.currentUser = user; sessionStorage.setItem(SESSION_KEY, user.id);
  state.selectedDate = today; state.weekStart = startOfWeek(today); state.statusFilter = "all"; state.subjectFilter = "all";
  $("#profileName").textContent = user.name;
  $("#profileContext").textContent = user.role === "student" ? "학생" : `${user.studentName} 학생의 숙제`;
  $("#profileAvatar").textContent = user.name[0];
  $("#profileMenuLabel").textContent = `${user.name} · ${user.role === "student" ? "학생" : "학부모"}`;
  renderDashboard(); showScreen("dashboard"); loadSubjects(); loadHomeworks();
}

function renderDashboard() {
  renderDates(); renderSummary(); renderSubjects(); renderHomework();
  const date = state.selectedDate;
  $("#badgeMonth").textContent = `${date.getMonth() + 1}월`;
  $("#badgeDay").textContent = date.getDate();
  $("#selectedDateTitle").textContent = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(date);
}

function itemsForDate() {
  return state.homework.filter(item => item.studentId === studentId() && item.dueDate === isoDate(state.selectedDate));
}
function renderDates() {
  $("#yearLabel").textContent = `${state.weekStart.getFullYear()}년`;
  const end = addDays(state.weekStart, 6);
  $("#weekLabel").textContent = `${state.weekStart.getMonth() + 1}월 ${Math.ceil(state.weekStart.getDate() / 7)}주`;
  const formatter = new Intl.DateTimeFormat("ko-KR", { weekday: "long" });
  $("#dateList").innerHTML = Array.from({ length: 7 }, (_, index) => addDays(state.weekStart, index)).map(date => {
    const count = state.homework.filter(item => item.studentId === studentId() && item.dueDate === isoDate(date)).length;
    const active = sameDay(date, state.selectedDate);
    return `<button class="date-item ${active ? "active" : ""}" type="button" data-date="${isoDate(date)}" aria-current="${active ? "date" : "false"}">
      <span class="date-number">${date.getDate()}</span>
      <span class="date-copy"><strong>${formatter.format(date)}</strong><small>${sameDay(date, today) ? "오늘" : `${date.getMonth() + 1}월`}</small></span>
      <span class="date-count" aria-label="숙제 ${count}개">${count}</span>
    </button>`;
  }).join("");
  void end;
}
function renderSummary() {
  const items = itemsForDate();
  const counts = { all: items.length, done: 0, doing: 0, todo: 0, overdue: 0 };
  items.forEach(item => counts[statusOf(item)]++);
  $("#summaryGrid").innerHTML = Object.entries(statusInfo).map(([key, info]) => `<button class="summary-card ${state.statusFilter === key ? "active" : ""}" type="button" data-status="${key}" style="--status-color:${info.color}" aria-pressed="${state.statusFilter === key}">
    <span class="summary-dot" aria-hidden="true"></span><span><small>${info.label}</small><strong>${counts[key]}</strong></span>
  </button>`).join("");
  $("#selectedDateSummary").textContent = `숙제 ${items.length}개 중 ${counts.done}개를 완료했어요.`;
}
function renderSubjects() {
  const select = $("#subjectFilter");
  const apiSubjects = state.subjects.map(subject => subject.name);
  const homeworkSubjects = state.homework.filter(item => item.studentId === studentId()).map(item => item.subject);
  const subjects = [...new Set([...apiSubjects, ...homeworkSubjects])];
  if (state.subjectsLoading) {
    select.innerHTML = '<option value="all">과목 불러오는 중...</option>'; select.disabled = true; return;
  }
  select.disabled = false;
  select.innerHTML = '<option value="all">전체 과목</option>' + subjects.map(subject => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("");
  if (!subjects.includes(state.subjectFilter)) state.subjectFilter = "all";
  select.value = state.subjectFilter;
}
function dueLabel(item) {
  const date = parseDate(item.dueDate); const diff = Math.round((date - today) / 86400000);
  if (statusOf(item) === "overdue") return `기한 지남 · ${date.getMonth() + 1}월 ${date.getDate()}일까지`;
  if (diff === 0) return `오늘 · ${date.getMonth() + 1}월 ${date.getDate()}일까지`;
  if (diff === 1) return `내일 · ${date.getMonth() + 1}월 ${date.getDate()}일까지`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일까지`;
}
function updatedLabel(item) {
  const date = new Date(item.updatedAt);
  const formatted = Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
  return `최종 수정 · ${item.updatedByName || item.createdByName} · ${formatted}`;
}
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
    $("#homeworkList").innerHTML = `<div class="empty-state"><h3>${filtered ? "조건에 맞는 숙제가 없어요." : "이 날짜에는 숙제가 없어요."}</h3><p>${filtered ? "필터를 초기화하거나 다른 조건을 선택해 보세요." : "새 숙제를 등록해 오늘 할 일을 만들어 보세요."}</p><button class="primary-button" type="button" data-empty-action="${filtered ? "reset" : "add"}">${filtered ? "필터 초기화" : "숙제 추가"}</button></div>`;
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

async function updateHomeworkProgress(homeworkId, progress) {
  state.progressSavingId = homeworkId; renderHomework();
  try {
    const updated = await requestJson(`/api/homeworks/${homeworkId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ progress, actorId: actorDatabaseId() })
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

function openForm(item = null) {
  state.editingId = item?.id || null; state.selectedSubject = ""; state.formDirty = false; $("#homeworkForm").reset();
  $("#formTitle").textContent = item ? "숙제 수정" : "숙제 등록";
  $("#saveButton").textContent = item ? "수정 내용 저장" : "숙제 저장";
  $("#targetStudent").textContent = studentName(); $("#dueDateInput").value = item?.dueDate || isoDate(state.selectedDate);
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
function renderSubjectOptions() {
  const subjects = [...state.subjects.map(subject => subject.name), "기타"];
  $("#subjectOptions").innerHTML = subjects.map(subject => `<button class="subject-option ${state.selectedSubject === subject ? "selected" : ""}" type="button" data-subject="${escapeHtml(subject)}">${escapeHtml(subject)}${subject === "기타" ? " +" : ""}</button>`).join("");
  $("#customSubjectField").classList.toggle("hidden", state.selectedSubject !== "기타");
}
function clearErrors() {
  ["subject", "customSubject", "title", "dueDate"].forEach(name => { $("[id='" + name + "Error']").textContent = ""; });
  document.querySelectorAll(".invalid").forEach(element => element.classList.remove("invalid"));
}
function validateForm() {
  clearErrors(); let valid = true;
  const title = $("#titleInput").value.trim(), dueDate = $("#dueDateInput").value, custom = $("#customSubject").value.trim();
  if (!state.selectedSubject) { $("#subjectError").textContent = "과목을 선택해 주세요."; valid = false; }
  if (state.selectedSubject === "기타" && !custom) { $("#customSubjectError").textContent = "기타 과목명을 입력해 주세요."; $("#customSubject").classList.add("invalid"); valid = false; }
  const duplicate = state.subjects.some(subject => subject.name.toLowerCase() === custom.toLowerCase()) || state.homework.some(item => item.studentId === studentId() && item.id !== state.editingId && item.subject.toLowerCase() === custom.toLowerCase());
  if (state.selectedSubject === "기타" && duplicate) { $("#customSubjectError").textContent = "이미 등록된 과목이에요."; $("#customSubject").classList.add("invalid"); valid = false; }
  if (!title) { $("#titleError").textContent = "숙제 제목을 입력해 주세요."; $("#titleInput").classList.add("invalid"); valid = false; }
  if (!dueDate) { $("#dueDateError").textContent = "마감일을 선택해 주세요."; $("#dueDateInput").classList.add("invalid"); valid = false; }
  if (!valid) document.querySelector(".invalid")?.focus();
  return valid;
}
function attemptLeaveForm() {
  if (state.formDirty) { $("#dialogBackdrop").classList.remove("hidden"); $("#keepEditingButton").focus(); }
  else showScreen("dashboard");
}

document.addEventListener("click", event => {
  if (event.target.closest("[data-retry-users]")) loadUsers();
  if (event.target.closest("[data-retry-homework]")) loadHomeworks();
  const role = event.target.closest("[data-role]")?.dataset.role;
  if (role) { state.role = role; state.selectedUser = null; renderUsers(); }
  const userId = event.target.closest("[data-user-id]")?.dataset.userId;
  if (userId) { state.selectedUser = users[state.role].find(user => user.id === userId); renderUsers(); }
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
$("#startButton").addEventListener("click", () => state.selectedUser && enterDashboard(state.selectedUser));
$("#subjectFilter").addEventListener("change", event => { state.subjectFilter = event.target.value; renderHomework(); });
$("#prevWeek").addEventListener("click", () => { state.weekStart = addDays(state.weekStart, -7); state.selectedDate = state.weekStart; renderDashboard(); });
$("#nextWeek").addEventListener("click", () => { state.weekStart = addDays(state.weekStart, 7); state.selectedDate = state.weekStart; renderDashboard(); });
$("#todayButton").addEventListener("click", () => { state.weekStart = startOfWeek(today); state.selectedDate = today; renderDashboard(); closeSidebar(); showToast("오늘 날짜로 이동했어요."); });
$("#homeBrand").addEventListener("click", event => { event.preventDefault(); state.weekStart = startOfWeek(today); state.selectedDate = today; renderDashboard(); });
$("#addButton").addEventListener("click", openForm);
$("#menuButton").addEventListener("click", () => { $("#sidebar").classList.add("open"); $("#scrim").classList.add("show"); });
$("#scrim").addEventListener("click", closeSidebar);
function closeSidebar() { $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("show"); }
$("#profileButton").addEventListener("click", () => { const menu = $("#profileMenu"); menu.classList.toggle("hidden"); $("#profileButton").setAttribute("aria-expanded", String(!menu.classList.contains("hidden"))); });
$("#changeUserButton").addEventListener("click", () => { state.currentUser = null; state.selectedUser = null; sessionStorage.removeItem(SESSION_KEY); $("#profileMenu").classList.add("hidden"); renderUsers(); showScreen("user"); });
$("#backButton").addEventListener("click", attemptLeaveForm);
$("#cancelButton").addEventListener("click", attemptLeaveForm);
$("#keepEditingButton").addEventListener("click", () => $("#dialogBackdrop").classList.add("hidden"));
$("#discardButton").addEventListener("click", () => { state.formDirty = false; $("#dialogBackdrop").classList.add("hidden"); showScreen("dashboard"); });
$("#cancelDeleteButton").addEventListener("click", () => { state.deleteTargetId = null; $("#deleteDialogBackdrop").classList.add("hidden"); });
$("#confirmDeleteButton").addEventListener("click", async () => {
  const homeworkId = state.deleteTargetId;
  $("#confirmDeleteButton").disabled = true;
  try {
    await requestJson(`/api/homeworks/${homeworkId}?actorId=${actorDatabaseId()}`, { method: "DELETE" });
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
    const payload = JSON.stringify({ subject, title: $("#titleInput").value.trim(), description: $("#descriptionInput").value.trim(), dueDate: $("#dueDateInput").value, actorId: actorDatabaseId() });
    const url = homeworkId ? `/api/homeworks/${homeworkId}` : `/api/students/${studentDatabaseId()}/homeworks`;
    await requestJson(url, { method: homeworkId ? "PATCH" : "POST", body: payload });
    state.selectedDate = parseDate($("#dueDateInput").value); state.weekStart = startOfWeek(state.selectedDate); state.formDirty = false; state.editingId = null;
    await Promise.all([loadHomeworks(), loadSubjects()]);
    showScreen("dashboard"); showToast(homeworkId ? "숙제를 수정했어요." : "숙제를 등록했어요.");
  } catch {
    $("#formError").textContent = "숙제를 저장하지 못했어요. 다시 시도해 주세요."; $("#formError").classList.remove("hidden");
  } finally { button.disabled = false; if (!screens.form.classList.contains("hidden")) button.textContent = state.editingId ? "수정 내용 저장" : "숙제 저장"; }
});

async function initialize() {
  renderUsers(); await loadUsers();
  const savedUserId = sessionStorage.getItem(SESSION_KEY);
  const savedUser = Object.values(users).flat().find(user => user.id === savedUserId);
  if (savedUser) enterDashboard(savedUser);
}

initialize();

const dates = [
  { day: 17, weekday: "월요일", count: 3 },
  { day: 18, weekday: "화요일", count: 4 },
  { day: 19, weekday: "수요일", count: 5, active: true },
  { day: 20, weekday: "목요일", count: 2 },
  { day: 21, weekday: "금요일", count: 4 },
  { day: 22, weekday: "토요일", count: 1 },
  { day: 23, weekday: "일요일", count: 0 }
];

const homework = [
  { subject: "수학", icon: "＋", iconClass: "math", title: "수학 익힘책 54~57쪽 풀기", time: "오후 5시까지", progress: 100, status: "done" },
  { subject: "영어", icon: "A", iconClass: "english", title: "영어 단어 20개 외우기", time: "오후 7시까지", progress: 75, status: "doing", priority: true },
  { subject: "과학", icon: "⚗", iconClass: "science", title: "태양계 행성 조사하고 정리하기", time: "오후 8시까지", progress: 50, status: "doing" },
  { subject: "국어", icon: "가", iconClass: "korean", title: "독서 감상문 한 편 쓰기", time: "오후 9시까지", progress: 0, status: "todo" },
  { subject: "사회", icon: "⌁", iconClass: "social", title: "우리 지역 문화재 사진 찾아보기", time: "완료했어요", progress: 100, status: "done" }
];

const statusInfo = {
  done: { label: "완료", icon: '<path d="m5 12 4 4L19 6"/>' },
  doing: { label: "진행 중", icon: '<path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="9"/>' },
  todo: { label: "미완료", icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>' }
};

const dateList = document.querySelector("#dateList");
const homeworkList = document.querySelector("#homeworkList");
const summaryButtons = document.querySelectorAll(".summary-card");
const sidebar = document.querySelector(".sidebar");
const scrim = document.querySelector("#scrim");
const toast = document.querySelector("#toast");

function renderDates() {
  dateList.innerHTML = dates.map(date => `
    <button class="date-item ${date.active ? "active" : ""}" type="button" data-day="${date.day}" aria-current="${date.active ? "date" : "false"}">
      <span class="day">${date.day}</span>
      <span class="day-copy"><strong>${date.weekday}</strong><span>${date.day === 19 ? "오늘" : "8월"}</span></span>
      <span class="count" aria-label="숙제 ${date.count}개">${date.count}</span>
    </button>`).join("");
}

function renderHomework(filter = "all") {
  const items = filter === "all" ? homework : homework.filter(item => item.status === filter);
  if (!items.length) {
    homeworkList.innerHTML = '<div class="empty-state">이 상태의 숙제가 없어요. 다른 상태를 선택해 보세요.</div>';
    return;
  }
  homeworkList.innerHTML = items.map(item => {
    const status = statusInfo[item.status];
    return `
      <article class="homework-card ${item.status}">
        <span class="status-bar" aria-hidden="true"></span>
        <span class="subject-icon ${item.iconClass}" aria-hidden="true">${item.icon}</span>
        <div class="homework-info">
          <div class="meta"><span class="subject">${item.subject}</span>${item.priority ? '<span class="priority">중요</span>' : ""}</div>
          <h3>${item.title}</h3>
          <span class="due"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${item.time}</span>
        </div>
        <div class="progress-wrap" aria-label="진행률 ${item.progress}%">
          <div class="progress-copy"><span>진행률</span><strong>${item.progress}%</strong></div>
          <div class="progress-track"><div class="progress-fill" style="width:${item.progress}%"></div></div>
        </div>
        <span class="status-pill"><svg aria-hidden="true" viewBox="0 0 24 24">${status.icon}</svg>${status.label}</span>
        <button class="more-button" type="button" aria-label="${item.title} 더보기"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></button>
      </article>`;
  }).join("");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function closeMenu() {
  sidebar.classList.remove("open");
  scrim.classList.remove("show");
}

dateList.addEventListener("click", event => {
  const button = event.target.closest(".date-item");
  if (!button) return;
  const selected = dates.find(date => date.day === Number(button.dataset.day));
  dates.forEach(date => date.active = date === selected);
  renderDates();
  document.querySelector("#badgeDay").textContent = selected.day;
  document.querySelector("#selectedDateTitle").textContent = `8월 ${selected.day}일 ${selected.weekday}`;
  closeMenu();
});

summaryButtons.forEach(button => button.addEventListener("click", () => {
  summaryButtons.forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  renderHomework(button.dataset.filter);
}));

document.querySelector("#viewMode").addEventListener("change", event => {
  document.querySelector("#periodTitle").textContent = event.target.value === "week" ? "8월 4주" : "8월";
  showToast(event.target.value === "week" ? "주 단위 보기로 변경했어요." : "월 단위 보기로 변경했어요.");
});

document.querySelector("#menuButton").addEventListener("click", () => {
  sidebar.classList.add("open");
  scrim.classList.add("show");
});
scrim.addEventListener("click", closeMenu);
document.querySelector("#todayButton").addEventListener("click", () => {
  dates.forEach(date => date.active = date.day === 19);
  renderDates();
  document.querySelector("#badgeDay").textContent = "19";
  document.querySelector("#selectedDateTitle").textContent = "8월 19일 수요일";
  closeMenu();
  showToast("오늘 날짜로 이동했어요.");
});
document.querySelector("#prevPeriod").addEventListener("click", () => showToast("이전 기간의 일정을 불러왔어요."));
document.querySelector("#nextPeriod").addEventListener("click", () => showToast("다음 기간의 일정을 불러왔어요."));
document.querySelector("#addButton").addEventListener("click", () => showToast("숙제 추가 화면은 다음 단계에서 연결할 수 있어요."));

renderDates();
renderHomework();

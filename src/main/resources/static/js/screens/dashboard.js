import { state, today } from "../state.js";
import { $, addDays, parseDate, startOfWeek } from "../utils.js";

export function initializeDashboardScreen(actions) {
  document.addEventListener("click", event => {
    if (event.target.closest("[data-retry-homework]")) actions.loadHomeworks();
    const dateValue = event.target.closest("[data-date]")?.dataset.date;
    if (dateValue) { state.selectedDate = parseDate(dateValue); state.statusFilter = "all"; actions.renderDashboard(); closeSidebar(); }
    const status = event.target.closest("[data-status]")?.dataset.status;
    if (status) { state.statusFilter = status; actions.renderSummary(); actions.renderHomework(); }
    const detailId = Number(event.target.closest("[data-detail-id]")?.dataset.detailId);
    if (detailId) {
      if (state.expandedHomeworkIds.has(detailId)) state.expandedHomeworkIds.delete(detailId);
      else state.expandedHomeworkIds.add(detailId);
      actions.renderHomework();
    }
    const taskCheckbox = event.target.closest("[data-task-id]");
    if (taskCheckbox) actions.updateTaskCompletion(Number(taskCheckbox.dataset.taskId), taskCheckbox.checked);
    const menuId = Number(event.target.closest("[data-menu-id]")?.dataset.menuId);
    if (menuId) toggleActionMenu(event, menuId);
    const editId = Number(event.target.closest("[data-edit-id]")?.dataset.editId);
    if (editId) actions.openForm(state.homework.find(item => item.id === editId));
    const deleteId = Number(event.target.closest("[data-delete-id]")?.dataset.deleteId);
    if (deleteId) actions.openDeleteDialog(deleteId);
    const emptyAction = event.target.closest("[data-empty-action]")?.dataset.emptyAction;
    if (emptyAction === "reset") { state.statusFilter = "all"; state.subjectFilter = "all"; actions.renderDashboard(); }
    if (emptyAction === "add") actions.openForm();
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".card-action-menu").forEach(element => element.classList.add("hidden"));
    document.querySelectorAll(".card-menu-button").forEach(button => button.setAttribute("aria-expanded", "false"));
  });

  $("#subjectFilter").addEventListener("change", event => { state.subjectFilter = event.target.value; actions.renderHomework(); });
  $("#prevWeek").addEventListener("click", () => { state.weekStart = addDays(state.weekStart, -7); state.selectedDate = state.weekStart; actions.renderDashboard(); });
  $("#nextWeek").addEventListener("click", () => { state.weekStart = addDays(state.weekStart, 7); state.selectedDate = state.weekStart; actions.renderDashboard(); });
  $("#todayButton").addEventListener("click", () => { state.weekStart = startOfWeek(today); state.selectedDate = today; actions.renderDashboard(); closeSidebar(); actions.showToast("오늘 날짜로 이동했어요."); });
  $("#homeBrand").addEventListener("click", event => { event.preventDefault(); state.weekStart = startOfWeek(today); state.selectedDate = today; actions.renderDashboard(); });
  $("#addButton").addEventListener("click", () => actions.openForm());
  $("#menuButton").addEventListener("click", () => { $("#sidebar").classList.add("open"); $("#scrim").classList.add("show"); });
  $("#scrim").addEventListener("click", closeSidebar);
  $("#profileButton").addEventListener("click", () => { const menu = $("#profileMenu"); menu.classList.toggle("hidden"); $("#profileButton").setAttribute("aria-expanded", String(!menu.classList.contains("hidden"))); });
  $("#studentSelect").addEventListener("change", event => actions.switchStudent(Number(event.target.value)));
  $("#familyManagementButton").addEventListener("click", () => { $("#profileMenu").classList.add("hidden"); actions.openFamilyManagement(false); });
  $("#changeUserButton").addEventListener("click", actions.logout);
}

function closeSidebar() { $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("show"); }

function toggleActionMenu(event, homeworkId) {
  const menu = document.querySelector(`[data-action-menu="${homeworkId}"]`);
  const willOpen = menu.classList.contains("hidden");
  document.querySelectorAll(".card-action-menu").forEach(element => element.classList.add("hidden"));
  document.querySelectorAll(".card-menu-button").forEach(button => button.setAttribute("aria-expanded", "false"));
  menu.classList.toggle("hidden", !willOpen);
  event.target.closest("[data-menu-id]").setAttribute("aria-expanded", String(willOpen));
}

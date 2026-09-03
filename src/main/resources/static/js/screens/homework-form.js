import { state } from "../state.js";
import { $ } from "../utils.js";

export function initializeHomeworkFormScreen(actions) {
  document.addEventListener("click", event => {
    const subject = event.target.closest("[data-subject]")?.dataset.subject;
    if (subject) { state.selectedSubject = subject; state.formDirty = true; actions.renderSubjectOptions(); }
    if (event.target.closest("#addTaskButton")) actions.addTaskInput();
    const removeTask = event.target.closest("[data-remove-task]");
    if (removeTask) actions.removeTaskInput(Number(removeTask.dataset.removeTask));
  });
  $("#backButton").addEventListener("click", actions.attemptLeaveForm);
  $("#cancelButton").addEventListener("click", actions.attemptLeaveForm);
  $("#keepEditingButton").addEventListener("click", () => $("#dialogBackdrop").classList.add("hidden"));
  $("#discardButton").addEventListener("click", () => { state.formDirty = false; $("#dialogBackdrop").classList.add("hidden"); actions.showScreen("dashboard"); });
  $("#taskInputList").addEventListener("input", event => {
    const input = event.target.closest("[data-task-input]");
    if (!input) return;
    const task = state.formTasks.find(item => item.key === Number(input.dataset.taskInput));
    if (task) task.content = input.value;
  });
  $("#taskInputList").addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); actions.addTaskInput(); }
  });
  $("#homeworkForm").addEventListener("input", () => { state.formDirty = true; });
  $("#homeworkForm").addEventListener("submit", actions.submitHomeworkForm);
}

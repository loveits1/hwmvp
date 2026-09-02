import { state } from "../state.js";
import { $ } from "../utils.js";

export function initializeHomeworkFormScreen(actions) {
  document.addEventListener("click", event => {
    const subject = event.target.closest("[data-subject]")?.dataset.subject;
    if (subject) { state.selectedSubject = subject; state.formDirty = true; actions.renderSubjectOptions(); }
  });
  $("#backButton").addEventListener("click", actions.attemptLeaveForm);
  $("#cancelButton").addEventListener("click", actions.attemptLeaveForm);
  $("#keepEditingButton").addEventListener("click", () => $("#dialogBackdrop").classList.add("hidden"));
  $("#discardButton").addEventListener("click", () => { state.formDirty = false; $("#dialogBackdrop").classList.add("hidden"); actions.showScreen("dashboard"); });
  $("#descriptionInput").addEventListener("input", event => { state.formDirty = true; $("#descriptionCount").textContent = `${event.target.value.length.toLocaleString()} / 2,000자`; });
  $("#homeworkForm").addEventListener("input", () => { state.formDirty = true; });
  $("#homeworkForm").addEventListener("submit", actions.submitHomeworkForm);
}

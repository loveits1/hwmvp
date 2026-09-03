import { requestJson } from "../api.js";
import { state } from "../state.js";
import { $, escapeHtml } from "../utils.js";

export function initializeFamilyLinksScreen(actions) {
  $("#linkInvitationForm").addEventListener("submit", async event => {
    event.preventDefault();
    const input = $("#inviteCodeInput"), error = $("#inviteCodeError"), code = input.value.trim().toUpperCase();
    error.textContent = "";
    if (!/^[A-Z0-9]{8}$/.test(code)) { error.textContent = "영문과 숫자로 된 8자리 코드를 입력해 주세요."; input.focus(); return; }
    const button = $("#inviteSubmitButton"); button.disabled = true;
    try {
      await requestJson("/api/family-links/invitations", { method: "POST", body: JSON.stringify({ inviteCode: code }) });
      input.value = ""; actions.showToast("학생에게 연결 승인을 요청했어요."); await actions.loadFamilyLinks();
    } catch (requestError) {
      error.textContent = requestError.status === 404 ? "유효한 학생 연결 코드를 찾지 못했어요." : requestError.status === 409 ? "이미 연결된 학생이에요." : "연결을 요청하지 못했어요. 다시 시도해 주세요.";
    } finally { button.disabled = false; }
  });

  $("#familyLinkList").addEventListener("click", async event => {
    const approveId = Number(event.target.closest("[data-approve-link]")?.dataset.approveLink);
    const disconnectId = Number(event.target.closest("[data-disconnect-link]")?.dataset.disconnectLink);
    if (!approveId && !disconnectId) return;
    const button = event.target.closest("button"); button.disabled = true;
    try {
      if (approveId) await requestJson(`/api/family-links/${approveId}/approve`, { method: "PATCH" });
      else await requestJson(`/api/family-links/${disconnectId}`, { method: "DELETE" });
      actions.showToast(approveId ? "학부모 연결을 승인했어요." : "가족 연결을 해제했어요.");
      await actions.refreshUser(); actions.updateFamilyMode(); await actions.loadFamilyLinks();
    } catch { actions.showToast("연결 상태를 변경하지 못했어요."); button.disabled = false; }
  });

  $("#refreshFamilyLinksButton").addEventListener("click", actions.refreshFamilyScreen);
  $("#familyBackButton").addEventListener("click", () => actions.enterDashboard());
  $("#familyBrand").addEventListener("click", event => { event.preventDefault(); if (state.currentUser.role === "parent" && !state.currentUser.students.length) return; actions.enterDashboard(); });
  $("#familyLogoutButton").addEventListener("click", actions.logout);
  $("#copyInviteCodeButton").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#studentInviteCode").textContent); actions.showToast("연결 코드를 복사했어요."); }
    catch { actions.showToast("코드를 직접 선택해 복사해 주세요."); }
  });
  $("#regenerateInviteCodeButton").addEventListener("click", async () => {
    const button = $("#regenerateInviteCodeButton"); button.disabled = true;
    try { const result = await requestJson("/api/family-links/invite-code/regenerate", { method: "POST" }); $("#studentInviteCode").textContent = result.inviteCode; actions.showToast("새 연결 코드를 만들었어요."); }
    catch { actions.showToast("새 코드를 만들지 못했어요."); }
    finally { button.disabled = false; }
  });
}

export function renderFamilyLinks(result) {
  const student = state.currentUser.role === "student";
  $("#parentInviteCard").classList.toggle("hidden", student);
  $("#studentCodeCard").classList.toggle("hidden", !student);
  $("#studentInviteCode").textContent = result.inviteCode || "--------";
  $("#familyListTitle").textContent = student ? "연결된 학부모" : "연결한 학생";
  const active = result.links.filter(link => link.status !== "disconnected");
  $("#familyListSummary").textContent = active.length ? `현재 확인할 연결 ${active.length}건이 있어요.` : "아직 연결 정보가 없어요.";
  $("#familyLinkList").innerHTML = active.length ? active.map(link => {
    const invited = link.status === "invited", approved = link.status === "approved";
    const statusLabel = invited ? (student ? "승인 요청" : "승인 대기") : "연결됨";
    const disconnectLabel = approved ? "연결 해제" : student ? "거절" : "요청 취소";
    return `<article class="family-link-item"><span class="user-avatar">${escapeHtml(link.counterpartName[0])}</span><div><strong>${escapeHtml(link.counterpartName)}</strong><small>${escapeHtml(link.counterpartLoginId)} · ${link.counterpartRole === "parent" ? "학부모" : "학생"}</small></div><span class="link-status ${link.status}">${statusLabel}</span><div class="link-actions">${student && invited ? `<button class="primary-button" type="button" data-approve-link="${link.id}">승인</button>` : ""}<button class="secondary-button" type="button" data-disconnect-link="${link.id}">${disconnectLabel}</button></div></article>`;
  }).join("") : '<div class="family-empty"><strong>표시할 가족 연결이 없어요.</strong><p>연결 코드를 이용해 첫 가족을 연결해 보세요.</p></div>';
}

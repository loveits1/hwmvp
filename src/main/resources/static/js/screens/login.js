import { requestJson } from "../api.js";
import { $ } from "../utils.js";

export function initializeLoginScreen({ enterDashboard }) {
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
      const user = await requestJson("/api/auth/login", { method: "POST", body: JSON.stringify({ loginId, password }) });
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
}

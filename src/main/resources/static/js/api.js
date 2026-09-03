let csrfHeaderName = "X-CSRF-TOKEN";
let csrfToken = "";

export async function requestJson(url, options = {}) {
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
  const responseText = await response.text();
  let responseBody = null;
  if (responseText) {
    try { responseBody = JSON.parse(responseText); }
    catch { responseBody = responseText; }
  }
  if (!response.ok) {
    const error = new Error(`API request failed: ${response.status}`);
    error.status = response.status;
    error.detail = typeof responseBody === "object" ? responseBody?.detail : null;
    throw error;
  }
  return responseBody;
}

export async function loadCsrfToken() {
  const csrf = await requestJson("/api/auth/csrf");
  csrfHeaderName = csrf.headerName;
  csrfToken = csrf.token;
}

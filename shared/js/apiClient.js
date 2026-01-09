// shared/js/apiClient.js

import { API_CONFIG } from "./config.js";

export async function callApi({ action, payload }) {
  const req = {
    api_key: API_CONFIG.API_KEY,
    action,
    payload
  };

  const form = new URLSearchParams();
  form.set("request", JSON.stringify(req));

  const res = await fetch(API_CONFIG.BASE_URL, {
    method: "POST",
    body: form
    // IMPORTANT: no Content-Type header
    // Browser will set application/x-www-form-urlencoded;charset=UTF-8
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Non-JSON response from API:\n" + text.slice(0, 200));
  }

  if (!data.ok) {
    const err = new Error(data.error || "API error");
    err.api = data;
    throw err;
  }

  return data.data;
}

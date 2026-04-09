// src/api/auth.js

import { apiFetch } from "./client.js";

const DEBUG_AUTH = true;

function logAuthError(context, details) {
    if (!DEBUG_AUTH) return;
    console.error("[auth]", context, details);
}

// Tokens are stored as HttpOnly cookies by the server.
// The browser attaches them automatically when credentials are included.

// Example ping function (if you keep it)
// export async function pingBackend() { ... existing code ... }

/**
 * REGISTER
 * POST /auth/register
 * Body: { email, password, name, birthday, gender }
 * Success: account created (login happens separately)
 */
export async function tryRegister(email, password, name, birthday, gender) {
    const response = await apiFetch("/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name, birthday, gender }),
    }, {
        skipAuthRefresh: true,
    });

    if (!response.ok) {
        let errorMessage = "Registration failed";
        try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                logAuthError("register:response-json", {
                    status: response.status,
                    statusText: response.statusText,
                    errorData,
                });
                errorMessage = errorData.error || errorData.message || "Registration failed";
            } else {
                const text = await response.text();
                logAuthError("register:response-text", {
                    status: response.status,
                    statusText: response.statusText,
                    text,
                });
                if (text) {
                    errorMessage = text;
                }
            }
        } catch {
            logAuthError("register:parse-error", {
                status: response.status,
                statusText: response.statusText,
            });
            // ignore parse error, keep generic
        }
        throw new Error(errorMessage);
    }

    try {
        return await response.json();
    } catch {
        // Some backends return empty body on success; allow that.
        return null;
    }
}

/**
 * LOGIN
 * POST /auth/login
 * Body: { email, password }
 * Success: server sets auth cookies
 */
export async function tryLogin(email, password) {
    const response = await apiFetch("/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    }, {
        skipAuthRefresh: true,
    });

    if (!response.ok) {
        let errorMessage = "Invalid email or password";
        try {
            const text = await response.text();
            let parsed = null;

            if (text) {
                try {
                    parsed = JSON.parse(text);
                } catch {
                    parsed = null;
                }
            }

            if (parsed && typeof parsed === "object") {
                logAuthError("login:response-json", {
                    status: response.status,
                    statusText: response.statusText,
                    errorData: parsed,
                });
                errorMessage = parsed.error || parsed.message || errorMessage;
            } else if (text) {
                logAuthError("login:response-text", {
                    status: response.status,
                    statusText: response.statusText,
                    text,
                });
                errorMessage = text;
            }
        } catch {
            logAuthError("login:parse-error", {
                status: response.status,
                statusText: response.statusText,
            });
            // ignore parse error, keep generic
        }
        throw new Error(errorMessage);
    }

    let result = null;
    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:login"));
    }

    return result;
}

/**
 * OPTIONAL: fetch current user
 * GET /auth/me with cookies
 */
export async function fetchCurrentUser() {
    const response = await apiFetch("/auth/me", {
        method: "GET",
    }, {
        skipAuthRefresh: true,
    });

    if (!response.ok) {
        logAuthError("me:response-error", {
            status: response.status,
            statusText: response.statusText,
        });
        throw new Error(`Failed to load user: ${response.status}`);
    }

    try {
        return await response.json(); // depends on your backend DTO
    } catch {
        logAuthError("me:invalid-json", {
            status: response.status,
            statusText: response.statusText,
        });
        throw new Error("Invalid response from server - expected JSON");
    }
}

/**
 * LOGOUT
 * POST /auth/logout
 * Clears the auth token cookie
 */
export async function logout() {
    try {
        await apiFetch("/auth/logout", {
            method: "POST",
        }, {
            skipAuthRefresh: true,
        });
    } catch (err) {
        logAuthError("logout:error", err);
    } finally {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth:logout"));
        }
    }
}


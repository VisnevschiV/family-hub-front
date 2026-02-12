// src/api/auth.js

// Base URL of your Spring Boot backend.
// If you change ports or host, you only change it here.
const API_BASE_URL = "http://localhost:8080/auth";

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
    const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password, name, birthday, gender }),
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
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
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

    try {
        return await response.json();
    } catch {
        return null;
    }
}

/**
 * OPTIONAL: fetch current user
 * GET /auth/me with cookies
 */
export async function fetchCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/me`, {
        method: "GET",
        credentials: "include",
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
    } catch (err) {
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
        await fetch(`${API_BASE_URL}/logout`, {
            method: "POST",
            credentials: "include",
        });
    } catch (err) {
        logAuthError("logout:error", err);
    }
}


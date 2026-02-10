// src/api/auth.js

// Base URL of your Spring Boot backend.
// If you change ports or host, you only change it here.
const API_BASE_URL = "http://localhost:8080/auth";

// Optional: simple localStorage keys
const TOKEN_KEY = "authToken";
const TOKEN_EXP_KEY = "authTokenExpiresAt";
const REFRESH_TOKEN_KEY = "refreshToken";
const REFRESH_EXP_KEY = "refreshTokenExpiresAt";
const DEBUG_AUTH = true;

function logAuthError(context, details) {
    if (!DEBUG_AUTH) return;
    console.error("[auth]", context, details);
}

export function getStoredToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getTokenExpiry() {
    const value = localStorage.getItem(TOKEN_EXP_KEY);
    return value ? Number(value) : null;
}

export function getRefreshExpiry() {
    const value = localStorage.getItem(REFRESH_EXP_KEY);
    return value ? Number(value) : null;
}

export function clearStoredToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXP_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_EXP_KEY);
}


/**
 * Save token and compute absolute expiry using ttlSeconds.
 */
export function storeToken(token, ttlSeconds, refreshToken, refreshTtlSeconds) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXP_KEY, String(expiresAt));

    if (refreshToken && typeof refreshTtlSeconds === 'number') {
        const refreshExpiresAt = Date.now() + refreshTtlSeconds * 1000;
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        localStorage.setItem(REFRESH_EXP_KEY, String(refreshExpiresAt));
    }
}

/**
 * Helper to build Authorization header for protected calls.
 */
export function getAuthHeader() {
    const token = getStoredToken();
    if (!token) return {};
    return {
        Authorization: `Bearer ${token}`,
    };
}

// Example ping function (if you keep it)
// export async function pingBackend() { ... existing code ... }

/**
 * REGISTER
 * POST /auth/register
 * Body: { email, password, name, birthday, gender }
 * Success: account created (login happens separately)
 */
export async function tryRegister(email, password, name, birthday, gender) {
    console.log("[auth] register body", { email, password, name, birthday, gender });
    const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name, birthday, gender }),
    });

    const text = await response.text();
    console.log("status", response.status);
    console.log("body", text);


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
 * Success: { token, ttlSeconds }
 */
export async function tryLogin(email, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
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

    let data;
    try {
        data = await response.json(); // { token, ttlSeconds }
    } catch (err) {
        logAuthError("login:invalid-json", {
            status: response.status,
            statusText: response.statusText,
        });
        throw new Error("Invalid response from server - expected JSON");
    }

    if (!data.token || typeof data.ttlSeconds !== "number") {
        throw new Error("Invalid login response from server");
    }

    // Persist token + expiry (include refresh token if provided)
    storeToken(data.token, data.ttlSeconds, data.refreshToken, data.refreshTtlSeconds);

    return data;
}

/**
 * OPTIONAL: fetch current user
 * GET /auth/me with Authorization: Bearer <token>
 */
export async function fetchCurrentUser() {
    const headers = {
        ...getAuthHeader(),
    };

    const response = await fetch(`${API_BASE_URL}/me`, {
        method: "GET",
        headers,
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            clearStoredToken();
        }
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



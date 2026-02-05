// src/api/auth.js

// Base URL of your Spring Boot backend.
// If you change ports or host, you only change it here.
const API_BASE_URL = "http://localhost:8080/auth";

// Optional: simple localStorage keys
const TOKEN_KEY = "authToken";
const TOKEN_EXP_KEY = "authTokenExpiresAt";
const REFRESH_TOKEN_KEY = "refreshToken";
const REFRESH_EXP_KEY = "refreshTokenExpiresAt";

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
 * Body: { email, password, name, role }
 * Success: { token, ttlSeconds } (auto-login on registration)
 */
export async function tryRegister(email, password, name, role) {
    const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name, role }),
    });

    if (!response.ok) {
        let errorMessage = "Registration failed";
        try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || "Registration failed";
            } else {
                const text = await response.text();
                if (text) {
                    errorMessage = text;
                }
            }
        } catch {
            // ignore parse error, keep generic
        }
        throw new Error(errorMessage);
    }

    let data;
    try {
        data = await response.json(); // { token, ttlSeconds }
    } catch (err) {
        throw new Error("Invalid response from server - expected JSON");
    }

    if (!data.token || typeof data.ttlSeconds !== "number") {
        throw new Error("Invalid registration response from server");
    }

    // Persist token + expiry (include refresh token if provided)
    storeToken(data.token, data.ttlSeconds, data.refreshToken, data.refreshTtlSeconds);

    return data;
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
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || "Invalid email or password";
            } else {
                const text = await response.text();
                if (text) {
                    errorMessage = text;
                }
            }
        } catch {
            // ignore parse error, keep generic
        }
        throw new Error(errorMessage);
    }

    let data;
    try {
        data = await response.json(); // { token, ttlSeconds }
    } catch (err) {
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
        throw new Error(`Failed to load user: ${response.status}`);
    }

    try {
        return await response.json(); // depends on your backend DTO
    } catch (err) {
        throw new Error("Invalid response from server - expected JSON");
    }
}



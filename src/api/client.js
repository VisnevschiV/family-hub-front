import { API_BASE_URL } from "./config.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let refreshPromise = null;
let authFailureHandled = false;

function normalizePath(path) {
    if (/^https?:\/\//i.test(path)) {
        const url = new URL(path);
        return url.pathname;
    }

    return path.startsWith("/") ? path : `/${path}`;
}

function isAuthPath(path) {
    return path === "/auth" || path.startsWith("/auth/");
}

function mergeHeaders(headers) {
    const merged = new Headers();

    if (headers) {
        new Headers(headers).forEach((value, key) => {
            merged.set(key, value);
        });
    }

    return merged;
}

function readCookie(name) {
    if (typeof document === "undefined") return null;

    const prefix = `${encodeURIComponent(name)}=`;
    const chunks = document.cookie ? document.cookie.split("; ") : [];

    for (const chunk of chunks) {
        if (chunk.startsWith(prefix)) {
            return decodeURIComponent(chunk.slice(prefix.length));
        }
    }

    return null;
}

function shouldAttachCsrf(method, path) {
    return WRITE_METHODS.has(method) && !isAuthPath(path);
}

function handleAuthFailure() {
    if (authFailureHandled) return;
    authFailureHandled = true;

    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:logout"));

        if (window.location.pathname !== "/login") {
            window.location.assign("/login");
        }
    }
}

async function refreshSession() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });

        return response.ok;
    })()
        .catch(() => false)
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

async function performFetch(path, init = {}) {
    const normalizedPath = normalizePath(path);
    const url = /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${normalizedPath}`;

    const method = (init.method || "GET").toUpperCase();
    const headers = mergeHeaders(init.headers);

    if (shouldAttachCsrf(method, normalizedPath)) {
        const csrfToken = readCookie("XSRF-TOKEN");
        if (csrfToken && !headers.has("X-XSRF-TOKEN")) {
            headers.set("X-XSRF-TOKEN", csrfToken);
        }
    }

    return fetch(url, {
        ...init,
        method,
        headers,
        credentials: "include",
    });
}

export async function apiFetch(path, init = {}, options = {}) {
    const normalizedPath = normalizePath(path);
    const skipAuthRefresh = Boolean(options.skipAuthRefresh);
    const retried = Boolean(options.retried);

    const response = await performFetch(path, init);

    if (response.status !== 401) {
        return response;
    }

    if (skipAuthRefresh || retried || isAuthPath(normalizedPath)) {
        return response;
    }

    const refreshed = await refreshSession();
    if (!refreshed) {
        handleAuthFailure();
        return response;
    }

    return performFetch(path, init);
}

export function buildApiUrl(path) {
    return `${API_BASE_URL}${normalizePath(path)}`;
}
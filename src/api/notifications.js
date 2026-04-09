import { apiFetch, buildApiUrl } from "./client.js";

const NOTIFICATIONS_SSE_URL =
    import.meta.env.VITE_NOTIFICATIONS_SSE_URL || buildApiUrl("/notifications/stream");

const SSE_RECONNECT_DELAY_MS = 2500;

async function extractErrorMessage(response, fallback) {
    let errorMessage = fallback;

    try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            errorMessage = data.error || data.message || errorMessage;
        } else {
            const text = await response.text();
            if (text) errorMessage = text;
        }
    } catch {
        // Ignore parse errors and keep fallback.
    }

    return errorMessage;
}

export async function getNotifications({ page = 0, size = 20 } = {}) {
    const query = new URLSearchParams({
        page: String(page),
        size: String(size),
    });

    const response = await apiFetch(`/notifications?${query.toString()}`, {
        method: "GET",
    });

    if (!response.ok) {
        const errorMessage = await extractErrorMessage(
            response,
            `Failed to load notifications: ${response.status}`
        );
        throw new Error(errorMessage);
    }

    try {
        const data = await response.json();
        return {
            items: Array.isArray(data?.items) ? data.items : [],
            page: Number.isInteger(data?.page) ? data.page : page,
            size: Number.isInteger(data?.size) ? data.size : size,
            totalElements: Number.isFinite(data?.totalElements) ? data.totalElements : 0,
            totalPages: Number.isInteger(data?.totalPages) ? data.totalPages : 0,
            hasNext: Boolean(data?.hasNext),
        };
    } catch {
        return {
            items: [],
            page,
            size,
            totalElements: 0,
            totalPages: 0,
            hasNext: false,
        };
    }
}

export async function markNotificationAsRead(notificationId) {
    const response = await apiFetch(
        `/notifications/${encodeURIComponent(notificationId)}/read`,
        {
            method: "PATCH",
        }
    );

    if (!response.ok) {
        const errorMessage = await extractErrorMessage(
            response,
            `Failed to mark notification as read: ${response.status}`
        );
        throw new Error(errorMessage);
    }
}

export function createNotificationsSseClient({
    onNotification,
    onPing,
    onOpen,
    onError,
} = {}) {
    let stream = null;
    let reconnectTimer = null;
    let stopped = false;

    function clearReconnectTimer() {
        if (reconnectTimer !== null) {
            window.clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    }

    function closeCurrentStream() {
        if (!stream) return;
        stream.close();
        stream = null;
    }

    function connect() {
        if (stopped) return;

        clearReconnectTimer();
        closeCurrentStream();

        stream = new EventSource(NOTIFICATIONS_SSE_URL, { withCredentials: true });

        stream.onopen = () => {
            console.info("Connected to SSE");
            if (typeof onOpen === "function") onOpen();
        };

        stream.addEventListener("ping", () => {
            console.info("Received ping");
            if (typeof onPing === "function") onPing();
        });

        stream.addEventListener("notification", (event) => {
            let payload = null;

            try {
                payload = event?.data ? JSON.parse(event.data) : null;
            } catch {
                payload = null;
            }

            const mapped = mapIncomingNotificationPayload(payload);
            console.info("Received notification with id and message", {
                id: mapped.id,
                message: mapped.message,
            });

            if (typeof onNotification === "function") {
                onNotification(mapped);
            }
        });

        stream.onerror = (error) => {
            console.warn("Stream error/reconnect", error);
            if (typeof onError === "function") onError(error);

            closeCurrentStream();

            if (stopped) return;

            reconnectTimer = window.setTimeout(() => {
                connect();
            }, SSE_RECONNECT_DELAY_MS);
        };
    }

    function start() {
        stopped = false;
        connect();
    }

    function stop() {
        stopped = true;
        clearReconnectTimer();
        closeCurrentStream();
    }

    return {
        start,
        stop,
    };
}

export function mapIncomingNotificationPayload(payload) {
    if (!payload || typeof payload !== "object") {
        return {
            id: null,
            title: "Notification",
            message: "You have a new update.",
            createdAt: null,
            read: false,
        };
    }

    return {
        id: payload.id || payload.notificationId || payload.uuid || null,
        title: payload.title || payload.name || payload.type || "Notification",
        message: payload.message || payload.content || payload.description || "You have a new update.",
        createdAt: payload.createdAt || payload.time || payload.timestamp || payload.date || null,
        read: typeof payload.read === "boolean" ? payload.read : false,
    };
}

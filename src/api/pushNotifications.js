import { apiFetch } from "./client.js";

const PUSH_SUBSCRIPTIONS_PATH =
    import.meta.env.VITE_PUSH_SUBSCRIPTIONS_PATH || "/push/subscriptions";
const WEB_PUSH_PUBLIC_KEY =
    import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY ||
    import.meta.env.VAPID_PUBLIC_KEY ||
    "";

function isBrowserSupported() {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}

function ensureConfigured() {
    if (!WEB_PUSH_PUBLIC_KEY) {
        throw new Error("Push notifications are not configured yet.");
    }
}

function urlBase64ToUint8Array(value) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    const output = new Uint8Array(raw.length);

    for (let index = 0; index < raw.length; index += 1) {
        output[index] = raw.charCodeAt(index);
    }

    return output;
}

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
        return errorMessage;
    }

    return errorMessage;
}

async function ensureServiceWorkerRegistration() {
    const existingRegistration = await navigator.serviceWorker.getRegistration();
    if (existingRegistration) return existingRegistration;

    return navigator.serviceWorker.register("/sw.js");
}

async function saveSubscription(subscription) {
    const response = await apiFetch(PUSH_SUBSCRIPTIONS_PATH, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
    });

    if (!response.ok) {
        throw new Error(
            await extractErrorMessage(response, "Failed to save push subscription.")
        );
    }
}

async function deleteSubscription(subscription) {
    const response = await apiFetch(PUSH_SUBSCRIPTIONS_PATH, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint: subscription?.endpoint || null }),
    });

    if (!response.ok && response.status !== 404) {
        throw new Error(
            await extractErrorMessage(response, "Failed to remove push subscription.")
        );
    }
}

export async function getPushSubscriptionState() {
    if (!isBrowserSupported()) {
        return {
            supported: false,
            configured: Boolean(WEB_PUSH_PUBLIC_KEY),
            permission: "unsupported",
            subscribed: false,
        };
    }

    const registration = await ensureServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();

    return {
        supported: true,
        configured: Boolean(WEB_PUSH_PUBLIC_KEY),
        permission: Notification.permission,
        subscribed: Boolean(subscription),
    };
}

export async function subscribeToPushNotifications() {
    if (!isBrowserSupported()) {
        throw new Error("This browser does not support push notifications.");
    }

    ensureConfigured();

    const registration = await ensureServiceWorkerRegistration();

    let permission = Notification.permission;
    if (permission === "default") {
        permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
    }

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
        await saveSubscription(existingSubscription.toJSON());
        return {
            permission,
            subscribed: true,
        };
    }

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(WEB_PUSH_PUBLIC_KEY),
    });

    await saveSubscription(subscription.toJSON());

    return {
        permission,
        subscribed: true,
    };
}

export async function unsubscribeFromPushNotifications() {
    if (!isBrowserSupported()) {
        return {
            permission: "unsupported",
            subscribed: false,
        };
    }

    const registration = await ensureServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
        return {
            permission: Notification.permission,
            subscribed: false,
        };
    }

    await deleteSubscription(subscription.toJSON());
    await subscription.unsubscribe();

    return {
        permission: Notification.permission,
        subscribed: false,
    };
}
import { useEffect, useState } from "react";
import {
    getNotifications,
    mapIncomingNotificationPayload,
    markNotificationAsRead,
} from "../../api/notifications.js";
import "./NotificationsPage.css";

function resolveNotificationId(item) {
    return (
        item.id ||
        item.ID ||
        item.notificationId ||
        item.notificationID ||
        item.uuid ||
        null
    );
}

function resolveNotificationRead(item) {
    if (typeof item.read === "boolean") return item.read;
    if (typeof item.isRead === "boolean") return item.isRead;
    if (typeof item.unread === "boolean") return !item.unread;
    return false;
}

function resolveNotificationTitle(item) {
    if (item.title) return item.title;
    if (item.type) return item.type;

    const message = resolveNotificationMessage(item);
    if (!message) return "Notification";

    return message.length > 42 ? `${message.slice(0, 42)}...` : message;
}

function createClientNotificationId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `temp-${crypto.randomUUID()}`;
    }

    return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveNotificationMessage(item) {
    return (
        item.message ||
        item.content ||
        item.description ||
        "No details provided."
    );
}

function resolveNotificationTime(item) {
    return (
        item.createdAt ||
        item.time ||
        item.timestamp ||
        item.date ||
        null
    );
}

function mapNotificationItem(item) {
    const id = resolveNotificationId(item);
    const backendId = id ? String(id) : null;
    const createdAt = resolveNotificationTime(item);
    const parsedDate = createdAt ? new Date(createdAt) : null;

    return {
        id: backendId || createClientNotificationId(),
        backendId,
        title: resolveNotificationTitle(item),
        message: resolveNotificationMessage(item),
        isRead: resolveNotificationRead(item),
        createdAtLabel:
            parsedDate && !Number.isNaN(parsedDate.getTime())
                ? parsedDate.toLocaleString()
                : "Unknown time",
    };
}

export default function NotificationsPage() {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [size] = useState(20);
    const [totalElements, setTotalElements] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");
    const [markingId, setMarkingId] = useState(null);

    async function loadNotifications(nextPage, append) {
        const response = await getNotifications({ page: nextPage, size });
        const mappedItems = response.items.map(mapNotificationItem);

        setItems((prev) => (append ? [...prev, ...mappedItems] : mappedItems));
        setPage(response.page);
        setHasNext(response.hasNext);
        setTotalElements(response.totalElements || 0);
    }

    useEffect(() => {
        let active = true;

        setLoading(true);
        setError("");

        loadNotifications(0, false)
            .catch((err) => {
                if (!active) return;
                setError(err.message || "Failed to load notifications");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        function handleIncomingNotification(event) {
            const incomingRaw = event?.detail;
            const normalized = mapIncomingNotificationPayload(incomingRaw);
            const incomingItem = mapNotificationItem({
                ...incomingRaw,
                ...normalized,
                read: typeof normalized.read === "boolean" ? normalized.read : false,
                createdAt: normalized.createdAt || new Date().toISOString(),
            });

            let wasInserted = false;

            setItems((prev) => {
                if (
                    incomingItem.backendId &&
                    prev.some((item) => item.backendId && item.backendId === incomingItem.backendId)
                ) {
                    return prev;
                }

                wasInserted = true;
                return [incomingItem, ...prev];
            });

            if (wasInserted) {
                setTotalElements((current) => current + 1);
            }
        }

        window.addEventListener("notifications:incoming", handleIncomingNotification);

        return () => {
            window.removeEventListener("notifications:incoming", handleIncomingNotification);
        };
    }, []);

    useEffect(() => {
        function handleNotificationsClear() {
            setItems([]);
            setPage(0);
            setHasNext(false);
            setTotalElements(0);
            setLoading(false);
            setLoadingMore(false);
            setError("");
            setMarkingId(null);
        }

        window.addEventListener("notifications:clear", handleNotificationsClear);

        return () => {
            window.removeEventListener("notifications:clear", handleNotificationsClear);
        };
    }, []);

    async function handleLoadMore() {
        if (!hasNext || loadingMore) return;

        setLoadingMore(true);
        setError("");

        try {
            await loadNotifications(page + 1, true);
        } catch (err) {
            setError(err.message || "Failed to load more notifications");
        } finally {
            setLoadingMore(false);
        }
    }

    async function handleNotificationClick(notification) {
        if (!notification?.backendId || notification.isRead || markingId === notification.id) return;

        setMarkingId(notification.id);
        setError("");

        try {
            await markNotificationAsRead(notification.backendId);
            setItems((prev) =>
                prev.map((item) =>
                    item.id === notification.id ? { ...item, isRead: true } : item
                )
            );
            window.dispatchEvent(new Event("notifications:changed"));
        } catch (err) {
            setError(err.message || "Failed to mark notification as read");
        } finally {
            setMarkingId(null);
        }
    }

    return (
        <div className="page notificationsPage">
            <header className="page__header">
                <h1 className="page__title">Notifications</h1>
                <p className="page__subtitle">
                    Stay up to date with family activity and reminders.
                </p>
            </header>

            {error && <p className="notificationsPage__error">{error}</p>}

            <section className="notificationsPage__list" aria-live="polite">
                {loading && <p className="notificationsPage__empty">Loading notifications...</p>}

                {!loading && items.length === 0 && (
                    <p className="notificationsPage__empty">You have no notifications yet.</p>
                )}

                {!loading &&
                    items.map((notification) => (
                        <button
                            type="button"
                            key={notification.id}
                            className={`notificationsPage__item ${notification.isRead ? "notificationsPage__item--read" : ""
                                }`}
                            onClick={() => handleNotificationClick(notification)}
                            disabled={markingId === notification.id}
                        >
                            <div className="notificationsPage__itemHeader">
                                <h2 className="notificationsPage__itemTitle">{notification.title}</h2>
                                {!notification.isRead && <span className="notificationsPage__pill">Unread</span>}
                            </div>
                            <p className="notificationsPage__itemMessage">{notification.message}</p>
                            <p className="notificationsPage__itemTime">{notification.createdAtLabel}</p>
                        </button>
                    ))}
            </section>

            {!loading && hasNext && (
                <div className="notificationsPage__actions">
                    <button
                        type="button"
                        className="notificationsPage__loadMore"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? "Loading..." : "Load more"}
                    </button>
                </div>
            )}

            {!loading && items.length > 0 && (
                <p className="notificationsPage__meta">
                    Showing {items.length} of {totalElements} notifications.
                </p>
            )}
        </div>
    );
}

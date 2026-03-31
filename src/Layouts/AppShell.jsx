import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { fetchCurrentPersona } from "../api/persona.js";
import { logout } from "../api/auth.js";
import {
    createNotificationsSseClient,
    getNotifications,
    mapIncomingNotificationPayload,
} from "../api/notifications.js";
import "./AppShell.css";

function AppShell() {
    const navigate = useNavigate();
    const [persona, setPersona] = useState(null);
    const [personaLoading, setPersonaLoading] = useState(true);
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
    const [notificationToasts, setNotificationToasts] = useState([]);
    const toastTimersRef = useRef(new Map());
    const sseClientRef = useRef(null);

    useEffect(() => {
        let active = true;

        fetchCurrentPersona()
            .then((data) => {
                if (active) setPersona(data);
            })
            .catch(() => { })
            .finally(() => {
                if (active) setPersonaLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        async function refreshUnreadState() {
            try {
                const data = await getNotifications({ page: 0, size: 50 });
                if (!active) return;

                const hasUnread = Array.isArray(data?.items)
                    ? data.items.some((item) => item && (item.read === false || item.isRead === false))
                    : false;

                setHasUnreadNotifications(hasUnread);
            } catch {
                if (active) setHasUnreadNotifications(false);
            }
        }

        refreshUnreadState();

        function handleNotificationsChanged() {
            refreshUnreadState();
        }

        window.addEventListener("notifications:changed", handleNotificationsChanged);

        return () => {
            active = false;
            window.removeEventListener("notifications:changed", handleNotificationsChanged);
        };
    }, []);

    function dismissToast(toastId) {
        const timeoutId = toastTimersRef.current.get(toastId);
        if (timeoutId) {
            window.clearTimeout(timeoutId);
            toastTimersRef.current.delete(toastId);
        }

        setNotificationToasts((current) => current.filter((toast) => toast.id !== toastId));
    }

    function showIncomingToast(payload) {
        const mappedPayload = mapIncomingNotificationPayload(payload);
        const toastId =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        setNotificationToasts((current) => {
            const next = [...current, { ...mappedPayload, id: toastId }];
            return next.slice(-3);
        });

        const timeoutId = window.setTimeout(() => {
            dismissToast(toastId);
        }, 4000);

        toastTimersRef.current.set(toastId, timeoutId);
    }

    useEffect(() => {
        function handleIncomingNotification(event) {
            showIncomingToast(event?.detail || null);
            setHasUnreadNotifications(true);
            window.dispatchEvent(new Event("notifications:changed"));
        }

        function handleNotificationsClear() {
            setHasUnreadNotifications(false);
            setNotificationToasts([]);

            toastTimersRef.current.forEach((timeoutId) => {
                window.clearTimeout(timeoutId);
            });
            toastTimersRef.current.clear();
        }

        window.addEventListener("notifications:incoming", handleIncomingNotification);
        window.addEventListener("notifications:clear", handleNotificationsClear);

        return () => {
            window.removeEventListener("notifications:incoming", handleIncomingNotification);
            window.removeEventListener("notifications:clear", handleNotificationsClear);
        };
    }, []);

    useEffect(() => {
        function stopSseAndClear() {
            if (sseClientRef.current) {
                sseClientRef.current.stop();
            }
            sseClientRef.current = null;
            window.dispatchEvent(new Event("notifications:clear"));
        }

        function startFreshSse() {
            if (sseClientRef.current) {
                sseClientRef.current.stop();
                sseClientRef.current = null;
            }

            const client = createNotificationsSseClient({
                onNotification: (payload) => {
                    window.dispatchEvent(
                        new CustomEvent("notifications:incoming", {
                            detail: payload,
                        })
                    );
                },
            });

            sseClientRef.current = client;
            client.start();
        }

        startFreshSse();

        function handleAuthLogout() {
            stopSseAndClear();
        }

        function handleAuthLogin() {
            startFreshSse();
        }

        window.addEventListener("auth:logout", handleAuthLogout);
        window.addEventListener("auth:login", handleAuthLogin);

        return () => {
            window.removeEventListener("auth:logout", handleAuthLogout);
            window.removeEventListener("auth:login", handleAuthLogin);

            if (sseClientRef.current) {
                sseClientRef.current.stop();
                sseClientRef.current = null;
            }

            toastTimersRef.current.forEach((timeoutId) => {
                window.clearTimeout(timeoutId);
            });
            toastTimersRef.current.clear();
        };
    }, []);

    const displayName = personaLoading
        ? "Loading..."
        : persona?.family?.name
            ? `${persona?.name || "Family Member"} ${persona.family.name}`
            : persona?.name || "Family Member";

    const initials = useMemo(() => {
        if (!persona?.name) return "FH";
        const parts = persona.name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "FH";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }, [persona]);

    async function handleLogout() {
        await logout();
        navigate("/welcome", { replace: true });
    }

    return (
        <div className="appShell">
            <aside className="appShell__sidebar">
                <NavLink to="/app" end className="appShell__brand">
                    <div className="appShell__logo">FH</div>
                    <div>
                        <div className="appShell__title">Family Hub</div>
                        <div className="appShell__subtitle">Shared life, organized</div>
                    </div>
                </NavLink>

                <nav className="appShell__nav">
                    <div className="appShell__navSection">
                        <div className="appShell__navLabel">Family</div>
                        <NavLink to="/app/family/todo" className="appShell__navLink">
                            To-Do's
                        </NavLink>
                        <NavLink to="/app/family/calendar" className="appShell__navLink">
                            Our Calendar
                        </NavLink>
                        <NavLink to="/app/notifications" className="appShell__navLink appShell__navLink--withIndicator">
                            Notifications
                            {hasUnreadNotifications && <span className="appShell__unreadDot" aria-label="Unread notifications" />}
                        </NavLink>
                    </div>
                </nav>

                <NavLink to="/app/profile" className="appShell__userLink">
                    <div className="appShell__avatar">
                        {persona?.avatarUrl ? (
                            <img
                                src={persona.avatarUrl}
                                alt={displayName}
                                className="appShell__avatarImage"
                            />
                        ) : (
                            initials
                        )}
                    </div>
                    <div>
                        <div className="appShell__userName">{displayName}</div>
                        <div className="appShell__userMeta">Account</div>
                    </div>
                </NavLink>

                <button
                    type="button"
                    className="appShell__logoutButton"
                    onClick={handleLogout}
                >
                    Log out
                </button>
            </aside>

            <div className="appShell__main">
                <header className="appShell__topbar">
                    <div>
                        <div className="appShell__pageTitle">Welcome back</div>
                        <div className="appShell__pageSubtitle">
                            Pick up where your family left off.
                        </div>
                    </div>
                </header>

                <main className="appShell__content">
                    <Outlet />
                </main>
            </div>

            {notificationToasts.length > 0 && (
                <div className="appShell__toastStack" aria-live="polite" aria-atomic="true">
                    {notificationToasts.map((toast) => (
                        <button
                            key={toast.id}
                            type="button"
                            className="appShell__toast"
                            onClick={() => {
                                dismissToast(toast.id);
                                navigate("/app/notifications");
                            }}
                        >
                            <div className="appShell__toastTitle">{toast.title}</div>
                            <div className="appShell__toastMessage">{toast.message}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AppShell;

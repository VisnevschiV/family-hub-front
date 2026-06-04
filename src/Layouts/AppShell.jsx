import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { fetchCurrentPersona } from "../api/persona.js";
import {
    createNotificationsSseClient,
    getNotifications,
    mapIncomingNotificationPayload,
} from "../api/notifications.js";
import "./AppShell/appShell.css";
import "./AppShell/appShelldesktop.css";
import "./AppShell/appShellmobile.css";

function AppShell() {
    const navigate = useNavigate();
    const location = useLocation();
    const [persona, setPersona] = useState(null);
    const [personaLoading, setPersonaLoading] = useState(true);
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
    const [notificationToasts, setNotificationToasts] = useState([]);
    const [isMobileTopbarMinimized, setIsMobileTopbarMinimized] = useState(false);
    const toastTimersRef = useRef(new Map());
    const sseClientRef = useRef(null);
    const topbarTimerRef = useRef(null);
    const lastScrollYRef = useRef(0);

    const isProfilePage = location.pathname === "/app/profile";

    function clearTopbarTimer() {
        if (topbarTimerRef.current) {
            window.clearTimeout(topbarTimerRef.current);
            topbarTimerRef.current = null;
        }
    }

    function scheduleTopbarAutoMinimize(duration = 2200) {
        clearTopbarTimer();
        if (isProfilePage) return;

        topbarTimerRef.current = window.setTimeout(() => {
            setIsMobileTopbarMinimized(true);
            topbarTimerRef.current = null;
        }, duration);
    }

    function revealTopbarTemporarily(duration = 2600) {
        setIsMobileTopbarMinimized(false);
        scheduleTopbarAutoMinimize(duration);
    }

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
            revealTopbarTemporarily();
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
        const mobileMedia = window.matchMedia("(max-width: 900px), (max-width: 1024px) and (hover: none) and (pointer: coarse)");

        const handleScroll = () => {
            if (!mobileMedia.matches) {
                setIsMobileTopbarMinimized(false);
                lastScrollYRef.current = window.scrollY;
                clearTopbarTimer();
                return;
            }

            if (isProfilePage) {
                setIsMobileTopbarMinimized(false);
                lastScrollYRef.current = window.scrollY;
                clearTopbarTimer();
                return;
            }

            const currentY = window.scrollY;
            const delta = currentY - lastScrollYRef.current;

            if (delta > 6) {
                setIsMobileTopbarMinimized(true);
                clearTopbarTimer();
            } else if (delta < -4) {
                setIsMobileTopbarMinimized(false);
                scheduleTopbarAutoMinimize();
            }

            lastScrollYRef.current = currentY;
        };

        const handleMediaChange = () => {
            if (!mobileMedia.matches) {
                setIsMobileTopbarMinimized(false);
                clearTopbarTimer();
            }
        };

        lastScrollYRef.current = window.scrollY;
        window.addEventListener("scroll", handleScroll, { passive: true });
        mobileMedia.addEventListener("change", handleMediaChange);

        handleScroll();
        if (mobileMedia.matches && !isProfilePage) {
            scheduleTopbarAutoMinimize();
        }

        return () => {
            window.removeEventListener("scroll", handleScroll);
            mobileMedia.removeEventListener("change", handleMediaChange);
            clearTopbarTimer();
        };
    }, [isProfilePage]);

    useEffect(() => {
        if (isProfilePage) {
            setIsMobileTopbarMinimized(false);
            clearTopbarTimer();
        }
    }, [isProfilePage]);

    useEffect(() => {
        return () => {
            clearTopbarTimer();
        };
    }, []);

    const sidebarClassName = [
        "appShell__sidebar",
        isMobileTopbarMinimized ? "appShell__sidebar--minimized" : "",
        isProfilePage ? "appShell__sidebar--pinned" : "",
    ]
        .filter(Boolean)
        .join(" ");

    const mainClassName = [
        "appShell__main",
        isMobileTopbarMinimized ? "appShell__main--topbarMinimized" : "",
    ]
        .filter(Boolean)
        .join(" ");

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
        if (!persona?.name) return "HW";
        const parts = persona.name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "HW";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }, [persona]);

    return (
        <div className="appShell">
            <aside className={sidebarClassName}>
                <NavLink to="/app" end className="appShell__brand">
                    <div className="appShell__logo">
                        <img src="/logo.png" alt="happywifehappylife logo" className="appShell__logoImage" />
                    </div>
                    <div>
                        <div className="appShell__title">happywifehappylife</div>
                        <div className="appShell__subtitle">Shared life, organized</div>
                    </div>
                </NavLink>

                <nav className="appShell__nav">
                    <div className="appShell__navSection">
                        <div className="appShell__navLabel">Family</div>
                        <NavLink to="/app/family/todo" className="appShell__navLink">
                            Priorities
                        </NavLink>
                        <NavLink to="/app/family/calendar" className="appShell__navLink">
                            Our Calendar
                        </NavLink>
                        <NavLink to="/app/family/budget" className="appShell__navLink">
                            Budget & Savings
                        </NavLink>
                    </div>
                </nav>

                {/* Bottom nav — rendered here so it's inside the sidebar on desktop (ignored), shown as fixed bar on mobile via CSS */}
                <nav className="appShell__bottomNav" aria-label="Main navigation">
                    <NavLink to="/app" end className="appShell__bottomNavLink" aria-label="Home">
                        <svg className="appShell__bottomNavIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                        </svg>
                        <span className="appShell__bottomNavLabel">Home</span>
                    </NavLink>

                    <NavLink to="/app/family/todo" className="appShell__bottomNavLink" aria-label="Priorities">
                        <svg className="appShell__bottomNavIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M6 2v20H4V2h2zm2 2h10l-2 4 2 4H8V4z" />
                        </svg>
                        <span className="appShell__bottomNavLabel">Priorities</span>
                    </NavLink>

                    <NavLink to="/app/family/calendar" className="appShell__bottomNavLink" aria-label="Family calendar">
                        <svg className="appShell__bottomNavIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M20 3h-1V1h-2v2H7V1H5v2H4C2.9 3 2 3.9 2 5v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13zM8 10h4v4H8z" />
                        </svg>
                        <span className="appShell__bottomNavLabel">Calendar</span>
                    </NavLink>

                    <NavLink to="/app/family/budget" className="appShell__bottomNavLink" aria-label="Budget">
                        <svg className="appShell__bottomNavIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                        </svg>
                        <span className="appShell__bottomNavLabel">Budget</span>
                    </NavLink>

                    <NavLink to="/app/profile" className="appShell__bottomNavLink" aria-label="Profile">
                        <div className="appShell__bottomNavAvatar">
                            {persona?.avatarUrl ? (
                                <img src={persona.avatarUrl} alt={displayName} className="appShell__avatarImage" />
                            ) : (
                                <svg className="appShell__bottomNavIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            )}
                        </div>
                        <span className="appShell__bottomNavLabel">Profile</span>
                    </NavLink>
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
            </aside>

            <div className={mainClassName}>
                <NavLink
                    to="/app/notifications"
                    className={({ isActive }) =>
                        [
                            "appShell__notificationsShortcut",
                            isActive ? "appShell__notificationsShortcut--active" : "",
                            isMobileTopbarMinimized ? "appShell__notificationsShortcut--topbarMinimized" : "",
                            isProfilePage ? "appShell__notificationsShortcut--pinned" : "",
                        ]
                            .filter(Boolean)
                            .join(" ")
                    }
                    aria-label="Notifications"
                    title="Notifications"
                >
                    <span className="appShell__notificationsShortcutIconWrap">
                        <svg className="appShell__notificationsShortcutIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                        </svg>
                        {hasUnreadNotifications && (
                            <span className="appShell__notificationsShortcutDot" aria-label="Unread notifications" />
                        )}
                    </span>
                </NavLink>

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

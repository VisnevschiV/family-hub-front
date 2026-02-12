import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { fetchCurrentPersona } from "../api/persona.js";
import "./AppShell.css";

function AppShell() {
    const [persona, setPersona] = useState(null);
    const [personaLoading, setPersonaLoading] = useState(true);

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

    const displayName = personaLoading
        ? "Loading..."
        : persona?.name || "Family Member";

    const initials = useMemo(() => {
        if (!persona?.name) return "FH";
        const parts = persona.name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "FH";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }, [persona]);

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
        </div>
    );
}

export default AppShell;

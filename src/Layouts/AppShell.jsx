import { NavLink, Outlet } from "react-router-dom";
import "./AppShell.css";

function AppShell() {
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
                            Shared To-Do
                        </NavLink>
                        <NavLink to="/app/family/calendar" className="appShell__navLink">
                            Shared Calendar
                        </NavLink>
                    </div>
                </nav>

                <NavLink to="/app/profile" className="appShell__userLink">
                    <div className="appShell__avatar">JD</div>
                    <div>
                        <div className="appShell__userName">John Doe</div>
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

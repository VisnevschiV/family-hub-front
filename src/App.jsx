import "./App/app.css";
import "./App/appdesktop.css";
import "./App/appmobile.css";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./Pages/Public/LoginPage.jsx";
import WelcomePage from "./Pages/Public/WelcomePage.jsx";
import TodoListsPage from "./Pages/Private/TodoListsPage.jsx";
import AppShell from "./Layouts/AppShell.jsx";
import ProfileSettingsPage from "./Pages/Private/ProfileSettingsPage.jsx";
import FamilyHubPage from "./Pages/Private/FamilyHubPage.jsx";
import FamilyCalendarPage from "./Pages/Private/FamilyCalendarPage.jsx";
import NotificationsPage from "./Pages/Private/NotificationsPage.jsx";
import BudgetPage from "./Pages/Private/BudgetPage.jsx";
import { fetchCurrentPersona } from "./api/persona.js";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        // Check if user is authenticated by trying to fetch their persona
        const checkAuth = async () => {
            try {
                await fetchCurrentPersona();
                setIsAuthenticated(true);
            } catch {
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, []);

    useEffect(() => {
        function handleAuthLogin() {
            setIsAuthenticated(true);
        }

        function handleAuthLogout() {
            setIsAuthenticated(false);
        }

        window.addEventListener("auth:login", handleAuthLogin);
        window.addEventListener("auth:logout", handleAuthLogout);

        return () => {
            window.removeEventListener("auth:login", handleAuthLogin);
            window.removeEventListener("auth:logout", handleAuthLogout);
        };
    }, []);

    if (isAuthenticated === null) {
        // Loading
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/register"
                    element={<LoginPage initialMode="register" />}
                />

                <Route path="/" element={<Navigate to={isAuthenticated ? "/app" : "/welcome"} replace />} />

                <Route path="/app" element={<AppShell />}>
                    <Route index element={<FamilyHubPage />} />
                    <Route path="dashboard" element={<Navigate to="/app" replace />} />
                    <Route path="profile" element={<ProfileSettingsPage />} />
                    <Route path="family" element={<FamilyHubPage />} />
                    <Route path="family/todo" element={<TodoListsPage />} />
                    <Route path="family/calendar" element={<FamilyCalendarPage />} />
                    <Route path="family/budget" element={<BudgetPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="todos" element={<TodoListsPage />} />
                </Route>

                {/* default */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App
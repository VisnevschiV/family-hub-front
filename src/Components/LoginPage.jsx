import { useState } from "react";

function LoginPage() {
    // "mode" decides whether we're in login or register mode
    const [mode, setMode] = useState("login"); // "login" | "register"

    // Form fields (controlled inputs)
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Register-only extra fields (you can add more later)
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI feedback
    const [formError, setFormError] = useState(null);
    const [formMessage, setFormMessage] = useState(null);

    function resetMessages() {
        setFormError(null);
        setFormMessage(null);
    }

    function validateForm() {
        resetMessages();

        if (!email.trim()) {
            setFormError("Email is required.");
            return false;
        }
        if (!password.trim()) {
            setFormError("Password is required.");
            return false;
        }

        if (mode === "register") {
            if (!confirmPassword.trim()) {
                setFormError("Please confirm your password.");
                return false;
            }
            if (password !== confirmPassword) {
                setFormError("Passwords do not match.");
                return false;
            }
        }

        return true;
    }

    async function handleSubmit(event) {
        event.preventDefault(); // stop browser from reloading page

        if (!validateForm()) {
            return;
        }

        try {
            const response = await fetch("http://localhost:8080/");
            const text = await response.text();
            setFormMessage("Backend says:"+ text);
        } catch (err) {
            setFormError("Error calling backend:"+ err);
        }

    }

    const isLogin = mode === "login";

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Family Hub</h1>
                    <p>{isLogin ? "Sign in to continue" : "Create your account"}</p>
                </div>

                <div className="auth-toggle">
                    <button
                        type="button"
                        className={isLogin ? "active" : ""}
                        onClick={() => {
                            setMode("login");
                            resetMessages();
                        }}
                    >
                        Log in
                    </button>
                    <button
                        type="button"
                        className={!isLogin ? "active" : ""}
                        onClick={() => {
                            setMode("register");
                            resetMessages();
                        }}
                    >
                        Register
                    </button>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label className="auth-field">
                        <span>Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                        />
                    </label>

                    <label className="auth-field">
                        <span>Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="••••••••"
                        />
                    </label>

                    {!isLogin && (
                        <label className="auth-field">
                            <span>Confirm password</span>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                placeholder="••••••••"
                            />
                        </label>
                    )}

                    {formError && <p className="auth-error">{formError}</p>}
                    {formMessage && <p className="auth-message">{formMessage}</p>}

                    <button className="auth-submit" type="submit">
                        {isLogin ? "Log in" : "Register"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
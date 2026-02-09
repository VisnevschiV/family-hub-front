import { useState } from "react";
import { tryLogin, tryRegister } from "../api/auth.js";
import "./LoginForm.css";

function LoginForm({ onLoginSuccess }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("USER");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isRegister, setIsRegister] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        // Validate for register mode
        if (isRegister) {
            if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
            }
            if (!name.trim()) {
                setError("Name is required");
                return;
            }
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);

        try {
            if (isRegister) {
                await tryRegister(email, password, name, role);
            } else {
                await tryLogin(email, password);
            }
            // Token + expiry are stored in tryLogin() or tryRegister()
            onLoginSuccess();
        } catch (err) {
            console.error(err);
            setError(err.message || (isRegister ? "Registration failed" : "Invalid email or password"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="loginForm__container">
            <form onSubmit={handleSubmit} className="loginForm__panel">
                <h2 className="loginForm__title">
                    {isRegister ? "Create Account" : "Welcome Back"}
                </h2>

                {isRegister && (
                    <div className="loginForm__fieldGroup">
                        <label className="loginForm__label">
                            <span className="loginForm__labelText">Full Name</span>
                            <input
                                type="text"
                                className="loginForm__input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your full name"
                                required
                                disabled={loading}
                            />
                        </label>
                    </div>
                )}

                <div className="loginForm__fieldGroup">
                    <label className="loginForm__label">
                        <span className="loginForm__labelText">Email</span>
                        <input
                            type="email"
                            className="loginForm__input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                            autoComplete="email"
                            disabled={loading}
                        />
                    </label>
                </div>

                <div className="loginForm__fieldGroup">
                    <label className="loginForm__label">
                        <span className="loginForm__labelText">Password</span>
                        <input
                            type="password"
                            className="loginForm__input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            autoComplete={isRegister ? "new-password" : "current-password"}
                            disabled={loading}
                        />
                    </label>
                </div>

                {isRegister && (
                    <>
                        <div className="loginForm__fieldGroup">
                            <label className="loginForm__label">
                                <span className="loginForm__labelText">Confirm Password</span>
                                <input
                                    type="password"
                                    className="loginForm__input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    required
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                            </label>
                        </div>

                        <div className="loginForm__fieldGroup">
                            <label className="loginForm__label">
                                <span className="loginForm__labelText">Role</span>
                                <select
                                    className="loginForm__input"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    required
                                    disabled={loading}
                                >
                                    <option value="USER">User</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </label>
                        </div>
                    </>
                )}

                {error && <div className="loginForm__error">{error}</div>}

                <button
                    type="submit"
                    className="loginForm__submitBtn"
                    disabled={loading}
                >
                    {loading ? (isRegister ? "Creating account..." : "Logging in...") : (isRegister ? "Create Account" : "Login")}
                </button>

                <div className="loginForm__toggleMode">
                    <span>{isRegister ? "Already have an account?" : "Don't have an account?"}</span>
                    <button
                        type="button"
                        className="loginForm__toggleBtn"
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError("");
                            setConfirmPassword("");
                            setName("");
                            setRole("USER");
                        }}
                        disabled={loading}
                    >
                        {isRegister ? "Login" : "Sign Up"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default LoginForm;

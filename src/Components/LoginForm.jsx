import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { tryConfirmEmail, tryLogin, tryRegister } from "../api/auth.js";
import "react-day-picker/style.css";
import "./LoginForm/loginForm.css";
import "./LoginForm/loginFormdesktop.css";
import "./LoginForm/loginFormmobile.css";

function LoginForm({ onLoginSuccess, initialMode = "login" }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [name, setName] = useState("");
    const [birthdayDate, setBirthdayDate] = useState(null);
    const [isBirthdayOpen, setIsBirthdayOpen] = useState(false);
    const [gender, setGender] = useState("");
    const [confirmationCode, setConfirmationCode] = useState("");
    const [registrationStep, setRegistrationStep] = useState("form");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isRegister, setIsRegister] = useState(initialMode === "register");

    const isConfirmStep = isRegister && registrationStep === "confirm";

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (isConfirmStep) {
            if (!confirmationCode.trim()) {
                setError("Please enter the confirmation code from your email");
                return;
            }

            setLoading(true);

            try {
                await tryConfirmEmail(email, confirmationCode.trim());
                setSuccessMessage("Email confirmed successfully. You can now log in.");
                setIsRegister(false);
                setRegistrationStep("form");
                setConfirmationCode("");
                setConfirmPassword("");
            } catch (err) {
                console.error(err);
                setError(err.message || "Invalid code. Please try again.");
            } finally {
                setLoading(false);
            }

            return;
        }

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
            if (!birthdayDate) {
                setError("Birthday is required");
                return;
            }
            if (!gender) {
                setError("Gender is required");
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
                const formattedBirthday = birthdayDate ? format(birthdayDate, "yyyy-MM-dd") : "";
                await tryRegister(email, password, name, formattedBirthday, gender);
                setRegistrationStep("confirm");
                setConfirmationCode("");
                setSuccessMessage("We sent a confirmation code to your email. Enter it below to finish creating your account.");
            } else {
                await tryLogin(email, password);
                onLoginSuccess();
            }
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
                    {isConfirmStep ? "Confirm Email" : (isRegister ? "Create Account" : "Sign in")}
                </h2>

                {isRegister && !isConfirmStep && (
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

                {isRegister && !isConfirmStep && (
                    <div className="loginForm__fieldGroup">
                        <label className="loginForm__label">
                            <span className="loginForm__labelText">Birthday</span>
                            <div className="loginForm__dateWrapper">
                                <button
                                    type="button"
                                    className="loginForm__input loginForm__dateTrigger"
                                    onClick={() => setIsBirthdayOpen((open) => !open)}
                                    disabled={loading}
                                    aria-haspopup="dialog"
                                    aria-expanded={isBirthdayOpen}
                                >
                                    {birthdayDate ? format(birthdayDate, "yyyy-MM-dd") : "Select birthday"}
                                </button>
                                {isBirthdayOpen && (
                                    <div className="loginForm__datePopover" role="dialog" aria-label="Choose birthday">
                                        <DayPicker
                                            mode="single"
                                            selected={birthdayDate}
                                            onSelect={(date) => {
                                                setBirthdayDate(date ?? null);
                                                setIsBirthdayOpen(false);
                                            }}
                                            captionLayout="dropdown"
                                            fromYear={new Date().getFullYear() - 120}
                                            toYear={new Date().getFullYear()}
                                        />
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>
                )}

                {!isConfirmStep && (
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
                )}

                {isConfirmStep && (
                    <label className="loginForm__label">
                        <span className="loginForm__labelText">Confirmation code</span>
                        <input
                            type="text"
                            className="loginForm__input"
                            value={confirmationCode}
                            onChange={(e) => setConfirmationCode(e.target.value)}
                            placeholder="Enter code from email"
                            required
                            disabled={loading}
                        />
                    </label>
                )}

                {isConfirmStep && (
                    <p className="loginForm__helperText text-big">
                        Confirming account for {email}
                    </p>
                )}

                {!isConfirmStep && (
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
                )}

                {isRegister && !isConfirmStep && (
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
                                <span className="loginForm__labelText">Gender</span>
                                <select
                                    className="loginForm__input"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    required
                                    disabled={loading}
                                >
                                    <option value="" disabled>
                                        Select gender
                                    </option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </label>
                        </div>
                    </>
                )}

                {error && <div className="loginForm__error">{error}</div>}
                {successMessage && <div className="loginForm__success">{successMessage}</div>}

                <button
                    type="submit"
                    className="loginForm__submitBtn"
                    disabled={loading}
                >
                    {loading
                        ? (isConfirmStep ? "Confirming..." : (isRegister ? "Creating account..." : "Logging in..."))
                        : (isConfirmStep ? "Confirm" : (isRegister ? "Create Account" : "Login"))}
                </button>

                {isConfirmStep && (
                    <button
                        type="button"
                        className="loginForm__secondaryBtn"
                        onClick={() => {
                            setRegistrationStep("form");
                            setError("");
                            setSuccessMessage("");
                        }}
                        disabled={loading}
                    >
                        Back to registration form
                    </button>
                )}

                <div className="loginForm__toggleMode">
                    <span>{isRegister ? "Already have an account?" : "Don't have an account?"}</span>
                    <button
                        type="button"
                        className="loginForm__toggleBtn"
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setRegistrationStep("form");
                            setError("");
                            setSuccessMessage("");
                            setConfirmationCode("");
                            setConfirmPassword("");
                            setName("");
                            setBirthdayDate(null);
                            setIsBirthdayOpen(false);
                            setGender("");
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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../api/auth.js";
import { fetchCurrentPersona, updatePersona } from "../../api/persona.js";
import { createFamily, updateFamilyName, leaveFamily, joinFamily, generateJoinCode } from "../../api/families.js";
import CreateFamilyModal from "../../Components/CreateFamilyModal.jsx";
import EnterFamilyModal from "../../Components/EnterFamilyModal.jsx";
import InviteCodeModal from "../../Components/InviteCodeModal.jsx";
import PeriodProfileModal from "../../Components/PeriodProfileModal.jsx";
import "./ProfilePage/profilePage.css";
import "./ProfilePage/profilePagedesktop.css";
import "./ProfilePage/profilePagemobile.css";

import {
    getPushSubscriptionState,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
} from "../../api/pushNotifications.js";
import SegmentedControl from "../../Components/SegmentedControl.jsx";

const emptyForm = {
    name: "",
    birthday: "",
    gender: "",
    avatarUrl: "",
};

function getInitials(name) {
    const value = String(name || "").trim();
    if (!value) return "?";
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function ProfileSettingsPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [hasFamily, setHasFamily] = useState(true);
    const [familyName, setFamilyName] = useState("");
    const [familySaving, setFamilySaving] = useState(false);
    const [familyError, setFamilyError] = useState("");
    const [familySuccess, setFamilySuccess] = useState("");
    const [leaving, setLeaving] = useState(false);
    const [leaveError, setLeaveError] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [createSaving, setCreateSaving] = useState(false);
    const [createError, setCreateError] = useState("");
    const [enterOpen, setEnterOpen] = useState(false);
    const [enterSaving, setEnterSaving] = useState(false);
    const [enterError, setEnterError] = useState("");
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState("");
    const [inviteExpiresAt, setInviteExpiresAt] = useState("");
    const [periodOpen, setPeriodOpen] = useState(false);
    const [accountEmail, setAccountEmail] = useState("");
    const [personalEditOpen, setPersonalEditOpen] = useState(false);
    const [familyEditOpen, setFamilyEditOpen] = useState(false);

    const [pushState, setPushState] = useState({
        supported: true,
        configured: true,
        permission: "default",
        subscribed: false,
    });
    const [pushLoading, setPushLoading] = useState(true);
    const [pushBusy, setPushBusy] = useState(false);
    const [pushError, setPushError] = useState("");

    async function refreshPushState() {
        const nextState = await getPushSubscriptionState();
        setPushState(nextState);
    }

    async function handleLogout() {
        await logout();
        navigate("/welcome", { replace: true });
    }

    useEffect(() => {
        let active = true;

        setPushLoading(true);
        setPushError("");

        refreshPushState()
            .catch((err) => {
                if (!active) return;
                setPushError(err.message || "Failed to load push notification settings");
            })
            .finally(() => {
                if (active) setPushLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        setLoading(true);

        fetchCurrentPersona()
            .then((data) => {
                if (!active) return;
                console.log("Persona response:", data);
                setHasFamily(Boolean(data?.family));
                setFamilyName(data?.family?.name ?? "");
                setForm({
                    name: data?.name ?? "",
                    birthday: data?.birthday ?? "",
                    gender: data?.gender ?? "",
                    avatarUrl: data?.avatarUrl ?? "",
                });
                setAccountEmail(data?.email ?? data?.user?.email ?? "");
            })
            .catch((err) => {
                if (active) {
                    setError(err.message || "Failed to load profile");
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess("");
        setSaving(true);

        const payload = {
            name: form.name.trim() || null,
            birthday: form.birthday || null,
            gender: form.gender || null,
            avatarUrl: form.avatarUrl.trim() || null,
        };

        try {
            const updated = await updatePersona(payload);
            setForm({
                name: updated?.name ?? "",
                birthday: updated?.birthday ?? "",
                gender: updated?.gender ?? "",
                avatarUrl: updated?.avatarUrl ?? "",
            });
            setSuccess("Profile updated successfully.");
        } catch (err) {
            setError(err.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    }

    function renderPushDescription() {
        if (!pushState.supported) {
            return "This browser does not support OS-level push notifications.";
        }

        if (!pushState.configured) {
            return "Push notifications are not configured yet. Add a VAPID public key to enable subscriptions.";
        }

        if (pushState.permission === "denied") {
            return "Notifications are blocked in this browser. Re-enable them in browser settings to continue.";
        }

        if (pushState.subscribed) {
            return "This device is subscribed to OS-level push notifications.";
        }

        return "Enable push to receive OS-level notifications when the app is closed or in the background.";
    }

    async function handleEnablePush() {
        setPushBusy(true);
        setPushError("");

        try {
            await subscribeToPushNotifications();
            await refreshPushState();
        } catch (err) {
            setPushError(err.message || "Failed to enable push notifications");
        } finally {
            setPushBusy(false);
        }
    }

    async function handleDisablePush() {
        setPushBusy(true);
        setPushError("");

        try {
            await unsubscribeFromPushNotifications();
            await refreshPushState();
        } catch (err) {
            setPushError(err.message || "Failed to disable push notifications");
        } finally {
            setPushBusy(false);
        }
    }

    async function handleCreateFamily(name) {
        setCreateSaving(true);
        setCreateError("");

        try {
            const created = await createFamily(name);
            setHasFamily(true);
            setFamilyName(created?.name ?? name);
            setSuccess("Family created successfully.");
            setCreateOpen(false);
        } catch (err) {
            setCreateError(err.message || "Failed to create family");
        } finally {
            setCreateSaving(false);
        }
    }

    async function handleFamilySubmit(e) {
        e.preventDefault();
        setFamilySaving(true);
        setFamilyError("");
        setFamilySuccess("");

        const trimmed = familyName.trim();
        if (!trimmed) {
            setFamilyError("Family name is required.");
            setFamilySaving(false);
            return;
        }

        try {
            const updated = await updateFamilyName(trimmed);
            setFamilyName(updated?.name ?? trimmed);
            setFamilySuccess("Family updated successfully.");
        } catch (err) {
            setFamilyError(err.message || "Failed to update family");
        } finally {
            setFamilySaving(false);
        }
    }

    async function handleLeaveFamily() {
        const confirmed = window.confirm(
            "Are you sure you want to leave this family? You will no longer have access to shared spaces."
        );
        if (!confirmed) return;

        setLeaving(true);
        setLeaveError("");

        try {
            await leaveFamily();
            setHasFamily(false);
            setFamilyName("");
            setSuccess("You have left the family.");
        } catch (err) {
            setLeaveError(err.message || "Failed to leave family");
        } finally {
            setLeaving(false);
        }
    }

    async function handleJoinFamily(code) {
        setEnterSaving(true);
        setEnterError("");

        try {
            const result = await joinFamily(code);
            setHasFamily(true);
            setFamilyName(result?.name ?? "");
            setSuccess("Successfully joined family!");
            setEnterOpen(false);
        } catch (err) {
            setEnterError(err.message || "Failed to join family");
        } finally {
            setEnterSaving(false);
        }
    }

    async function handleInviteMembers() {
        setInviteOpen(true);
        setInviteLoading(true);
        setInviteCode("");

        try {
            const result = await generateJoinCode();
            setInviteCode(result?.code ?? "");
            setInviteExpiresAt(result?.expiresAt ?? "");
        } catch (err) {
            setInviteCode("");
            setInviteOpen(false);
            setError(err.message || "Failed to generate invite code");
        } finally {
            setInviteLoading(false);
        }
    }

    const displayName = form.name?.trim() || "No name yet";
    const displayEmail = accountEmail?.trim() || "No email linked";

    return (
        <>
            <div className="page profilePage">
                <header className="page__header profileHero">
                    <div>
                        <h1 className="page__title profileHero__title">Profile</h1>
                        <p className="page__subtitle profileHero__subtitle text-medium">
                            Manage your account and family settings.
                        </p>
                    </div>
                    <div className="profileHero__avatarWrap" aria-hidden="true">
                        {form.avatarUrl ? (
                            <img src={form.avatarUrl} alt="" className="profileHero__avatar" />
                        ) : (
                            <span className="profileHero__avatarFallback">{getInitials(displayName)}</span>
                        )}
                    </div>
                </header>

                {(error || success || familyError || familySuccess || leaveError) && (
                    <section className="profileSection">
                        {error && <div className="profileMessage profileMessage--error">{error}</div>}
                        {success && <div className="profileMessage profileMessage--success">{success}</div>}
                        {familyError && <div className="profileMessage profileMessage--error">{familyError}</div>}
                        {familySuccess && <div className="profileMessage profileMessage--success">{familySuccess}</div>}
                        {leaveError && <div className="profileMessage profileMessage--error">{leaveError}</div>}
                    </section>
                )}

                <section className="profileSection">
                    <h2 className="settingsSectionTitle">Your account</h2>
                    <div className="profilePanel">
                        <div className="profileRow">
                            <div className="profileRow__main">
                                <span className="profileRow__label">Name</span>
                                <span className="profileRow__value">{loading ? "Loading..." : displayName}</span>
                            </div>
                            <span className="profileRow__chevron" aria-hidden="true">›</span>
                        </div>

                        <div className="profileRow">
                            <div className="profileRow__main">
                                <span className="profileRow__label">Email</span>
                                <span className="profileRow__value">{loading ? "Loading..." : displayEmail}</span>
                            </div>
                            <span className="profileRow__chevron" aria-hidden="true">›</span>
                        </div>

                        <div className="profileRow">
                            <div className="profileRow__main">
                                <span className="profileRow__label">Password</span>
                                <span className="profileRow__value">••••••••</span>
                            </div>
                            <span className="profileRow__chevron" aria-hidden="true">›</span>
                        </div>

                        <button
                            type="button"
                            className="profileRow profileRow--action"
                            onClick={() => setPersonalEditOpen((current) => !current)}
                        >
                            <span className="profileRow__label profileRow__label--accent">
                                {personalEditOpen ? "Close personal info" : "Edit personal info"}
                            </span>
                            <span className="profileRow__chevron" aria-hidden="true">›</span>
                        </button>

                        {personalEditOpen && (
                            <form className="profileForm" onSubmit={handleSubmit}>
                                <label className="profileField">
                                    <span>Name</span>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        maxLength={200}
                                        placeholder="Your full name"
                                        disabled={loading || saving}
                                    />
                                </label>

                                <label className="profileField">
                                    <span>Birthday</span>
                                    <input
                                        type="date"
                                        name="birthday"
                                        value={form.birthday}
                                        onChange={handleChange}
                                        disabled={loading || saving}
                                    />
                                </label>

                                <label className="profileField">
                                    <span>Gender</span>
                                    <select
                                        name="gender"
                                        value={form.gender}
                                        onChange={handleChange}
                                        disabled={loading || saving}
                                    >
                                        <option value="">Select gender</option>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </label>

                                <label className="profileField profileField--wide">
                                    <span>Avatar URL</span>
                                    <input
                                        type="url"
                                        name="avatarUrl"
                                        value={form.avatarUrl}
                                        onChange={handleChange}
                                        maxLength={500}
                                        placeholder="https://..."
                                        disabled={loading || saving}
                                    />
                                </label>

                                <button type="submit" className="profileSave" disabled={loading || saving}>
                                    {saving ? "Saving..." : "Save changes"}
                                </button>
                            </form>
                        )}
                    </div>
                </section>

                <section className="profileSection" aria-live="polite">
                    <div className="">
                        <h2 className="settingsSectionTitle">Notifications</h2>
                    </div>
                    <div className="profilePanel">
                        <div className="profileRow">
                            <div className="profileRow__main">
                                <span className="profileRow__value">Allow push notifications</span>
                                <span className="profileRow__label">Permission: {pushLoading ? "Checking" : pushState.permission}</span>
                            </div>
                            <span>
                                <SegmentedControl
                                    options={["ON", "OFF"]}
                                    value={pushState.subscribed ? "ON" : "OFF"}
                                    onChange={(value) => {
                                        if (value === "ON") {
                                            handleEnablePush();
                                        } else {
                                            handleDisablePush();
                                        }
                                    }}
                                ></SegmentedControl>
                            </span>
                        </div>
                    </div>
                </section>

                <section className="profileSection">
                    <h2 className="settingsSectionTitle">Family</h2>

                    {hasFamily ? (
                        <div className="profilePanel">
                            <div className="profileRow">
                                <div className="profileRow__main">
                                    <span className="profileRow__value">{familyName || "Your family"}</span>
                                    <span className="profileRow__label">Shared household</span>
                                </div>
                                <span className="profileRow__chevron" aria-hidden="true">›</span>
                            </div>

                            <button
                                type="button"
                                className="profileRow profileRow--action"
                                onClick={() => setFamilyEditOpen((current) => !current)}
                            >
                                <div className="profileRow__main">
                                    <span className="profileRow__value">Family details</span>
                                    <span className="profileRow__label">Edit name and settings</span>
                                </div>
                                <span className="profileRow__chevron" aria-hidden="true">›</span>
                            </button>

                            {familyEditOpen && (
                                <form className="profileForm" onSubmit={handleFamilySubmit}>
                                    <label className="profileField profileField--wide">
                                        <span>Family name</span>
                                        <input
                                            type="text"
                                            value={familyName}
                                            onChange={(e) => setFamilyName(e.target.value)}
                                            maxLength={200}
                                            placeholder="Your family name"
                                            disabled={familySaving}
                                        />
                                    </label>

                                    <button type="submit" className="familySave" disabled={familySaving}>
                                        {familySaving ? "Saving..." : "Save changes"}
                                    </button>
                                </form>
                            )}

                            <button
                                type="button"
                                className="profileRow profileRow--action"
                                onClick={handleInviteMembers}
                                disabled={inviteLoading}
                            >
                                <div className="profileRow__main">
                                    <span className="profileRow__value">Invite to family</span>
                                    <span className="profileRow__label">Send an invitation link</span>
                                </div>
                                <span className="profileRow__chevron" aria-hidden="true">›</span>
                            </button>

                            <button
                                type="button"
                                className="profileRow profileRow--action"
                                onClick={() => setPeriodOpen(true)}
                            >
                                <div className="profileRow__main">
                                    <span className="profileRow__value">Period settings</span>
                                    <span className="profileRow__label">Cycle profile and predictions</span>
                                </div>
                                <span className="profileRow__chevron" aria-hidden="true">›</span>
                            </button>

                            <button
                                type="button"
                                className="profileRow profileRow--action profileRow--danger"
                                onClick={handleLeaveFamily}
                                disabled={leaving}
                            >
                                <div className="profileRow__main">
                                    <span className="profileRow__value">{leaving ? "Leaving..." : "Leave family"}</span>
                                    <span className="profileRow__label">You will leave this family</span>
                                </div>
                                <span className="profileRow__chevron" aria-hidden="true">›</span>
                            </button>
                        </div>
                    ) : (
                        <div className="profilePanel">
                            <button
                                type="button"
                                className="profileRow profileRow--action"
                                onClick={() => setCreateOpen(true)}
                            >
                                <div className="profileRow__main">
                                    <span className="profileRow__value">Create family</span>
                                    <span className="profileRow__label">Start a new household</span>
                                </div>
                                <span className="profileRow__chevron" aria-hidden="true">›</span>
                            </button>

                            <button
                                type="button"
                                className="profileRow profileRow--action"
                                onClick={() => setEnterOpen(true)}
                            >
                                <div className="profileRow__main">
                                    <span className="profileRow__value">Enter family</span>
                                    <span className="profileRow__label">Use an invitation code</span>
                                </div>
                                <span className="profileRow__chevron" aria-hidden="true">›</span>
                            </button>
                        </div>
                    )}
                </section>

                <section className="profileSection profileBottomActions">
                    <h2 className="settingsSectionTitle">Account</h2>
                    <div className="profilePanel">
                        <button type="button" className="profileRow profileRow--action profileRow--danger" onClick={handleLogout}>
                            <div className="profileRow__main">
                                <span className="profileRow__value">Log off</span>
                                <span className="profileRow__label">Sign out from your account</span>
                            </div>
                            <span className="profileRow__chevron" aria-hidden="true">›</span>
                        </button>
                    </div>
                </section>
            </div>
            <CreateFamilyModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreate={handleCreateFamily}
                saving={createSaving}
                error={createError}
            />
            <EnterFamilyModal
                isOpen={enterOpen}
                onClose={() => setEnterOpen(false)}
                onJoin={handleJoinFamily}
                joining={enterSaving}
                error={enterError}
            />
            <InviteCodeModal
                isOpen={inviteOpen}
                onClose={() => setInviteOpen(false)}
                code={inviteCode}
                expiresAt={inviteExpiresAt}
            />
            <PeriodProfileModal isOpen={periodOpen} onClose={() => setPeriodOpen(false)} />
        </>
    );
}

export default ProfileSettingsPage;

import { useEffect, useState } from "react";
import { fetchCurrentPersona, updatePersona } from "../../api/persona.js";
import { createFamily, updateFamilyName } from "../../api/families.js";
import CreateFamilyModal from "../../Components/CreateFamilyModal.jsx";
import "./ProfilePage.css";

const emptyForm = {
    name: "",
    birthday: "",
    gender: "",
    avatarUrl: "",
};

function ProfileSettingsPage() {
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
    const [createOpen, setCreateOpen] = useState(false);
    const [createSaving, setCreateSaving] = useState(false);
    const [createError, setCreateError] = useState("");

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

    return (
        <>
            <div className="page">
                <header className="page__header">
                    <h1 className="page__title">Profile & Family</h1>
                    <p className="page__subtitle">
                        Manage your personal details and family settings in one place.
                    </p>
                </header>

                {!loading && !hasFamily && (
                    <section className="profileSection">
                        <div className="card ctaCard">
                            <div>
                                <h2 className="card__title">Create your family</h2>
                                <p className="card__text">
                                    Start a family space to share lists, calendars, and updates.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="ctaButton"
                                onClick={() => setCreateOpen(true)}
                            >
                                Create family
                            </button>
                        </div>
                    </section>
                )}

                <section className="profileSection">
                    <div className="card profileCard">
                        <div className="profileCard__header">
                            <div>
                                <h2 className="card__title">Personal Info</h2>
                                <p className="card__text">
                                    Update your name, birthday, gender, and avatar.
                                </p>
                            </div>
                            <div className="profileCard__status">
                                {loading ? "Loading..." : "Ready"}
                            </div>
                        </div>

                        {error && <div className="profileMessage profileMessage--error">{error}</div>}
                        {success && (
                            <div className="profileMessage profileMessage--success">
                                {success}
                            </div>
                        )}

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

                            <button
                                type="submit"
                                className="profileSave"
                                disabled={loading || saving}
                            >
                                {saving ? "Saving..." : "Save changes"}
                            </button>
                        </form>
                    </div>
                </section>

                {!loading && hasFamily && (
                    <section className="profileSection">
                        <div className="card profileCard">
                            <div className="profileCard__header">
                                <div>
                                    <h2 className="card__title">Family Settings</h2>
                                    <p className="card__text">
                                        Update your family name and manage members.
                                    </p>
                                </div>
                            </div>

                            {familyError && (
                                <div className="profileMessage profileMessage--error">
                                    {familyError}
                                </div>
                            )}
                            {familySuccess && (
                                <div className="profileMessage profileMessage--success">
                                    {familySuccess}
                                </div>
                            )}

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

                                <button
                                    type="submit"
                                    className="familySave"
                                    disabled={familySaving}
                                >
                                    {familySaving ? "Saving..." : "Save changes"}
                                </button>
                            </form>
                        </div>

                        <div className="familyActionsLarge">
                            <button
                                type="button"
                                className="familyActionButton familyActionButton--invite"
                                onClick={() => console.log("Invite members")}
                            >
                                Invite members
                            </button>
                            <button
                                type="button"
                                className="familyActionButton familyActionButton--danger"
                                onClick={() => console.log("Leave family")}
                            >
                                Leave family
                            </button>
                        </div>
                    </section>
                )}

                <section className="page__grid">
                    <div className="card">
                        <h2 className="card__title">Security</h2>
                        <p className="card__text">
                            Change your password and manage sessions.
                        </p>
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
        </>
    );
}

export default ProfileSettingsPage;

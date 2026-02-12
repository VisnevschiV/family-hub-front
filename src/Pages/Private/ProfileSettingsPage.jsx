import { useEffect, useState } from "react";
import { fetchCurrentPersona, updatePersona } from "../../api/persona.js";
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

    useEffect(() => {
        let active = true;
        setLoading(true);

        fetchCurrentPersona()
            .then((data) => {
                if (!active) return;
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

    return (
        <div className="page">
            <header className="page__header">
                <h1 className="page__title">Profile & Family</h1>
                <p className="page__subtitle">
                    Manage your personal details and family settings in one place.
                </p>
            </header>

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

            <section className="page__grid">
                <div className="card">
                    <h2 className="card__title">Security</h2>
                    <p className="card__text">
                        Change your password and manage sessions.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Invite Members</h2>
                    <p className="card__text">
                        Generate and share your family invitation code.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Member Roles</h2>
                    <p className="card__text">
                        Everyone is admin by default, adjust later.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Leave Family</h2>
                    <p className="card__text">
                        Remove yourself from the family group.
                    </p>
                </div>
            </section>
        </div>
    );
}

export default ProfileSettingsPage;

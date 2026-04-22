import { useEffect, useMemo, useState } from "react";
import {
    createPeriodProfile,
    deletePeriodProfile,
    getPeriodProfile,
    updatePeriodProfile,
} from "../api/periodProfile.js";
import "./PeriodProfileModal/periodProfileModal.css";
import "./PeriodProfileModal/periodProfileModaldesktop.css";
import "./PeriodProfileModal/periodProfileModalmobile.css";

const defaultForm = {
    cycleLengthDays: "28",
    periodLengthDays: "5",
    predictionEnabled: true,
    lastPeriodStartDate: "",
};

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function toForm(profile) {
    return {
        cycleLengthDays: String(profile?.cycleLengthDays ?? 28),
        periodLengthDays: String(profile?.periodLengthDays ?? 5),
        predictionEnabled: Boolean(profile?.predictionEnabled ?? true),
        lastPeriodStartDate: profile?.lastPeriodStartDate ?? "",
    };
}

function toPayload(form) {
    return {
        cycleLengthDays: Number(form.cycleLengthDays),
        periodLengthDays: Number(form.periodLengthDays),
        predictionEnabled: form.predictionEnabled,
        lastPeriodStartDate: form.lastPeriodStartDate || null,
    };
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return dateStr;
    }
}

function PeriodProfileModal({ isOpen, onClose }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState(defaultForm);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const canSubmit = useMemo(() => {
        const cycle = Number(form.cycleLengthDays);
        const period = Number(form.periodLengthDays);
        return cycle >= 15 && cycle <= 60 && period >= 1 && period <= 15;
    }, [form.cycleLengthDays, form.periodLengthDays]);

    useEffect(() => {
        if (!isOpen) return;

        let active = true;
        setLoading(true);
        setError("");
        setSuccess("");

        getPeriodProfile()
            .then((data) => {
                if (!active) return;
                setProfile(data);
                setForm(data ? toForm(data) : defaultForm);
            })
            .catch((err) => {
                if (active) setError(err.message || "Failed to load period profile");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    async function handleSave() {
        setError("");
        setSuccess("");
        setSaving(true);

        try {
            const payload = toPayload(form);
            const updated = profile
                ? await updatePeriodProfile(payload)
                : await createPeriodProfile(payload);
            setProfile(updated);
            setForm(toForm(updated));
            setSuccess("Period settings saved.");
        } catch (err) {
            setError(err.message || "Failed to save period settings");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteProfile() {
        const confirmed = window.confirm(
            "Delete your period profile? This will remove all cycle settings and tracking data."
        );
        if (!confirmed) return;

        setError("");
        setSuccess("");
        setDeleteLoading(true);

        try {
            await deletePeriodProfile();
            setProfile(null);
            setForm(defaultForm);
            setSuccess("Period profile deleted.");
        } catch (err) {
            setError(err.message || "Failed to delete period profile");
        } finally {
            setDeleteLoading(false);
        }
    }

    return (
        <div className="periodModalOverlay" onClick={onClose}>
            <div className="periodModalCard" onClick={(e) => e.stopPropagation()}>
                <div className="periodModalHeader">
                    <div>
                        <h2 className="periodModalTitle">Period settings</h2>
                        <p className="periodModalSubtitle">
                            Manage your cycle details and predictions.
                        </p>
                    </div>
                    <button type="button" className="periodModalClose" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {error && <p className="periodModalError">{error}</p>}
                {success && <p className="periodModalSuccess">{success}</p>}

                {loading ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>
                ) : (
                    <>
                        {profile && (
                            <div className="periodStats">
                                <div className="periodStatItem">
                                    <span className="periodStatItem__label">Effective cycle</span>
                                    <span className="periodStatItem__value">
                                        {profile.effectiveCycleLengthDays ?? "—"} days
                                    </span>
                                </div>
                                <div className="periodStatItem">
                                    <span className="periodStatItem__label">Learned cycle</span>
                                    <span className="periodStatItem__value">
                                        {profile.learnedCycleLengthDays != null
                                            ? `${profile.learnedCycleLengthDays} days`
                                            : "Not yet"}
                                    </span>
                                </div>
                                <div className="periodStatItem">
                                    <span className="periodStatItem__label">Samples</span>
                                    <span className="periodStatItem__value">
                                        {profile.learningSamples ?? 0}
                                    </span>
                                </div>
                                <div className="periodStatItem">
                                    <span className="periodStatItem__label">Next predicted</span>
                                    <span className="periodStatItem__value">
                                        {formatDate(profile.nextPredictedStartDate)}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="periodForm">
                            <label className="periodField">
                                <span>Cycle length (days)</span>
                                <input
                                    type="number"
                                    name="cycleLengthDays"
                                    value={form.cycleLengthDays}
                                    onChange={handleChange}
                                    min={15}
                                    max={60}
                                    disabled={saving}
                                />
                            </label>

                            <label className="periodField">
                                <span>Period length (days)</span>
                                <input
                                    type="number"
                                    name="periodLengthDays"
                                    value={form.periodLengthDays}
                                    onChange={handleChange}
                                    min={1}
                                    max={15}
                                    disabled={saving}
                                />
                            </label>

                            <label className="periodField periodField--wide">
                                <span>Last period start date</span>
                                <input
                                    type="date"
                                    name="lastPeriodStartDate"
                                    value={form.lastPeriodStartDate}
                                    onChange={handleChange}
                                    max={todayIso()}
                                    disabled={saving}
                                />
                            </label>

                            <label className="periodField periodField--wide periodCheckbox">
                                <input
                                    type="checkbox"
                                    name="predictionEnabled"
                                    checked={form.predictionEnabled}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                                <span>Enable predictions</span>
                            </label>

                            <button
                                type="button"
                                className="periodSaveButton"
                                onClick={handleSave}
                                disabled={saving || !canSubmit}
                            >
                                {saving ? "Saving..." : "Save settings"}
                            </button>
                        </div>

                        {profile && (
                            <div className="periodDangerZone">
                                <button
                                    type="button"
                                    className="periodDeleteButton"
                                    onClick={handleDeleteProfile}
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? "Deleting..." : "Delete period profile"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default PeriodProfileModal;

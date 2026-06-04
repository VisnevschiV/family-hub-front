import { useEffect, useMemo, useState } from "react";
import {
    createPeriodProfile,
    deletePeriodProfile,
    getPeriodProfile,
    updatePeriodProfile,
} from "../api/periodProfile.js";
import UniversalModal from "./UniversalModal/UniversalModal.jsx";
import { ModalField, ModalHeader } from "./UniversalModal/ModalPrimitives.jsx";
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
        <UniversalModal
            isOpen={isOpen}
            onClose={onClose}
            overlayClassName="periodModalOverlay"
            dialogClassName="periodModalCard"
        >
            <ModalHeader
                title="Period settings"
                subtitle="Manage your cycle details and predictions."
                onClose={onClose}
                closeIcon="✕"
                className="periodModalHeader"
                titleClassName="periodModalTitle"
                subtitleClassName="periodModalSubtitle text-medium"
                closeButtonClassName="periodModalClose"
            />

            {error && <p className="periodModalError text-medium">{error}</p>}
            {success && <p className="periodModalSuccess text-medium">{success}</p>}

            {loading ? (
                <p className="text-medium" style={{ color: "var(--text-muted)" }}>Loading...</p>
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
                        <ModalField label="Cycle length (days)" className="periodField">
                            <input
                                className="universalModal__input"
                                type="number"
                                name="cycleLengthDays"
                                value={form.cycleLengthDays}
                                onChange={handleChange}
                                min={15}
                                max={60}
                                disabled={saving}
                            />
                        </ModalField>

                        <ModalField label="Period length (days)" className="periodField">
                            <input
                                className="universalModal__input"
                                type="number"
                                name="periodLengthDays"
                                value={form.periodLengthDays}
                                onChange={handleChange}
                                min={1}
                                max={15}
                                disabled={saving}
                            />
                        </ModalField>

                        <ModalField label="Last period start date" className="periodField periodField--wide">
                            <input
                                className="universalModal__input"
                                type="date"
                                name="lastPeriodStartDate"
                                value={form.lastPeriodStartDate}
                                onChange={handleChange}
                                max={todayIso()}
                                disabled={saving}
                            />
                        </ModalField>

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
                            className="periodSaveButton long universalModal__button"
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
                                className="periodDeleteButton long universalModal__button universalModal__button--danger"
                                onClick={handleDeleteProfile}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? "Deleting..." : "Delete period profile"}
                            </button>
                        </div>
                    )}
                </>
            )}
        </UniversalModal>
    );
}

export default PeriodProfileModal;

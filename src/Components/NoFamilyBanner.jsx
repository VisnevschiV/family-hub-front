import { useState } from "react";
import { createFamily, joinFamily } from "../api/families.js";
import CreateFamilyModal from "./CreateFamilyModal.jsx";
import EnterFamilyModal from "./EnterFamilyModal.jsx";

/**
 * Shown on pages that require a family when the user hasn't joined one yet.
 * `onFamilyJoined` is called after a successful create or join so the parent
 * page can re-render its normal content.
 */
function NoFamilyBanner({ onFamilyJoined }) {
    const [createOpen, setCreateOpen] = useState(false);
    const [createSaving, setCreateSaving] = useState(false);
    const [createError, setCreateError] = useState("");

    const [enterOpen, setEnterOpen] = useState(false);
    const [enterSaving, setEnterSaving] = useState(false);
    const [enterError, setEnterError] = useState("");

    async function handleCreateFamily(name) {
        setCreateSaving(true);
        setCreateError("");
        try {
            await createFamily(name);
            setCreateOpen(false);
            onFamilyJoined?.();
        } catch (err) {
            setCreateError(err.message || "Failed to create family");
        } finally {
            setCreateSaving(false);
        }
    }

    async function handleJoinFamily(code) {
        setEnterSaving(true);
        setEnterError("");
        try {
            await joinFamily(code);
            setEnterOpen(false);
            onFamilyJoined?.();
        } catch (err) {
            setEnterError(err.message || "Failed to join family");
        } finally {
            setEnterSaving(false);
        }
    }

    return (
        <>
            <div className="page">
                <header className="page__header">
                    <h1 className="page__title">No family yet</h1>
                    <p className="page__subtitle text-medium">
                        This page is shared with your family. Create or join a family first to get started.
                    </p>
                </header>

                <section>
                    <div className="card ctaCard">
                        <div>
                            <h2 className="card__title">Join or create a family</h2>
                            <p className="card__text text-medium">
                                Start a new family space or enter an invite code to join an existing one.
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            <button
                                type="button"
                                className="ctaButton"
                                onClick={() => setEnterOpen(true)}
                            >
                                Enter family
                            </button>
                            <button
                                type="button"
                                className="ctaButton"
                                onClick={() => setCreateOpen(true)}
                            >
                                Create family
                            </button>
                        </div>
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
        </>
    );
}

export default NoFamilyBanner;

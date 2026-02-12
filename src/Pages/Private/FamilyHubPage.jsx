import { useEffect, useState } from "react";
import { fetchCurrentPersona } from "../../api/persona.js";
import { createFamily, joinFamily, generateJoinCode } from "../../api/families.js";
import CreateFamilyModal from "../../Components/CreateFamilyModal.jsx";
import EnterFamilyModal from "../../Components/EnterFamilyModal.jsx";
import InviteCodeModal from "../../Components/InviteCodeModal.jsx";

function FamilyHubPage() {
    const [loading, setLoading] = useState(true);
    const [hasFamily, setHasFamily] = useState(true);
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

    useEffect(() => {
        let active = true;
        setLoading(true);

        fetchCurrentPersona()
            .then((data) => {
                if (!active) return;
                setHasFamily(Boolean(data?.family));
            })
            .catch(() => {
                if (active) {
                    setHasFamily(true);
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    async function handleCreateFamily(name) {
        setCreateSaving(true);
        setCreateError("");

        try {
            await createFamily(name);
            setHasFamily(true);
            setCreateOpen(false);
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
            setHasFamily(true);
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
            console.error(err.message || "Failed to generate invite code");
        } finally {
            setInviteLoading(false);
        }
    }

    return (
        <>
            <div className="page">
                <header className="page__header">
                    <h1 className="page__title">Family Hub</h1>
                    <p className="page__subtitle">
                        Manage your family group and shared spaces.
                    </p>
                </header>

                {!loading && !hasFamily && (
                    <section>
                        <div className="card ctaCard">
                            <div>
                                <h2 className="card__title">Join or create family</h2>
                                <p className="card__text">
                                    Start a new family space or join an existing one.
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: "12px" }}>
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
                )}

                <section className="page__grid">
                    <div className="card">
                        <h2 className="card__title">Invitation Code</h2>
                        <p className="card__text">
                            Create or join a family using a code.
                        </p>
                    </div>
                    <div className="card">
                        <h2 className="card__title">Members</h2>
                        <p className="card__text">
                            View members and admin actions for the group.
                        </p>
                    </div>
                    <div className="card">
                        <h2 className="card__title">Shared Spaces</h2>
                        <p className="card__text">
                            Quick links to the shared calendar and to-do list.
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
        </>
    );
}

export default FamilyHubPage;

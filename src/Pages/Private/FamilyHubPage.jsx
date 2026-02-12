import { useEffect, useState } from "react";
import { fetchCurrentPersona } from "../../api/persona.js";
import { createFamily } from "../../api/families.js";
import CreateFamilyModal from "../../Components/CreateFamilyModal.jsx";

function FamilyHubPage() {
    const [loading, setLoading] = useState(true);
    const [hasFamily, setHasFamily] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [createSaving, setCreateSaving] = useState(false);
    const [createError, setCreateError] = useState("");

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
                                <h2 className="card__title">Create your family</h2>
                                <p className="card__text">
                                    Build your shared space for calendars, lists, and updates.
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
        </>
    );
}

export default FamilyHubPage;

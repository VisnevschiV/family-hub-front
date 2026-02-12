import { useEffect, useState } from "react";
import "./CreateFamilyModal.css";

function CreateFamilyModal({ isOpen, onClose, onCreate, saving, error }) {
    const [name, setName] = useState("");

    useEffect(() => {
        if (isOpen) {
            setName("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    function handleSubmit(e) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || saving) return;
        onCreate(trimmed);
    }

    return (
        <div className="modalOverlay" role="dialog" aria-modal="true">
            <div className="modalCard">
                <div className="modalHeader">
                    <div>
                        <h2 className="modalTitle">Create your family</h2>
                        <p className="modalSubtitle">
                            Pick a name so everyone knows this shared space.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="modalClose"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <form className="modalBody" onSubmit={handleSubmit}>
                    <label className="modalField">
                        <span>Family name</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="The Nguyen family"
                            maxLength={120}
                            disabled={saving}
                            autoFocus
                        />
                    </label>

                    {error && <div className="modalError">{error}</div>}

                    <div className="modalActions">
                        <button
                            type="button"
                            className="modalButton modalButton--ghost"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="modalButton"
                            disabled={saving || !name.trim()}
                        >
                            {saving ? "Creating..." : "Create family"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateFamilyModal;

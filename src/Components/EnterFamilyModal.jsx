import { useEffect, useState } from "react";
import "./EnterFamilyModal.css";

function EnterFamilyModal({ isOpen, onClose, onJoin, joining, error }) {
    const [code, setCode] = useState("");

    useEffect(() => {
        if (isOpen) {
            setCode("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    function handleSubmit(e) {
        e.preventDefault();
        const trimmed = code.trim().toUpperCase();
        if (!trimmed || joining) return;
        onJoin(trimmed);
    }

    return (
        <div className="modalOverlay" role="dialog" aria-modal="true">
            <div className="modalCard">
                <div className="modalHeader">
                    <div>
                        <h2 className="modalTitle">Enter family</h2>
                        <p className="modalSubtitle">
                            Ask a family member for the invitation code.
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
                        <span>Family code</span>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="ABC123"
                            maxLength={20}
                            disabled={joining}
                            autoFocus
                        />
                    </label>

                    {error && <div className="modalError">{error}</div>}

                    <div className="modalActions">
                        <button
                            type="button"
                            className="modalButton modalButton--ghost"
                            onClick={onClose}
                            disabled={joining}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="modalButton"
                            disabled={joining || !code.trim()}
                        >
                            {joining ? "Joining..." : "Enter family"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EnterFamilyModal;

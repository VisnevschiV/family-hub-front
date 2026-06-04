import { useEffect, useState } from "react";
import UniversalModal from "./UniversalModal/UniversalModal.jsx";
import { ModalActions, ModalField, ModalHeader } from "./UniversalModal/ModalPrimitives.jsx";
import "./EnterFamilyModal/enterFamilyModal.css";
import "./EnterFamilyModal/enterFamilyModaldesktop.css";
import "./EnterFamilyModal/enterFamilyModalmobile.css";

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
        <UniversalModal
            isOpen={isOpen}
            onClose={onClose}
            overlayClassName="modalOverlay"
            dialogClassName="modalCard"
        >
            <ModalHeader
                title="Enter family"
                subtitle="Ask a family member for the invitation code."
                onClose={onClose}
                className="modalHeader"
                titleClassName="modalTitle"
                subtitleClassName="modalSubtitle text-medium"
                closeButtonClassName="modalClose"
            />

            <form className="modalBody universalModal__body" onSubmit={handleSubmit}>
                <ModalField label="Family code" className="modalField">
                    <input
                        className="universalModal__input"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="ABC123"
                        maxLength={20}
                        disabled={joining}
                        autoFocus
                    />
                </ModalField>

                {error && <div className="modalError">{error}</div>}

                <ModalActions className="modalActions">
                    <button
                        type="button"
                        className="btn-secondary medium universalModal__button universalModal__button--ghost"
                        onClick={onClose}
                        disabled={joining}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="addButton medium universalModal__button"
                        disabled={joining || !code.trim()}
                    >
                        {joining ? "Joining..." : "Enter family"}
                    </button>
                </ModalActions>
            </form>
        </UniversalModal>
    );
}

export default EnterFamilyModal;

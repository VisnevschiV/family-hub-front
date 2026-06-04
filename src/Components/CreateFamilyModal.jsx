import { useEffect, useState } from "react";
import UniversalModal from "./UniversalModal/UniversalModal.jsx";
import { ModalActions, ModalField, ModalHeader } from "./UniversalModal/ModalPrimitives.jsx";
import "./CreateFamilyModal/createFamilyModal.css";
import "./CreateFamilyModal/createFamilyModaldesktop.css";
import "./CreateFamilyModal/createFamilyModalmobile.css";

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
        <UniversalModal
            isOpen={isOpen}
            onClose={onClose}
            overlayClassName="modalOverlay"
            dialogClassName="modalCard"
        >
            <ModalHeader
                title="Create your family"
                subtitle="Pick a name so everyone knows this shared space."
                onClose={onClose}
                className="modalHeader"
                titleClassName="modalTitle"
                subtitleClassName="modalSubtitle text-medium"
                closeButtonClassName="modalClose"
            />

            <form className="modalBody universalModal__body" onSubmit={handleSubmit}>
                <ModalField label="Family name" className="modalField">
                    <input
                        className="universalModal__input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="The Nguyen family"
                        maxLength={120}
                        disabled={saving}
                        autoFocus
                    />
                </ModalField>

                {error && <div className="modalError">{error}</div>}

                <ModalActions className="modalActions">
                    <button
                        type="button"
                        className="btn-secondary medium universalModal__button universalModal__button--ghost"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="addButton medium universalModal__button"
                        disabled={saving || !name.trim()}
                    >
                        {saving ? "Creating..." : "Create family"}
                    </button>
                </ModalActions>
            </form>
        </UniversalModal>
    );
}

export default CreateFamilyModal;

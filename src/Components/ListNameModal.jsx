import { useEffect, useState } from "react";
import UniversalModal from "./UniversalModal/UniversalModal.jsx";
import { ModalActions, ModalHeader } from "./UniversalModal/ModalPrimitives.jsx";
import "./ListNameModal/listNameModal.css";
import "./ListNameModal/listNameModaldesktop.css";
import "./ListNameModal/listNameModalmobile.css";

export default function ListNameModal({
    isOpen,
    title,
    confirmLabel,
    initialValue,
    showParticipants = false,
    familyMembers = [],
    selectedParticipantIds = [],
    participantsDropdownOpen = false,
    selectedParticipantLabel = "Family",
    onToggleParticipantsDropdown,
    onToggleParticipant,
    onCancel,
    onConfirm,
}) {
    const [value, setValue] = useState(initialValue || "");

    useEffect(() => {
        if (!isOpen) return;
        setValue(initialValue || "");
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    function handleSubmit(e) {
        e.preventDefault();
        onConfirm(value);
    }

    return (
        <UniversalModal
            isOpen={isOpen}
            onClose={onCancel}
            overlayClassName="listNameModal__backdrop"
            dialogClassName="listNameModal"
        >
            <ModalHeader
                title={title}
                subtitle="Name your list and confirm changes."
                onClose={onCancel}
                className="listNameModal__header"
                titleAs="div"
                titleClassName="listNameModal__title"
                subtitleClassName="text-medium"
                closeButtonClassName="listNameModal__close"
            />

            <form className="listNameModal__form universalModal__body" onSubmit={handleSubmit}>
                <input
                    className="listNameModal__input universalModal__input"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="e.g. Home"
                    autoFocus
                />

                {showParticipants ? (
                    <div className="listNameModal__participants">
                        <span className="listNameModal__participantsLabel">Participants</span>
                        <button
                            type="button"
                            className="listNameModalParticipants__trigger"
                            onClick={onToggleParticipantsDropdown}
                        >
                            {selectedParticipantLabel}
                        </button>

                        {participantsDropdownOpen ? (
                            <div className="listNameModalParticipants__menu">
                                {familyMembers.length === 0 ? (
                                    <p className="listNameModalParticipants__empty text-medium">
                                        No family members available
                                    </p>
                                ) : (
                                    familyMembers.map((member) => {
                                        const isSelected = selectedParticipantIds.includes(member.id);

                                        return (
                                            <label
                                                key={member.id}
                                                className="listNameModalParticipants__option"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => onToggleParticipant(member.id)}
                                                />
                                                <span>{member.name}</span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <ModalActions className="listNameModal__actions">
                    <button
                        type="button"
                        className="btn-secondary medium universalModal__button universalModal__button--ghost"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="addButton medium universalModal__button"
                    >
                        {confirmLabel}
                    </button>
                </ModalActions>
            </form>
        </UniversalModal>
    );
}
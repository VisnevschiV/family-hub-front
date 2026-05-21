import { useEffect, useState } from "react";
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
        <div
            className="listNameModal__backdrop"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div className="listNameModal">
                <div className="listNameModal__title">{title}</div>

                <form className="listNameModal__form" onSubmit={handleSubmit}>
                    <input
                        className="listNameModal__input"
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

                    <div className="listNameModal__actions">
                        <button
                            type="button"
                            className="listNameModal__btn listNameModal__btn--ghost"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="listNameModal__btn listNameModal__btn--primary"
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
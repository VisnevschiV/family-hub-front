import { useEffect, useState } from "react";
import "./ListNameModal.css";

export default function ListNameModal({
    isOpen,
    title,
    confirmLabel,
    initialValue,
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
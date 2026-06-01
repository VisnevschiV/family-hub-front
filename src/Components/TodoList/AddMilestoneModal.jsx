export default function AddMilestoneModal({
    isOpen,
    isCollapsed,
    onClose,
    onSubmit,
    value,
    onChange,
    title = "New milestone",
    placeholder = "e.g. Buy milk this evening",
    cancelLabel = "Cancel",
    submitLabel = "Add",
}) {
    if (!isOpen || isCollapsed) return null;

    return (
        <div
            className="todoList__modalBackdrop"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="todoList__modal">
                <div className="todoList__modalTitle">{title}</div>

                <form
                    className="todoList__modalForm"
                    onSubmit={onSubmit}
                >
                    <input
                        className="todoList__modalInput"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        autoFocus
                    />

                    <div className="todoList__modalActions">
                        <button
                            type="button"
                            className="todoList__modalBtn todoList__modalBtn--ghost"
                            onClick={onClose}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="submit"
                            className="todoList__modalBtn todoList__modalBtn--primary"
                        >
                            {submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
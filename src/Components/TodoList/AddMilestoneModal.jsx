import UniversalModal from "../UniversalModal/UniversalModal.jsx";
import { ModalActions, ModalHeader } from "../UniversalModal/ModalPrimitives.jsx";

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
        <UniversalModal
            isOpen={isOpen}
            onClose={onClose}
            overlayClassName="todoList__modalBackdrop universalModal__addOverlay"
            dialogClassName="todoList__modal universalModal__addSurface"
        >
            <ModalHeader
                title={title}
                subtitle="Add a short task and save it."
                onClose={onClose}
                className="todoList__modalHeader"
                titleAs="div"
                titleClassName="todoList__modalTitle"
                subtitleClassName="text-medium"
                closeButtonClassName="todoList__modalClose"
            />

            <form
                className="todoList__modalForm universalModal__body"
                onSubmit={onSubmit}
            >
                <input
                    className="todoList__modalInput universalModal__input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoFocus
                />

                <ModalActions className="todoList__modalActions universalModal__addActions">
                    <button
                        type="button"
                        className="btn-secondary medium universalModal__button universalModal__button--ghost"
                        onClick={onClose}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="submit"
                        className="addButton medium universalModal__button"
                    >
                        {submitLabel}
                    </button>
                </ModalActions>
            </form>
        </UniversalModal>
    );
}
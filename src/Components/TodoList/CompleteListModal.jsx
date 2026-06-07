import UniversalModal from "../UniversalModal/UniversalModal.jsx";
import { ModalActions, ModalHeader } from "../UniversalModal/ModalPrimitives.jsx";

export default function CompleteListModal({
    isOpen,
    title,
    completionPercent,
    doneCount,
    totalCount,
    pendingCount,
    isSubmitting,
    isCelebrating,
    onCancel,
    onConfirm,
}) {
    if (!isOpen) return null;

    const subtitle = completionPercent >= 100
        ? `All tasks complete (${doneCount}/${totalCount}). Ready to mark this priorities list as done?`
        : `You have ${pendingCount} task${pendingCount === 1 ? "" : "s"} left (${doneCount}/${totalCount} complete).`;

    return (
        <UniversalModal
            isOpen={isOpen}
            onClose={isSubmitting ? undefined : onCancel}
            overlayClassName="todoList__modalBackdrop"
            dialogClassName="todoList__modal todoList__completeModal"
            closeOnBackdrop={!isSubmitting}
            closeOnEscape={!isSubmitting}
        >
            <ModalHeader
                title="Complete priorities list"
                subtitle={subtitle}
                className="todoList__modalHeader"
                titleAs="div"
                titleClassName="todoList__modalTitle"
                subtitleClassName="text-medium"
            />

            <div className="todoList__completeModalBody universalModal__body">
                <div className="todoList__completeModalName" aria-label="Selected priorities list">
                    {title}
                </div>

                {isCelebrating ? (
                    <div className="todoList__completionConfetti" aria-hidden="true">
                        {Array.from({ length: 12 }).map((_, index) => (
                            <span
                                key={index}
                                className="todoList__completionConfettiPiece"
                                style={{ "--confetti-index": index }}
                            />
                        ))}
                    </div>
                ) : null}

                <ModalActions className="todoList__modalActions">
                    <button
                        type="button"
                        className="btn-secondary medium universalModal__button universalModal__button--ghost"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={`addButton medium universalModal__button todoList__completeConfirmBtn ${isCelebrating ? "todoList__completeConfirmBtn--celebrating" : ""}`.trim()}
                        onClick={onConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Completing..." : "Complete list"}
                    </button>
                </ModalActions>
            </div>
        </UniversalModal>
    );
}

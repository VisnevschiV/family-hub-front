import { useEffect, useRef, useState } from "react";
import "./universalModal.css";

export default function UniversalModal({
    isOpen,
    onClose,
    children,
    dialogClassName = "",
    overlayClassName = "",
    closeOnBackdrop = true,
    closeOnEscape = true,
    ariaLabelledBy,
    ariaDescribedBy,
}) {
    const dialogRef = useRef(null);
    const [visualViewportHeight, setVisualViewportHeight] = useState(null);

    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose?.();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, closeOnEscape, onClose]);

    useEffect(() => {
        if (!isOpen) return;

        const visualViewport = window.visualViewport;
        if (!visualViewport) {
            setVisualViewportHeight(null);
            return;
        }

        const updateViewportHeight = () => {
            setVisualViewportHeight(Math.round(visualViewport.height));
        };

        updateViewportHeight();
        visualViewport.addEventListener("resize", updateViewportHeight);
        visualViewport.addEventListener("scroll", updateViewportHeight);

        return () => {
            visualViewport.removeEventListener("resize", updateViewportHeight);
            visualViewport.removeEventListener("scroll", updateViewportHeight);
            setVisualViewportHeight(null);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const dialogElement = dialogRef.current;
        if (!dialogElement) return;

        const onFocusIn = (event) => {
            if (!window.matchMedia("(max-width: 768px)").matches) return;

            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const isEditable = target.matches("input, textarea, select, [contenteditable='true']");
            if (!isEditable) return;

            window.requestAnimationFrame(() => {
                target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            });
        };

        dialogElement.addEventListener("focusin", onFocusIn);

        return () => {
            dialogElement.removeEventListener("focusin", onFocusIn);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayMouseDown = (event) => {
        if (!closeOnBackdrop) return;
        if (event.target === event.currentTarget) {
            onClose?.();
        }
    };

    return (
        <div
            className={`universalModal__overlay ${overlayClassName}`.trim()}
            onMouseDown={handleOverlayMouseDown}
            style={
                visualViewportHeight
                    ? { "--universal-modal-viewport-height": `${visualViewportHeight}px` }
                    : undefined
            }
        >
            <div
                className={`universalModal__dialog universalModal__panel ${dialogClassName}`.trim()}
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={ariaLabelledBy}
                aria-describedby={ariaDescribedBy}
            >
                {children}
            </div>
        </div>
    );
}

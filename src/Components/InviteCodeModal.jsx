import { useEffect, useState } from "react";
import UniversalModal from "./UniversalModal/UniversalModal.jsx";
import { ModalHeader } from "./UniversalModal/ModalPrimitives.jsx";
import "./InviteCodeModal/inviteCodeModal.css";
import "./InviteCodeModal/inviteCodeModaldesktop.css";
import "./InviteCodeModal/inviteCodeModalmobile.css";

function InviteCodeModal({ isOpen, onClose, code, expiresAt }) {
    const [timeLeft, setTimeLeft] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen || !expiresAt) return;

        function updateTimer() {
            const now = new Date();
            const expireTime = new Date(expiresAt);
            const diff = expireTime - now;

            if (diff <= 0) {
                setTimeLeft("Expired");
                return;
            }

            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            const hours = Math.floor(diff / 1000 / 60 / 60);

            if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m`);
            } else if (minutes > 0) {
                setTimeLeft(`${minutes}m ${seconds}s`);
            } else {
                setTimeLeft(`${seconds}s`);
            }
        }

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [isOpen, expiresAt]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <UniversalModal
            isOpen={isOpen}
            onClose={onClose}
            overlayClassName="modalOverlay"
            dialogClassName="modalCard"
        >
            <ModalHeader
                title="Family invitation code"
                subtitle="Share this code with family members to let them join."
                onClose={onClose}
                className="modalHeader"
                titleClassName="modalTitle"
                subtitleClassName="modalSubtitle text-medium"
                closeButtonClassName="modalClose"
            />

            <div className="modalBody universalModal__body">
                <div className="codeContainer">
                    <div className="codeDisplay">{code}</div>
                    <button
                        type="button"
                        className="copyButton universalModal__button"
                        onClick={handleCopy}
                    >
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>

                <div className="timerContainer">
                    <div className="timerLabel">Expires in</div>
                    <div className={`timerValue ${timeLeft === "Expired" ? "expired" : ""}`}>
                        {timeLeft}
                    </div>
                </div>

                <button
                    type="button"
                    className="modalButton universalModal__button"
                    onClick={onClose}
                >
                    Done
                </button>
            </div>
        </UniversalModal>
    );
}

export default InviteCodeModal;

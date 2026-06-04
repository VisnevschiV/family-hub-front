import { useEffect, useState } from "react";
import UniversalModal from "./UniversalModal/UniversalModal.jsx";
import { ModalActions, ModalField, ModalHeader } from "./UniversalModal/ModalPrimitives.jsx";
import "./BudgetModal/budgetModal.css";
import "./BudgetModal/budgetModaldesktop.css";
import "./BudgetModal/budgetModalmobile.css";

const COMMON_CURRENCIES = [
    { code: "USD", label: "USD - US Dollar" },
    { code: "EUR", label: "EUR - Euro" },
    { code: "GBP", label: "GBP - British Pound" },
    { code: "JPY", label: "JPY - Japanese Yen" },
    { code: "AUD", label: "AUD - Australian Dollar" },
    { code: "CAD", label: "CAD - Canadian Dollar" },
    { code: "CHF", label: "CHF - Swiss Franc" },
    { code: "CNY", label: "CNY - Chinese Yuan" },
    { code: "SEK", label: "SEK - Swedish Krona" },
    { code: "NZD", label: "NZD - New Zealand Dollar" },
];

export default function BudgetModal({
    isOpen,
    mode,
    budget,
    onClose,
    onSubmit,
    isLoading,
}) {
    const [name, setName] = useState(budget?.name || "");
    const [currency, setCurrency] = useState(budget?.currencyISOCode || "USD");

    useEffect(() => {
        if (!isOpen) return;

        if (mode === "edit" && budget) {
            setName(budget.name || "");
            setCurrency(budget.currencyISOCode || "USD");
            return;
        }

        setName("");
        setCurrency("USD");
    }, [isOpen, mode, budget]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            alert("Please enter a budget name");
            return;
        }
        onSubmit({
            name: name.trim(),
            currencyISOCode: currency,
        });
    };

    const title = mode === "add" ? "Create Budget" : "Edit Budget";

    return (
        <UniversalModal
            isOpen={isOpen}
            onClose={onClose}
            overlayClassName="modal-overlay universalModal__addOverlay"
            dialogClassName="modal-content budget-modal universalModal__addSurface"
        >
            <ModalHeader
                title={title}
                subtitle="Set the budget name and currency."
                onClose={onClose}
                className="modal-header"
                subtitleClassName="text-medium"
                closeButtonClassName="close-button"
            />

            <form className="universalModal__body" onSubmit={handleSubmit}>
                <ModalField label="Budget Name" htmlFor="budget-name" className="form-group">
                    <input
                        className="universalModal__input"
                        id="budget-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Monthly Budget, Emergency Fund"
                        disabled={isLoading}
                        autoFocus
                    />
                </ModalField>

                <ModalField label="Currency" htmlFor="budget-currency" className="form-group">
                    <select
                        className="universalModal__select"
                        id="budget-currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        disabled={isLoading}
                    >
                        {COMMON_CURRENCIES.map((curr) => (
                            <option key={curr.code} value={curr.code}>
                                {curr.label}
                            </option>
                        ))}
                    </select>
                </ModalField>

                <ModalActions className="modal-buttons universalModal__addActions">
                    <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary medium universalModal__button universalModal__button--ghost">
                        Cancel
                    </button>
                    <button type="submit" disabled={isLoading} className="addButton medium universalModal__button">
                        {isLoading ? "Saving..." : mode === "add" ? "Create" : "Update"}
                    </button>
                </ModalActions>
            </form>
        </UniversalModal>
    );
}

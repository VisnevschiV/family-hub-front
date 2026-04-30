import { useEffect, useState } from "react";
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content budget-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="close-button" onClick={onClose} disabled={isLoading}>
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="budget-name">Budget Name</label>
                        <input
                            id="budget-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Monthly Budget, Emergency Fund"
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="budget-currency">Currency</label>
                        <select
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
                    </div>

                    <div className="modal-buttons">
                        <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="btn-primary">
                            {isLoading ? "Saving..." : mode === "add" ? "Create" : "Update"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

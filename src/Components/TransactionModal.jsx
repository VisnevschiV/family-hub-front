import { useEffect, useState } from "react";
import "./TransactionModal/transactionModal.css";
import "./TransactionModal/transactionModaldesktop.css";
import "./TransactionModal/transactionModalmobile.css";

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

export default function TransactionModal({
    isOpen,
    mode,
    transaction,
    budgetCurrency,
    onClose,
    onSubmit,
    isLoading,
}) {
    const [description, setDescription] = useState(transaction?.description || "");
    const [currencyISOCode, setCurrencyISOCode] = useState(transaction?.currencyISOCode || budgetCurrency || "USD");
    const [amount, setAmount] = useState(transaction?.amount || "");

    useEffect(() => {
        if (!isOpen) return;

        if (mode === "edit" && transaction) {
            setDescription(transaction.description || "");
            setCurrencyISOCode(transaction.currencyISOCode || budgetCurrency || "USD");
            setAmount(transaction.amount ?? "");
            return;
        }

        setDescription("");
        setCurrencyISOCode(budgetCurrency || "USD");
        setAmount("");
    }, [isOpen, mode, transaction, budgetCurrency]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!description.trim()) {
            alert("Please enter a description");
            return;
        }
        if (!amount || isNaN(parseFloat(amount))) {
            alert("Please enter a valid amount");
            return;
        }
        onSubmit({
            description: description.trim(),
            currencyISOCode,
            amount: parseFloat(amount),
        });
    };

    const title = mode === "add" ? "Add Transaction" : "Edit Transaction";

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content transaction-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="close-button" onClick={onClose} disabled={isLoading}>
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="transaction-description">Description</label>
                        <input
                            id="transaction-description"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Grocery shopping, Gas"
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="transaction-amount">Amount</label>
                            <input
                                id="transaction-amount"
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="transaction-currency">Currency</label>
                            <select
                                id="transaction-currency"
                                value={currencyISOCode}
                                onChange={(e) => setCurrencyISOCode(e.target.value)}
                                disabled={isLoading}
                            >
                                {COMMON_CURRENCIES.map((curr) => (
                                    <option key={curr.code} value={curr.code}>
                                        {curr.code}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="modal-buttons">
                        <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="btn-primary">
                            {isLoading ? "Saving..." : mode === "add" ? "Add" : "Update"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

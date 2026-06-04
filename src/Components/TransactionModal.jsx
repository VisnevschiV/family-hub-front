import { useEffect, useState } from "react";
import UniversalModal from "./UniversalModal/UniversalModal.jsx";
import { ModalActions, ModalField, ModalHeader } from "./UniversalModal/ModalPrimitives.jsx";
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
        <UniversalModal
            isOpen={isOpen}
            onClose={onClose}
            overlayClassName="modal-overlay universalModal__addOverlay"
            dialogClassName="modal-content transaction-modal universalModal__addSurface"
        >
            <ModalHeader
                title={title}
                subtitle="Fill in details for this transaction."
                onClose={onClose}
                className="modal-header"
                subtitleClassName="text-medium"
                closeButtonClassName="close-button"
            />

            <form className="universalModal__body" onSubmit={handleSubmit}>
                <ModalField label="Description" htmlFor="transaction-description" className="form-group">
                    <input
                        className="universalModal__input"
                        id="transaction-description"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Grocery shopping, Gas"
                        disabled={isLoading}
                        autoFocus
                    />
                </ModalField>

                <div className="form-row">
                    <ModalField label="Amount" htmlFor="transaction-amount" className="form-group">
                        <input
                            className="universalModal__input"
                            id="transaction-amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            disabled={isLoading}
                        />
                    </ModalField>

                    <ModalField label="Currency" htmlFor="transaction-currency" className="form-group">
                        <select
                            className="universalModal__select"
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
                    </ModalField>
                </div>

                <ModalActions className="modal-buttons universalModal__addActions">
                    <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary medium universalModal__button universalModal__button--ghost">
                        Cancel
                    </button>
                    <button type="submit" disabled={isLoading} className="addButton medium universalModal__button">
                        {isLoading ? "Saving..." : mode === "add" ? "Add" : "Update"}
                    </button>
                </ModalActions>
            </form>
        </UniversalModal>
    );
}

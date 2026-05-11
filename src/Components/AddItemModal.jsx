import { useEffect, useState } from "react";
import SegmentedControl from "./SegmentedControl.jsx";
import "./AddItemModal/addItemModal.css";

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

export default function AddItemModal({
    isOpen,
    onClose,
    onSubmit,
    isLoading,
    budgetCurrency,
}) {
    const [itemType, setItemType] = useState("transaction");
    const [flowType, setFlowType] = useState("expense");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [currencyISOCode, setCurrencyISOCode] = useState(budgetCurrency || "USD");

    useEffect(() => {
        if (!isOpen) return;

        setItemType("transaction");
        setFlowType("expense");
        setName("");
        setDescription("");
        setAmount("");
        setCurrencyISOCode(budgetCurrency || "USD");
    }, [isOpen, budgetCurrency]);

    if (!isOpen) return null;

    const handleSubmit = (event) => {
        event.preventDefault();

        if (itemType === "budget") {
            if (!name.trim()) {
                alert("Please enter a budget name");
                return;
            }

            onSubmit({
                itemType,
                name: name.trim(),
                currencyISOCode,
            });
            return;
        }

        if (!description.trim()) {
            alert("Please enter a description");
            return;
        }

        if (!amount || Number.isNaN(parseFloat(amount))) {
            alert("Please enter a valid amount");
            return;
        }

        onSubmit({
            itemType,
            flowType,
            description: description.trim(),
            amount: Math.abs(parseFloat(amount)),
            currencyISOCode,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content addItem-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add</h2>
                    <button className="close-button" onClick={onClose} disabled={isLoading}>
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={`addItem-modal__toggleRow ${isLoading ? "addItem-modal__toggleRow--disabled" : ""}`}>
                        <SegmentedControl
                            options={["Budget", "Transaction"]}
                            value={itemType === "budget" ? "Budget" : "Transaction"}
                            onChange={(value) => {
                                if (isLoading) return;
                                setItemType(value === "Budget" ? "budget" : "transaction");
                            }}
                        />
                    </div>

                    {itemType === "transaction" && (
                        <div className={`addItem-modal__toggleRow addItem-modal__toggleRow--spaced addItem-modal__toggleRow--flow addItem-modal__toggleRow--flow-${flowType} ${isLoading ? "addItem-modal__toggleRow--disabled" : ""}`}>
                            <SegmentedControl
                                options={["Expense", "Income"]}
                                value={flowType === "expense" ? "Expense" : "Income"}
                                onChange={(value) => {
                                    if (isLoading) return;
                                    setFlowType(value === "Expense" ? "expense" : "income");
                                }}
                            />
                        </div>
                    )}

                    {itemType === "budget" ? (
                        <>
                            <div className="form-group">
                                <label htmlFor="add-budget-name">Budget Name</label>
                                <input
                                    id="add-budget-name"
                                    type="text"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="e.g., Emergency Fund"
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="add-budget-currency">Currency</label>
                                <select
                                    id="add-budget-currency"
                                    value={currencyISOCode}
                                    onChange={(event) => setCurrencyISOCode(event.target.value)}
                                    disabled={isLoading}
                                >
                                    {COMMON_CURRENCIES.map((currency) => (
                                        <option key={currency.code} value={currency.code}>
                                            {currency.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label htmlFor="add-transaction-description">Description</label>
                                <input
                                    id="add-transaction-description"
                                    type="text"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    placeholder="e.g., Grocery shopping"
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="add-transaction-amount">Amount</label>
                                    <input
                                        id="add-transaction-amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={amount}
                                        onChange={(event) => setAmount(event.target.value)}
                                        placeholder="0.00"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="add-transaction-currency">Currency</label>
                                    <select
                                        id="add-transaction-currency"
                                        value={currencyISOCode}
                                        onChange={(event) => setCurrencyISOCode(event.target.value)}
                                        disabled={isLoading}
                                    >
                                        {COMMON_CURRENCIES.map((currency) => (
                                            <option key={currency.code} value={currency.code}>
                                                {currency.code}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="modal-buttons">
                        <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="btn-primary">
                            {isLoading ? "Saving..." : "Add"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

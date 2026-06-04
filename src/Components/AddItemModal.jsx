import { useEffect, useState } from "react";
import SegmentedControl from "./SegmentedControl.jsx";
import UniversalModal from "./UniversalModal/UniversalModal.jsx";
import { ModalActions, ModalField, ModalHeader } from "./UniversalModal/ModalPrimitives.jsx";
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
        <UniversalModal
            isOpen={isOpen}
            onClose={onClose}
            overlayClassName="modal-overlay universalModal__addOverlay"
            dialogClassName="modal-content addItem-modal universalModal__addSurface"
        >
            <ModalHeader
                title="Add"
                subtitle="Choose what you want to add and complete the form."
                onClose={onClose}
                className="modal-header"
                subtitleClassName="text-medium"
                closeButtonClassName="close-button"
            />

            <form className="universalModal__body" onSubmit={handleSubmit}>
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
                        <ModalField label="Budget Name" htmlFor="add-budget-name" className="form-group">
                            <input
                                className="universalModal__input"
                                id="add-budget-name"
                                type="text"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="e.g., Emergency Fund"
                                disabled={isLoading}
                                autoFocus
                            />
                        </ModalField>

                        <ModalField label="Currency" htmlFor="add-budget-currency" className="form-group">
                            <select
                                className="universalModal__select"
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
                        </ModalField>
                    </>
                ) : (
                    <>
                        <ModalField label="Description" htmlFor="add-transaction-description" className="form-group">
                            <input
                                className="universalModal__input"
                                id="add-transaction-description"
                                type="text"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder="e.g., Grocery shopping"
                                disabled={isLoading}
                                autoFocus
                            />
                        </ModalField>

                        <div className="form-row">
                            <ModalField label="Amount" htmlFor="add-transaction-amount" className="form-group">
                                <input
                                    className="universalModal__input"
                                    id="add-transaction-amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    placeholder="0.00"
                                    disabled={isLoading}
                                />
                            </ModalField>

                            <ModalField label="Currency" htmlFor="add-transaction-currency" className="form-group">
                                <select
                                    className="universalModal__select"
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
                            </ModalField>
                        </div>
                    </>
                )}

                <ModalActions className="modal-buttons universalModal__addActions">
                    <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary medium universalModal__button universalModal__button--ghost">
                        Cancel
                    </button>
                    <button type="submit" disabled={isLoading} className="addButton medium universalModal__button">
                        {isLoading ? "Saving..." : "Add"}
                    </button>
                </ModalActions>
            </form>
        </UniversalModal>
    );
}

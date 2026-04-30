import { useEffect, useMemo, useState } from "react";
import BudgetModal from "../../Components/BudgetModal.jsx";
import TransactionModal from "../../Components/TransactionModal.jsx";
import {
    getBudget,
    createBudget,
    modifyBudget,
    addTransaction,
    modifyTransaction,
    deleteTransaction,
} from "../../api/budget.js";
import "./BudgetPage/budgetPage.css";
import "./BudgetPage/budgetPagedesktop.css";
import "./BudgetPage/budgetPagemobile.css";

export default function BudgetPage() {
    const [budget, setBudget] = useState(null);
    const [budgetPath, setBudgetPath] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Budget modal state
    const [budgetModal, setBudgetModal] = useState({
        isOpen: false,
        mode: "add",
    });

    // Transaction modal state
    const [transactionModal, setTransactionModal] = useState({
        isOpen: false,
        mode: "add",
        transactionId: null,
    });

    // Load budget on mount
    useEffect(() => {
        loadBudget();
    }, []);

    async function loadBudget() {
        try {
            setLoading(true);
            setError(null);
            const data = await getBudget();
            setBudget(data);
        } catch (err) {
            setError(err.message || "Failed to load budget");
            console.error("Error loading budget:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateBudget(data) {
        try {
            setError(null);
            const parentBudgetId = activeBudget?.id || null;
            await createBudget(data.name, data.currencyISOCode, parentBudgetId);
            await loadBudget();
            setBudgetModal({ isOpen: false, mode: "add" });
        } catch (err) {
            setError(err.message || "Failed to create budget");
            console.error("Error creating budget:", err);
        }
    }

    async function handleModifyBudget(data) {
        try {
            setError(null);
            const updatedBudget = await modifyBudget(activeBudget.id, data.name, data.currencyISOCode);
            setBudget(updatedBudget);
            setBudgetModal({ isOpen: false, mode: "add" });
        } catch (err) {
            setError(err.message || "Failed to update budget");
            console.error("Error updating budget:", err);
        }
    }

    function openEditBudgetModal() {
        setBudgetModal({
            isOpen: true,
            mode: "edit",
        });
    }

    function closeBudgetModal() {
        setBudgetModal({ isOpen: false, mode: "add" });
    }

    async function handleAddTransaction(data) {
        try {
            setError(null);
            const updatedBudget = await addTransaction(
                activeBudget.id,
                data.description,
                data.amount,
                data.currencyISOCode
            );
            setBudget(updatedBudget);
            setTransactionModal({ isOpen: false, mode: "add", transactionId: null });
        } catch (err) {
            setError(err.message || "Failed to add transaction");
            console.error("Error adding transaction:", err);
        }
    }

    async function handleModifyTransaction(data) {
        try {
            setError(null);
            const updatedBudget = await modifyTransaction(
                activeBudget.id,
                transactionModal.transactionId,
                data.description,
                data.amount,
                data.currencyISOCode
            );
            setBudget(updatedBudget);
            setTransactionModal({ isOpen: false, mode: "add", transactionId: null });
        } catch (err) {
            setError(err.message || "Failed to update transaction");
            console.error("Error updating transaction:", err);
        }
    }

    function openAddTransactionModal() {
        setTransactionModal({
            isOpen: true,
            mode: "add",
            transactionId: null,
        });
    }

    function openEditTransactionModal(transactionId) {
        setTransactionModal({
            isOpen: true,
            mode: "edit",
            transactionId,
        });
    }

    function closeTransactionModal() {
        setTransactionModal({
            isOpen: false,
            mode: "add",
            transactionId: null,
        });
    }

    async function handleDeleteTransaction(transactionId) {
        if (!window.confirm("Are you sure you want to delete this transaction?")) {
            return;
        }

        try {
            setError(null);
            const updatedBudget = await deleteTransaction(activeBudget.id, transactionId);
            setBudget(updatedBudget);
        } catch (err) {
            setError(err.message || "Failed to delete transaction");
            console.error("Error deleting transaction:", err);
        }
    }

    const getBudgetChildren = (budgetNode) => {
        const candidates =
            budgetNode?.subBudgets ||
            budgetNode?.subBudgetList ||
            budgetNode?.children ||
            budgetNode?.budgets ||
            [];

        return Array.isArray(candidates) ? candidates : [];
    };

    const getBudgetTransactions = (budgetNode) => {
        const candidates =
            budgetNode?.transactions ||
            budgetNode?.transactionList ||
            budgetNode?.items ||
            [];

        return Array.isArray(candidates) ? candidates : [];
    };

    const roundCurrencyAmount = (value) => {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    };

    const addToCurrencyTotals = (totals, currency, amount) => {
        if (!currency || Number.isNaN(amount)) return;
        totals[currency] = roundCurrencyAmount((totals[currency] || 0) + amount);
    };

    const mergeCurrencyTotals = (baseTotals, incomingTotals) => {
        const merged = { ...baseTotals };
        Object.entries(incomingTotals).forEach(([currency, amount]) => {
            addToCurrencyTotals(merged, currency, amount);
        });
        return merged;
    };

    const computeBudgetCurrencyTotals = (budgetNode) => {
        if (!budgetNode) return {};

        const totals = {};

        getBudgetTransactions(budgetNode).forEach((transaction) => {
            const currency = transaction?.currencyISOCode || budgetNode.currencyISOCode;
            const rawAmount =
                typeof transaction?.amount === "string"
                    ? parseFloat(transaction.amount)
                    : transaction?.amount;
            const amount = Number(rawAmount);
            addToCurrencyTotals(totals, currency, amount);
        });

        getBudgetChildren(budgetNode).forEach((childBudget) => {
            const childTotals = computeBudgetCurrencyTotals(childBudget);
            Object.assign(totals, mergeCurrencyTotals(totals, childTotals));
        });

        return totals;
    };

    const formatCurrencyTotals = (totals, primaryCurrency) => {
        const entries = Object.entries(totals)
            .filter(([, amount]) => Number.isFinite(amount))
            .sort(([a], [b]) => {
                if (a === primaryCurrency) return -1;
                if (b === primaryCurrency) return 1;
                return a.localeCompare(b);
            });

        if (entries.length === 0) {
            return `0.00 ${primaryCurrency || ""}`.trim();
        }

        return entries
            .map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`)
            .join(" + ");
    };

    const activeBudget = useMemo(() => {
        if (!budget) return null;

        let currentBudget = budget;

        for (const budgetId of budgetPath) {
            const nextBudget = getBudgetChildren(currentBudget).find((child) => child.id === budgetId);
            if (!nextBudget) {
                return currentBudget;
            }
            currentBudget = nextBudget;
        }

        return currentBudget;
    }, [budget, budgetPath]);

    const currentTransaction = useMemo(() => {
        if (transactionModal.mode === "edit" && activeBudget?.transactions) {
            return activeBudget.transactions.find((t) => t.id === transactionModal.transactionId);
        }
        return null;
    }, [transactionModal, activeBudget]);

    const subBudgets = useMemo(() => getBudgetChildren(activeBudget), [activeBudget]);

    const budgetBreadcrumb = useMemo(() => {
        if (!budget) return [];

        const names = [budget.name || "Budget"];
        let currentBudget = budget;

        for (const budgetId of budgetPath) {
            const nextBudget = getBudgetChildren(currentBudget).find((child) => child.id === budgetId);
            if (!nextBudget) break;
            names.push(nextBudget.name || "Unnamed Sub-budget");
            currentBudget = nextBudget;
        }

        return names;
    }, [budget, budgetPath]);

    const activeBudgetCurrencyTotals = useMemo(() => {
        return computeBudgetCurrencyTotals(activeBudget);
    }, [activeBudget]);

    const activeBudgetTotalLabel = useMemo(() => {
        return formatCurrencyTotals(activeBudgetCurrencyTotals, activeBudget?.currencyISOCode);
    }, [activeBudgetCurrencyTotals, activeBudget]);

    function openSubBudget(subBudgetId) {
        setBudgetPath((currentPath) => [...currentPath, subBudgetId]);
    }

    function goBackToParentBudget() {
        setBudgetPath((currentPath) => currentPath.slice(0, -1));
    }

    if (loading) {
        return (
            <div className="budget-page">
                <div className="loading">Loading your budget...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="budget-page">
                <div className="error-message">
                    {error}
                    <button onClick={loadBudget} className="btn-retry">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!budget) {
        return (
            <div className="budget-page">
                <div className="no-budget">
                    <h2>No Budget Created Yet</h2>
                    <p>Get started by creating your first budget</p>
                    <button
                        onClick={() => setBudgetModal({ isOpen: true, mode: "add" })}
                        className="btn-primary btn-large"
                    >
                        Create Budget
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="budget-page">
            <div className="budget-header">
                <div className="budget-title-section">
                    <div className="budget-title-row">
                        {budgetPath.length > 0 && (
                            <button
                                type="button"
                                className="budget-back-button"
                                onClick={goBackToParentBudget}
                                title="Back to parent budget"
                                aria-label="Back to parent budget"
                            >
                                ←
                            </button>
                        )}
                        <div>
                            <h1>{activeBudget?.name}</h1>
                            <p className="currency-label">{activeBudget?.currencyISOCode}</p>
                        </div>
                    </div>
                    {budgetBreadcrumb.length > 1 && (
                        <p className="budget-breadcrumb">{budgetBreadcrumb.join(" / ")}</p>
                    )}
                </div>
                <div className="budget-header-actions">
                    <button
                        onClick={openEditBudgetModal}
                        className="btn-secondary btn-icon"
                        title="Edit budget"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => setBudgetModal({ isOpen: true, mode: "add" })}
                        className="btn-primary btn-icon"
                        title="Create new budget"
                    >
                        ➕
                    </button>
                </div>
            </div>

            <div className="budget-summary">
                <div className="summary-card">
                    <div className="summary-label">Total Amount</div>
                    <div className="summary-value">
                        {activeBudgetTotalLabel}
                    </div>
                    <div className="summary-count">
                        {subBudgets.length} sub-budget{subBudgets.length !== 1 ? "s" : ""} • {activeBudget?.transactions?.length || 0} transaction{(activeBudget?.transactions?.length || 0) !== 1 ? "s" : ""}
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)} className="close-button">
                        ×
                    </button>
                </div>
            )}

            <div className="transactions-section">
                <div className="section-header">
                    <h2>Sub-budgets & Transactions</h2>
                    <button
                        onClick={openAddTransactionModal}
                        className="btn-primary btn-add"
                    >
                        + Add Transaction
                    </button>
                </div>

                {subBudgets.length > 0 || (activeBudget?.transactions && activeBudget.transactions.length > 0) ? (
                    <div className="transactions-list">
                        {subBudgets.map((subBudget) => (
                            (() => {
                                const subBudgetTotals = computeBudgetCurrencyTotals(subBudget);
                                const subBudgetTotalLabel = formatCurrencyTotals(
                                    subBudgetTotals,
                                    subBudget.currencyISOCode || activeBudget.currencyISOCode
                                );

                                return (
                                    <button
                                        key={subBudget.id}
                                        type="button"
                                        className="transaction-item transaction-item--subBudget transaction-item--clickable"
                                        onClick={() => openSubBudget(subBudget.id)}
                                        title={`Open ${subBudget.name || "sub-budget"}`}
                                    >
                                        <div className="transaction-info">
                                            <div className="transaction-name">{subBudget.name || "Unnamed Sub-budget"}</div>
                                            <div className="transaction-currency">
                                                {subBudget.currencyISOCode || activeBudget.currencyISOCode}
                                            </div>
                                        </div>
                                        <div className="transaction-value">
                                            {subBudgetTotalLabel}
                                        </div>
                                        <div className="transaction-actions">
                                            <span className="subBudget-tag">Sub-budget</span>
                                            <span className="subBudget-chevron" aria-hidden="true">›</span>
                                        </div>
                                    </button>
                                );
                            })()
                        ))}

                        {getBudgetTransactions(activeBudget).map((transaction) => (
                            <div key={transaction.id} className="transaction-item">
                                <div className="transaction-info">
                                    <div className="transaction-name">{transaction.description}</div>
                                    <div className="transaction-currency">
                                        {transaction.currencyISOCode}
                                    </div>
                                </div>
                                <div className="transaction-value">
                                    {`${parseFloat(transaction.amount).toFixed(2)} ${transaction.currencyISOCode || activeBudget.currencyISOCode}`}
                                </div>
                                <div className="transaction-actions">
                                    <button
                                        onClick={() => openEditTransactionModal(transaction.id)}
                                        className="btn-icon btn-edit"
                                        title="Edit transaction"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTransaction(transaction.id)}
                                        className="btn-icon btn-delete"
                                        title="Delete transaction"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>No sub-budgets or transactions yet. Start tracking your finances!</p>
                    </div>
                )}
            </div>

            <BudgetModal
                isOpen={budgetModal.isOpen}
                mode={budgetModal.mode}
                budget={budgetModal.mode === "edit" ? activeBudget : null}
                onClose={closeBudgetModal}
                onSubmit={
                    budgetModal.mode === "add"
                        ? handleCreateBudget
                        : handleModifyBudget
                }
                isLoading={loading}
            />

            <TransactionModal
                isOpen={transactionModal.isOpen}
                mode={transactionModal.mode}
                transaction={currentTransaction}
                budgetCurrency={activeBudget.currencyISOCode}
                onClose={closeTransactionModal}
                onSubmit={
                    transactionModal.mode === "add"
                        ? handleAddTransaction
                        : handleModifyTransaction
                }
                isLoading={loading}
            />
        </div>
    );
}

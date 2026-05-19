import { useEffect, useMemo, useRef, useState } from "react";
import BudgetModal from "../../Components/BudgetModal.jsx";
import TransactionModal from "../../Components/TransactionModal.jsx";
import AddItemModal from "../../Components/AddItemModal.jsx";
import NoFamilyBanner from "../../Components/NoFamilyBanner.jsx";
import AddButton from "../../Components/AddButton.jsx";
import {
    getBudget,
    createBudget,
    modifyBudget,
    addTransaction,
    modifyTransaction,
    deleteBudget,
    deleteTransaction,
} from "../../api/budget.js";
import { fetchCurrentPersona } from "../../api/persona.js";
import { fetchExchangeRates, convertToBase } from "../../api/exchangeRates.js";
import "./BudgetPage/budgetPage.css";
import "./BudgetPage/budgetPagedesktop.css";
import "./BudgetPage/budgetPagemobile.css";

export default function BudgetPage() {
    const [budget, setBudget] = useState(null);
    const [budgetPath, setBudgetPath] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasFamily, setHasFamily] = useState(true);
    const [exchangeRates, setExchangeRates] = useState({});
    const [ratesLoading, setRatesLoading] = useState(false);

    // Budget modal state
    const [budgetModal, setBudgetModal] = useState({
        isOpen: false,
        mode: "add",
        targetBudgetId: null,
    });

    // Transaction modal state
    const [transactionModal, setTransactionModal] = useState({
        isOpen: false,
        mode: "add",
        transactionId: null,
    });
    const [addItemModalOpen, setAddItemModalOpen] = useState(false);
    const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);
    const [draggingItemKey, setDraggingItemKey] = useState(null);
    const [dragStartX, setDragStartX] = useState(null);
    const [deletePreviewItemKey, setDeletePreviewItemKey] = useState(null);
    const [deletingItemKey, setDeletingItemKey] = useState(null);
    const longPressTimerRef = useRef(null);
    const longPressTriggeredRef = useRef(false);
    const pointerSwipeRef = useRef({
        itemKey: null,
        itemType: null,
        itemId: null,
        pointerId: null,
        startX: 0,
        moved: false,
    });
    const suppressNextClickRef = useRef(false);

    // Check family membership on mount
    useEffect(() => {
        fetchCurrentPersona()
            .then((data) => setHasFamily(Boolean(data?.family)))
            .catch(() => setHasFamily(true));
    }, []);

    // Load budget on mount
    useEffect(() => {
        loadBudget();
    }, []);

    // Fetch exchange rates whenever the currently opened budget's base currency changes
    useEffect(() => {
        let currentBudget = budget;

        for (const budgetId of budgetPath) {
            const nextBudget = getBudgetChildren(currentBudget).find((child) => child.id === budgetId);
            if (!nextBudget) break;
            currentBudget = nextBudget;
        }

        const baseCurrency = currentBudget?.currencyISOCode;
        if (!baseCurrency) return;

        let active = true;
        setRatesLoading(true);

        fetchExchangeRates(baseCurrency)
            .then((rates) => { if (active) setExchangeRates(rates); })
            .catch(() => { /* silently fall back to raw multi-currency display */ })
            .finally(() => { if (active) setRatesLoading(false); });

        return () => { active = false; };
    }, [budget, budgetPath]);

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
            setBudgetModal({ isOpen: false, mode: "add", targetBudgetId: null });
        } catch (err) {
            setError(err.message || "Failed to create budget");
            console.error("Error creating budget:", err);
        }
    }

    async function handleModifyBudget(data) {
        try {
            setError(null);
            const budgetIdToModify = budgetModal.targetBudgetId || activeBudget?.id;
            const updatedBudget = await modifyBudget(budgetIdToModify, data.name, data.currencyISOCode);
            setBudget(updatedBudget);
            setBudgetModal({ isOpen: false, mode: "add", targetBudgetId: null });
        } catch (err) {
            setError(err.message || "Failed to update budget");
            console.error("Error updating budget:", err);
        }
    }

    function openEditBudgetModal() {
        setBudgetModal({
            isOpen: true,
            mode: "edit",
            targetBudgetId: activeBudget?.id || null,
        });
    }

    function openAddBudgetModal() {
        setBudgetModal({
            isOpen: true,
            mode: "add",
            targetBudgetId: null,
        });
    }

    function closeBudgetModal() {
        setBudgetModal({ isOpen: false, mode: "add", targetBudgetId: null });
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

    function openAddItemModal() {
        setAddItemModalOpen(true);
    }

    function closeAddItemModal() {
        if (isSubmittingQuickAdd) return;
        setAddItemModalOpen(false);
    }

    async function handleQuickAddSubmit(payload) {
        try {
            setIsSubmittingQuickAdd(true);
            setError(null);

            if (payload.itemType === "budget") {
                const parentBudgetId = activeBudget?.id || null;
                await createBudget(payload.name, payload.currencyISOCode, parentBudgetId);
            } else {
                const rawAmount = Number(payload.amount);
                const safeAmount = Number.isFinite(rawAmount) ? Math.abs(rawAmount) : 0;
                const signedAmount = payload.flowType === "income" ? safeAmount : -safeAmount;

                await addTransaction(
                    activeBudget.id,
                    payload.description,
                    signedAmount,
                    payload.currencyISOCode
                );
            }

            await loadBudget();
            setAddItemModalOpen(false);
        } catch (err) {
            setError(err.message || "Failed to add item");
            console.error("Error adding item:", err);
        } finally {
            setIsSubmittingQuickAdd(false);
        }
    }

    async function handleDeleteTransaction(transactionId) {
        try {
            setError(null);
            const updatedBudget = await deleteTransaction(activeBudget.id, transactionId);
            if (updatedBudget) {
                setBudget(updatedBudget);
            } else {
                await loadBudget();
            }
        } catch (err) {
            setError(err.message || "Failed to delete transaction");
            console.error("Error deleting transaction:", err);
        }
    }

    async function handleDeleteSubBudget(subBudgetId) {
        try {
            setError(null);
            await deleteBudget(subBudgetId);
            await loadBudget();
        } catch (err) {
            setError(err.message || "Failed to delete sub-budget");
            console.error("Error deleting sub-budget:", err);
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

    const findBudgetById = (budgetNode, budgetId) => {
        if (!budgetNode || !budgetId) return null;
        if (budgetNode.id === budgetId) return budgetNode;

        for (const child of getBudgetChildren(budgetNode)) {
            const found = findBudgetById(child, budgetId);
            if (found) return found;
        }

        return null;
    };

    const budgetBeingEdited = useMemo(() => {
        if (budgetModal.mode !== "edit") return null;
        const targetId = budgetModal.targetBudgetId || activeBudget?.id;
        return findBudgetById(budget, targetId);
    }, [budgetModal, budget, activeBudget]);

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

    /**
     * Sum of all transactions in the active budget (including sub-budgets),
     * converted to the root budget's base currency using live rates.
     */
    const convertedTotal = useMemo(() => {
        const base = activeBudget?.currencyISOCode;
        if (!base || Object.keys(exchangeRates).length === 0) return null;

        let total = 0;
        for (const [currency, amount] of Object.entries(activeBudgetCurrencyTotals)) {
            total += convertToBase(amount, currency, base, exchangeRates);
        }

        return { amount: Math.round((total + Number.EPSILON) * 100) / 100, currency: base };
    }, [activeBudgetCurrencyTotals, exchangeRates, activeBudget?.currencyISOCode]);

    function openSubBudget(subBudgetId) {
        setBudgetPath((currentPath) => [...currentPath, subBudgetId]);
    }

    function goBackToParentBudget() {
        setBudgetPath((currentPath) => currentPath.slice(0, -1));
    }

    useEffect(
        () => () => {
            if (longPressTimerRef.current) {
                window.clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
        },
        []
    );

    const EDIT_LONG_PRESS_MS = 420;
    const DELETE_THRESHOLD = 40;
    const DELETE_ANIMATION_MS = 300;

    function clearLongPressTimer() {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }

    function handleRowPointerDown(event, itemType, itemId, itemKey) {
        if (draggingItemKey || deletingItemKey) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        longPressTriggeredRef.current = false;
        suppressNextClickRef.current = false;
        clearLongPressTimer();

        pointerSwipeRef.current = {
            itemKey,
            itemType,
            itemId,
            pointerId: event.pointerId,
            startX: event.clientX,
            moved: false,
        };

        longPressTimerRef.current = window.setTimeout(() => {
            longPressTriggeredRef.current = true;

            if (itemType === "transaction") {
                openEditTransactionModal(itemId);
                return;
            }

            setBudgetModal({
                isOpen: true,
                mode: "edit",
                targetBudgetId: itemId,
            });
        }, EDIT_LONG_PRESS_MS);
    }

    function handleRowPointerMove(event, itemKey) {
        if (event.pointerType === "mouse") return;

        const swipeState = pointerSwipeRef.current;
        if (!swipeState || swipeState.pointerId !== event.pointerId || swipeState.itemKey !== itemKey) {
            return;
        }

        const deltaX = event.clientX - swipeState.startX;

        if (Math.abs(deltaX) > 8) {
            swipeState.moved = true;
            clearLongPressTimer();
        }

        if (deltaX < -DELETE_THRESHOLD) {
            setDeletePreviewItemKey(itemKey);
        } else if (deletePreviewItemKey === itemKey) {
            setDeletePreviewItemKey(null);
        }
    }

    function handleRowPointerEnd() {
        clearLongPressTimer();
    }

    function handleCurrentBudgetPointerDown(event) {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        longPressTriggeredRef.current = false;
        suppressNextClickRef.current = false;
        clearLongPressTimer();

        longPressTimerRef.current = window.setTimeout(() => {
            longPressTriggeredRef.current = true;
            openEditBudgetModal();
        }, EDIT_LONG_PRESS_MS);
    }

    function handleCurrentBudgetPointerUp() {
        clearLongPressTimer();
    }

    async function triggerDeleteWithAnimation(item) {
        const deletingKey = `${item.type}:${item.id}`;

        setDeletingItemKey(deletingKey);
        setDeletePreviewItemKey(null);
        setDraggingItemKey(null);
        setDragStartX(null);

        window.setTimeout(async () => {
            try {
                if (item.type === "transaction") {
                    await handleDeleteTransaction(item.id);
                } else {
                    await handleDeleteSubBudget(item.id);
                }
            } finally {
                setDeletingItemKey(null);
            }
        }, DELETE_ANIMATION_MS);
    }

    async function handleRowPointerUp(event, item) {
        const swipeState = pointerSwipeRef.current;
        const itemKey = `${item.type}:${item.id}`;

        if (
            event.pointerType !== "mouse" &&
            swipeState &&
            swipeState.pointerId === event.pointerId &&
            swipeState.itemKey === itemKey
        ) {
            const deltaX = event.clientX - swipeState.startX;

            if (deltaX < -DELETE_THRESHOLD) {
                suppressNextClickRef.current = true;
                pointerSwipeRef.current = {
                    itemKey: null,
                    itemType: null,
                    itemId: null,
                    pointerId: null,
                    startX: 0,
                    moved: false,
                };
                await triggerDeleteWithAnimation(item);
                handleRowPointerEnd();
                return;
            }

            if (swipeState.moved) {
                suppressNextClickRef.current = true;
            }
        }

        pointerSwipeRef.current = {
            itemKey: null,
            itemType: null,
            itemId: null,
            pointerId: null,
            startX: 0,
            moved: false,
        };
        handleRowPointerEnd();
    }

    function handleItemDragStart(event, itemKey) {
        setDraggingItemKey(itemKey);
        setDragStartX(event.clientX);
        setDeletePreviewItemKey(null);

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
        }
    }

    function handleItemDragOver(event) {
        event.preventDefault();
    }

    function handleItemDrag(event, itemKey) {
        if (!dragStartX || deletingItemKey) return;
        if (!event.clientX) return;

        const deltaX = event.clientX - dragStartX;

        if (deltaX < -DELETE_THRESHOLD) {
            setDeletePreviewItemKey(itemKey);
        } else if (deletePreviewItemKey === itemKey) {
            setDeletePreviewItemKey(null);
        }
    }

    async function handleItemDragEnd(event, item) {
        if (!dragStartX) {
            setDraggingItemKey(null);
            setDragStartX(null);
            setDeletePreviewItemKey(null);
            return;
        }

        const deltaX = event.clientX - dragStartX;

        if (deltaX < -DELETE_THRESHOLD) {
            await triggerDeleteWithAnimation(item);

            return;
        }

        setDraggingItemKey(null);
        setDragStartX(null);
        setDeletePreviewItemKey(null);
    }

    if (!hasFamily) {
        return <NoFamilyBanner onFamilyJoined={() => setHasFamily(true)} />;
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
                    <button onClick={loadBudget} className="btn-retry medium">
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
                        onClick={openAddBudgetModal}
                        className="btn-primary long"
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
                        <div
                            onPointerDown={handleCurrentBudgetPointerDown}
                            onPointerUp={handleCurrentBudgetPointerUp}
                            onPointerLeave={handleCurrentBudgetPointerUp}
                            onPointerCancel={handleCurrentBudgetPointerUp}
                            className="budget-title-touchArea"
                        >
                            <h1>{activeBudget?.name}</h1>
                        </div>
                    </div>
                    {budgetBreadcrumb.length > 1 && (
                        <p className="budget-breadcrumb">{budgetBreadcrumb.join(" / ")}</p>
                    )}
                </div>
                <div className="budget-header-summary">
                    <div className="summary-value">
                        {convertedTotal
                            ? `${convertedTotal.amount.toFixed(2)} ${convertedTotal.currency}`
                            : ratesLoading
                                ? activeBudgetTotalLabel
                                : activeBudgetTotalLabel}
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                    <button type="button" onClick={() => setError(null)} className="close-button">
                        ×
                    </button>
                </div>
            )}

            <div className="transactions-section">
                <div className="section-header">
                    <h2>Sub-budgets & Transactions</h2>
                    <div className="section-actions">
                        <AddButton onClick={openAddItemModal} />
                    </div>
                </div>

                {subBudgets.length > 0 || (activeBudget?.transactions && activeBudget.transactions.length > 0) ? (
                    <div className="transactions-list">
                        {subBudgets.map((subBudget) => (
                            (() => {
                                const subBudgetKey = `budget:${subBudget.id}`;
                                const rowClasses = ["transaction-item", "transaction-item--subBudget", "transaction-item--clickable"];

                                if (draggingItemKey === subBudgetKey) rowClasses.push("transaction-item--dragging");
                                if (deletePreviewItemKey === subBudgetKey) rowClasses.push("transaction-item--deletePreview");
                                if (deletingItemKey === subBudgetKey) rowClasses.push("transaction-item--deleting");

                                const subBudgetTotals = computeBudgetCurrencyTotals(subBudget);
                                const subBudgetTotalLabel = formatCurrencyTotals(
                                    subBudgetTotals,
                                    subBudget.currencyISOCode || activeBudget.currencyISOCode
                                );
                                const subBudgetPrimaryAmount = Number.parseFloat(subBudgetTotalLabel);
                                const subBudgetValueClass = Number.isFinite(subBudgetPrimaryAmount)
                                    ? subBudgetPrimaryAmount >= 0
                                        ? "is-income"
                                        : "is-expense"
                                    : "";

                                return (
                                    <button
                                        key={subBudget.id}
                                        type="button"
                                        className={rowClasses.join(" ")}
                                        onClick={() => {
                                            if (longPressTriggeredRef.current) {
                                                longPressTriggeredRef.current = false;
                                                return;
                                            }
                                            if (suppressNextClickRef.current) {
                                                suppressNextClickRef.current = false;
                                                return;
                                            }
                                            openSubBudget(subBudget.id);
                                        }}
                                        onPointerDown={(event) => handleRowPointerDown(event, "budget", subBudget.id, subBudgetKey)}
                                        onPointerMove={(event) => handleRowPointerMove(event, subBudgetKey)}
                                        onPointerUp={(event) => handleRowPointerUp(event, { type: "budget", id: subBudget.id })}
                                        onPointerLeave={handleRowPointerEnd}
                                        onPointerCancel={handleRowPointerEnd}
                                        draggable
                                        onDragStart={(event) => handleItemDragStart(event, subBudgetKey)}
                                        onDragOver={handleItemDragOver}
                                        onDrag={(event) => handleItemDrag(event, subBudgetKey)}
                                        onDragEnd={(event) => handleItemDragEnd(event, { type: "budget", id: subBudget.id })}
                                        title={`Open ${subBudget.name || "sub-budget"}`}
                                    >
                                        <div className="transaction-info">
                                            <div className="transaction-name">{subBudget.name || "Unnamed Sub-budget"}</div>
                                            <div className={`transaction-currency transaction-currency--value ${subBudgetValueClass}`.trim()}>
                                                {subBudgetTotalLabel}
                                            </div>
                                        </div>
                                        <div className="transaction-actions">
                                            <span className="subBudget-chevron" aria-hidden="true">›</span>
                                        </div>
                                    </button>
                                );
                            })()
                        ))}

                        {getBudgetTransactions(activeBudget).map((transaction) => {
                            const transactionKey = `transaction:${transaction.id}`;
                            const rowClasses = ["transaction-item"];
                            const transactionAmountValue = Number.parseFloat(transaction.amount);
                            const transactionValueClass = Number.isFinite(transactionAmountValue)
                                ? transactionAmountValue >= 0
                                    ? "is-income"
                                    : "is-expense"
                                : "";

                            if (draggingItemKey === transactionKey) rowClasses.push("transaction-item--dragging");
                            if (deletePreviewItemKey === transactionKey) rowClasses.push("transaction-item--deletePreview");
                            if (deletingItemKey === transactionKey) rowClasses.push("transaction-item--deleting");

                            return (
                                <div
                                    key={transaction.id}
                                    className={rowClasses.join(" ")}
                                    onPointerDown={(event) => handleRowPointerDown(event, "transaction", transaction.id, transactionKey)}
                                    onPointerMove={(event) => handleRowPointerMove(event, transactionKey)}
                                    onPointerUp={(event) => handleRowPointerUp(event, { type: "transaction", id: transaction.id })}
                                    onPointerLeave={handleRowPointerEnd}
                                    onPointerCancel={handleRowPointerEnd}
                                    draggable
                                    onDragStart={(event) => handleItemDragStart(event, transactionKey)}
                                    onDragOver={handleItemDragOver}
                                    onDrag={(event) => handleItemDrag(event, transactionKey)}
                                    onDragEnd={(event) => handleItemDragEnd(event, { type: "transaction", id: transaction.id })}
                                >
                                    <div className="transaction-info">
                                        <div className="transaction-name">{transaction.description}</div>
                                        <div className={`transaction-currency transaction-currency--value ${transactionValueClass}`.trim()}>
                                            {parseFloat(transaction.amount).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                budget={budgetModal.mode === "edit" ? budgetBeingEdited : null}
                onClose={closeBudgetModal}
                onSubmit={
                    budgetModal.mode === "add"
                        ? handleCreateBudget
                        : handleModifyBudget
                }
                isLoading={loading}
            />

            <AddItemModal
                isOpen={addItemModalOpen}
                onClose={closeAddItemModal}
                onSubmit={handleQuickAddSubmit}
                isLoading={isSubmittingQuickAdd}
                budgetCurrency={activeBudget.currencyISOCode}
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

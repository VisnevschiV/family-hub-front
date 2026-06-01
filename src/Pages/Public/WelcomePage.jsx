import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TodoList from "../../Components/TodoList.jsx";
import BudgetModal from "../../Components/BudgetModal.jsx";
import TransactionModal from "../../Components/TransactionModal.jsx";
import "./WelcomePage/welcomePage.css";
import "./WelcomePage/welcomePagedesktop.css";
import "./WelcomePage/welcomePagemobile.css";

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function formatDateLabel(date) {
    return date.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

function calculateBudgetTotal(node) {
    const own = Array.isArray(node.transactions)
        ? node.transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        : 0;
    const children = Array.isArray(node.subBudgets)
        ? node.subBudgets.reduce((sum, child) => sum + calculateBudgetTotal(child), 0)
        : 0;

    return own + children;
}

function updateBudgetNode(node, path, updater) {
    if (path.length === 0) {
        return updater(node);
    }

    const [nextId, ...rest] = path;
    return {
        ...node,
        subBudgets: (node.subBudgets || []).map((child) =>
            child.id === nextId ? updateBudgetNode(child, rest, updater) : child
        ),
    };
}

const DEFAULT_TODOS = [
    { id: "todo-1", text: "Fix kitchen light", done: true },
    { id: "todo-2", text: "School pickup at 16:00", done: false },
    { id: "todo-3", text: "Buy groceries for dinner", done: false },
];

const DEFAULT_BUDGET = {
    id: "root",
    name: "Family Budget",
    currencyISOCode: "EUR",
    planned: 1800,
    transactions: [
        { id: "tx-1", description: "Groceries", amount: 132.5 },
        { id: "tx-2", description: "Utilities", amount: 94.2 },
    ],
    subBudgets: [
        {
            id: "kids",
            name: "Kids",
            currencyISOCode: "EUR",
            planned: 420,
            transactions: [
                { id: "tx-3", description: "School supplies", amount: 45.9 },
                { id: "tx-4", description: "Football training", amount: 60 },
            ],
            subBudgets: [],
        },
        {
            id: "home",
            name: "Home",
            currencyISOCode: "EUR",
            planned: 730,
            transactions: [
                { id: "tx-5", description: "Cleaning products", amount: 27.4 },
                { id: "tx-6", description: "Internet", amount: 34.99 },
            ],
            subBudgets: [],
        },
    ],
};

function WelcomePage() {
    const [todos, setTodos] = useState(DEFAULT_TODOS);
    const [budgetTree, setBudgetTree] = useState(DEFAULT_BUDGET);
    const [budgetPath, setBudgetPath] = useState([]);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isPeriodActive, setIsPeriodActive] = useState(false);

    const periodNames = useMemo(
        () => ["Elena", "Marta", "Sofia", "Lina", "Nora"],
        []
    );
    const periodOwner = periodNames[0] || "Family member";

    const weekDays = useMemo(() => {
        const start = new Date();
        return Array.from({ length: 7 }).map((_, index) => {
            const current = addDays(start, index);
            return {
                key: toDateKey(current),
                label: formatDateLabel(current),
            };
        });
    }, []);

    const [selectedDay, setSelectedDay] = useState(() => toDateKey(new Date()));

    const fakeEvents = useMemo(
        () => [
            {
                id: "ev-1",
                date: weekDays[1]?.key,
                time: "18:00",
                title: "Family dinner",
            },
            {
                id: "ev-2",
                date: weekDays[2]?.key,
                time: "07:45",
                title: "School drop-off",
            },
            {
                id: "ev-3",
                date: weekDays[4]?.key,
                time: "19:00",
                title: "Meal planning",
            },
        ],
        [weekDays]
    );

    const dayEvents = useMemo(() => {
        return fakeEvents.filter((eventItem) => eventItem.date === selectedDay);
    }, [fakeEvents, selectedDay]);

    const budgetTrail = useMemo(() => {
        const nodes = [budgetTree];
        let current = budgetTree;

        for (const budgetId of budgetPath) {
            const next = (current.subBudgets || []).find((item) => item.id === budgetId);
            if (!next) break;
            nodes.push(next);
            current = next;
        }

        return nodes;
    }, [budgetTree, budgetPath]);

    const activeBudget = budgetTrail[budgetTrail.length - 1] || budgetTree;

    const activeBudgetTotal = useMemo(() => {
        return calculateBudgetTotal(activeBudget);
    }, [activeBudget]);

    const progressPercent = useMemo(() => {
        const planned = Number(activeBudget.planned || 0);
        if (!planned) return 0;
        return Math.min(100, Math.round((activeBudgetTotal / planned) * 100));
    }, [activeBudget, activeBudgetTotal]);

    const remainingBudget = useMemo(() => {
        return Number(activeBudget.planned || 0) - activeBudgetTotal;
    }, [activeBudget, activeBudgetTotal]);

    function openBudgetSection(subBudgetId) {
        setBudgetPath((current) => [...current, subBudgetId]);
    }

    function goToBudgetLevel(levelIndex) {
        setBudgetPath((current) => current.slice(0, Math.max(0, levelIndex)));
    }

    function addFakeExpense() {
        const sampleExpenses = [
            { description: "Coffee run", amount: 9.5 },
            { description: "Pharmacy", amount: 21.7 },
            { description: "Fuel", amount: 44.2 },
            { description: "Bakery", amount: 8.3 },
        ];
        const picked = sampleExpenses[Math.floor(Math.random() * sampleExpenses.length)];

        setBudgetTree((current) =>
            updateBudgetNode(current, budgetPath, (target) => ({
                ...target,
                transactions: [
                    ...(target.transactions || []),
                    {
                        id: `tx-${Date.now()}`,
                        description: picked.description,
                        amount: picked.amount,
                    },
                ],
            }))
        );
    }

    function handleAddBudget(data) {
        if (!data?.name?.trim()) return;

        setBudgetTree((current) =>
            updateBudgetNode(current, budgetPath, (target) => ({
                ...target,
                subBudgets: [
                    ...(target.subBudgets || []),
                    {
                        id: `budget-${Date.now()}`,
                        name: data.name.trim(),
                        currencyISOCode: data.currencyISOCode || target.currencyISOCode || "EUR",
                        planned: 0,
                        transactions: [],
                        subBudgets: [],
                    },
                ],
            }))
        );

        setIsBudgetModalOpen(false);
    }

    function handleAddTransaction(data) {
        const description = data?.description?.trim();
        const amount = Number(data?.amount);
        if (!description || !Number.isFinite(amount) || amount <= 0) return;

        setBudgetTree((current) =>
            updateBudgetNode(current, budgetPath, (target) => ({
                ...target,
                transactions: [
                    ...(target.transactions || []),
                    {
                        id: `tx-${Date.now()}`,
                        description,
                        amount,
                        currencyISOCode: data.currencyISOCode || target.currencyISOCode || "EUR",
                    },
                ],
            }))
        );

        setIsTransactionModalOpen(false);
    }

    function handleDeleteTransaction(transactionId) {
        setBudgetTree((current) =>
            updateBudgetNode(current, budgetPath, (target) => ({
                ...target,
                transactions: (target.transactions || []).filter(
                    (transaction) => transaction.id !== transactionId
                ),
            }))
        );
    }

    function formatMoney(amount, currencyCode = "EUR") {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currencyCode,
            maximumFractionDigits: 2,
        }).format(amount);
    }

    return (
        <div className="welcome">
            <div className="welcome__bg">
                <div className="welcome__blob welcome__blob--one" />
                <div className="welcome__blob welcome__blob--two" />
            </div>

            <header className="welcome__header">
                <div className="welcome__brand">
                    <div className="welcome__logo">
                        <img src="/logo.png" alt="happywifehappylife logo" className="welcome__logoImage" />
                    </div>
                    <div>
                        <div className="welcome__title">happywifehappylife</div>
                        <div className="welcome__subtitle">Shared life, organized</div>
                    </div>
                </div>
                <div className="welcome__actions">
                    <Link className="welcome__link" to="/login">
                        Log in
                    </Link>
                    <Link className="welcome__cta" to="/register">
                        Create account
                    </Link>
                </div>
            </header>

            <main className="welcome__main">
                <section className="welcome__hero">
                    <div className="welcome__heroText">
                        <div className="welcome__eyebrow">Made for real families</div>
                        <h1 className="welcome__headline">
                            See what your family can do before creating an account.
                        </h1>
                        <p className="welcome__lead text-big">
                            One app for priorities, calendar, budget, notifications, and
                            profile/family settings.
                        </p>
                        <div className="welcome__heroActions">
                            <Link className="welcome__cta" to="/register">
                                Get started
                            </Link>
                            <Link className="welcome__ghost" to="/login">
                                I already have an account
                            </Link>
                        </div>
                    </div>
                    <div className="welcome__heroCard">
                        <div className="welcome__heroCardTitle">Shared family workspace</div>
                        <div className="welcome__heroCardBody">
                            <div className="welcome__heroItem">
                                <span className="welcome__dot" />
                                Updates are visible to your family
                            </div>
                            <div className="welcome__heroItem">
                                <span className="welcome__dot" />
                                Everyone stays in sync
                            </div>
                            <div className="welcome__heroItem">
                                <span className="welcome__dot" />
                                Plan together in one place
                            </div>
                        </div>
                        <div className="welcome__heroFooter">All shared with the family</div>
                    </div>
                </section>

                <section className="welcome__previewGrid" aria-label="Feature previews">
                    <article className="welcome__previewCard">
                        <TodoList
                            listId="welcome-preview-list"
                            title="Priorities"
                            items={todos}
                            onItemsChange={(_, nextItems) => setTodos(nextItems)}
                            onRequestRename={() => { }}
                            onDeleteList={() => { }}
                        />
                    </article>

                    <article className="welcome__panel welcome__previewCard">
                        <h2 className="welcome__panelTitle">Budget &amp; Savings</h2>
                        <div className="welcome__budgetBreadcrumb">
                            {budgetTrail.map((node, index) => (
                                <button
                                    key={node.id}
                                    type="button"
                                    className="welcome__crumb"
                                    onClick={() => goToBudgetLevel(index)}
                                >
                                    {node.name}
                                </button>
                            ))}
                        </div>
                        <div className="welcome__budgetMock">
                            <div className="welcome__budgetActions">
                                <button
                                    type="button"
                                    className="welcome__miniButton"
                                    onClick={() => setIsBudgetModalOpen(true)}
                                >
                                    Add budget
                                </button>
                                <button
                                    type="button"
                                    className="welcome__miniButton"
                                    onClick={() => setIsTransactionModalOpen(true)}
                                >
                                    Add transaction
                                </button>
                            </div>

                            <div className="welcome__budgetLine">
                                <span>Planned</span>
                                <strong>{formatMoney(activeBudget.planned || 0, activeBudget.currencyISOCode)}</strong>
                            </div>
                            <div className="welcome__budgetBar">
                                <span className="welcome__budgetBarFill" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <div className="welcome__budgetLine">
                                <span>Spent</span>
                                <strong>{formatMoney(activeBudgetTotal, activeBudget.currencyISOCode)}</strong>
                            </div>
                            <div className="welcome__budgetLine">
                                <span>Usage</span>
                                <strong>{progressPercent}%</strong>
                            </div>
                            <div className="welcome__budgetLine">
                                <span>Remaining</span>
                                <strong>{formatMoney(remainingBudget, activeBudget.currencyISOCode)}</strong>
                            </div>

                            {(activeBudget.subBudgets || []).length > 0 && (
                                <div className="welcome__budgetSubBudgets">
                                    {(activeBudget.subBudgets || []).map((subBudget) => (
                                        <button
                                            type="button"
                                            className="welcome__subBudgetButton"
                                            key={subBudget.id}
                                            onClick={() => openBudgetSection(subBudget.id)}
                                        >
                                            {subBudget.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="welcome__transactionsList">
                                {(activeBudget.transactions || []).map((transaction) => (
                                    <div className="welcome__budgetLine" key={transaction.id}>
                                        <span>{transaction.description}</span>
                                        <div className="welcome__budgetLineActions">
                                            <strong>{formatMoney(transaction.amount, transaction.currencyISOCode || activeBudget.currencyISOCode)}</strong>
                                            <button
                                                type="button"
                                                className="welcome__lineDeleteBtn"
                                                onClick={() => handleDeleteTransaction(transaction.id)}
                                                aria-label={`Delete ${transaction.description}`}
                                            >
                                                x
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="button" className="welcome__miniButton" onClick={addFakeExpense}>
                                Add fake expense
                            </button>
                        </div>
                    </article>

                    <article className="welcome__panel welcome__previewCard">
                        <h2 className="welcome__panelTitle">Our Calendar</h2>
                        <div className="welcome__periodTracker">
                            <div>
                                <div className="welcome__periodTitle">Period tracking</div>
                                <div className="welcome__periodText">{periodOwner}'s cycle preview</div>
                            </div>
                            <button
                                type="button"
                                className="welcome__miniButton"
                                onClick={() => setIsPeriodActive((current) => !current)}
                            >
                                {isPeriodActive ? "Stop" : "Start"}
                            </button>
                        </div>
                        <div className="welcome__periodStatus">
                            {isPeriodActive ? "Active period" : "No active period"}
                        </div>
                        <div className="welcome__calendarDays">
                            {weekDays.map((day) => (
                                <button
                                    key={day.key}
                                    type="button"
                                    className={day.key === selectedDay ? "welcome__dayButton welcome__dayButton--active" : "welcome__dayButton"}
                                    onClick={() => setSelectedDay(day.key)}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                        <div className="welcome__calendarMock">
                            {dayEvents.length === 0 && (
                                <div className="welcome__calendarEvent">No events on this day</div>
                            )}
                            {dayEvents.map((eventItem) => (
                                <div className="welcome__calendarEvent" key={eventItem.id}>
                                    <span>{eventItem.time}</span>
                                    <span>{eventItem.title}</span>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="welcome__panel welcome__previewCard">
                        <h2 className="welcome__panelTitle">Notifications</h2>
                        <div className="welcome__notificationsMock">
                            <div className="welcome__notificationItem">New event: Parent meeting tomorrow</div>
                            <div className="welcome__notificationItem">Priority completed: Laundry</div>
                            <div className="welcome__notificationItem">Budget updated by Alex</div>
                        </div>
                    </article>
                </section>

                <section className="welcome__grid" aria-label="All functionalities">
                    <article className="welcome__panel">
                        <h2 className="welcome__panelTitle">What is included</h2>
                        <p className="welcome__panelText text-medium">
                            Family Hub, Priorities, Our Calendar, Budget &amp; Savings,
                            Notifications, and Profile &amp; Family settings.
                        </p>
                    </article>
                    <article className="welcome__panel">
                        <h2 className="welcome__panelTitle">Family sharing</h2>
                        <p className="welcome__panelText text-medium">
                            Priorities, events, budget changes, and alerts are shared with
                            your family so everyone stays aligned.
                        </p>
                    </article>
                </section>

                <section className="welcome__ctaPanel">
                    <div>
                        <h2 className="welcome__panelTitle">Ready to bring everyone in?</h2>
                        <p className="welcome__panelText text-medium">
                            Start with a free account and invite your family when you are
                            ready.
                        </p>
                    </div>
                    <Link className="welcome__cta" to="/register">
                        Create your happywifehappylife
                    </Link>
                </section>
            </main>

            <BudgetModal
                isOpen={isBudgetModalOpen}
                mode="add"
                budget={null}
                onClose={() => setIsBudgetModalOpen(false)}
                onSubmit={handleAddBudget}
                isLoading={false}
            />

            <TransactionModal
                isOpen={isTransactionModalOpen}
                mode="add"
                transaction={null}
                budgetCurrency={activeBudget.currencyISOCode || "EUR"}
                onClose={() => setIsTransactionModalOpen(false)}
                onSubmit={handleAddTransaction}
                isLoading={false}
            />
        </div>
    );
}

export default WelcomePage;

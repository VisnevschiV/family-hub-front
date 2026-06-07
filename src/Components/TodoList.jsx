import { useEffect, useMemo, useRef, useState } from "react";
import AddButton from "./AddButton";
import AddMilestoneModal from "./TodoList/AddMilestoneModal";
import CompleteListModal from "./TodoList/CompleteListModal";
import "./TodoList/todoList.css";
import "./TodoList/todoListdesktop.css";
import "./TodoList/todoListmobile.css";

export default function TodoList({
    listId,
    title,
    items = [],
    collapsed,
    onToggleCollapsed,
    onItemsChange,
    onAddTask,
    onDeleteTask,
    onToggleTask,
    onRequestRename,
    onCompleteList,
    onDeleteList,
    onEditTask,
}) {

    const [internalIsCollapsed, setInternalIsCollapsed] = useState(true);
    const [hideCompleted, setHideCompleted] = useState(false);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newText, setNewText] = useState("");

    // Drag state
    const [draggingId, setDraggingId] = useState(null);
    const [dragOrder, setDragOrder] = useState(null); // local order while dragging
    const [touchHoldId, setTouchHoldId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingText, setEditingText] = useState("");
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [isCompletingList, setIsCompletingList] = useState(false);
    const [showCompletionReward, setShowCompletionReward] = useState(false);
    const menuRef = useRef(null);
    const editLongPressTimerRef = useRef(null);
    const touchHoldTimerRef = useRef(null);
    const previousCompletionPercentRef = useRef(0);
    const touchGestureRef = useRef({
        active: false,
        id: null,
        startX: 0,
        startY: 0,
        held: false,
        moved: false,
        swipedRight: false,
    });

    const totalCount = items.length;
    const doneCount = useMemo(() => items.filter((i) => i.done).length, [items]);
    const completionPercent = totalCount > 0
        ? Math.round((doneCount / totalCount) * 100)
        : 0;
    const pendingCount = Math.max(totalCount - doneCount, 0);
    const isCollapsed = typeof collapsed === "boolean" ? collapsed : internalIsCollapsed;

    const visibleItems = useMemo(() => {
        const source = dragOrder || items;
        return hideCompleted ? source.filter((i) => !i.done) : source;
    }, [items, hideCompleted, dragOrder]);

    function updateItems(nextItemsOrUpdater) {
        const nextItems =
            typeof nextItemsOrUpdater === "function"
                ? nextItemsOrUpdater(items)
                : nextItemsOrUpdater;

        onItemsChange(listId, nextItems);
    }

    async function toggleItem(id) {
        try {
            if (typeof onToggleTask === "function") {
                await onToggleTask(listId, id);
                return;
            }

            updateItems((prev) =>
                prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
            );
        } catch (err) {
            console.error(err.message || "Failed to update task status");
        }
    }

    function toggleCollapsed() {
        const nextCollapsed = !isCollapsed;
        if (typeof onToggleCollapsed === "function") {
            onToggleCollapsed(nextCollapsed);
        } else {
            setInternalIsCollapsed(nextCollapsed);
        }
        setIsAddOpen(false);
    }

    function openAdd() {
        setNewText("");
        setIsAddOpen(true);
        if (typeof onToggleCollapsed === "function") {
            onToggleCollapsed(false);
        } else {
            setInternalIsCollapsed(false);
        }
    }

    function closeAdd() {
        setIsAddOpen(false);
        setNewText("");
    }

    async function submitAdd(e) {
        e.preventDefault();
        const value = newText.trim();
        if (!value) return;

        try {
            if (typeof onAddTask === "function") {
                await onAddTask(listId, value);
            } else {
                updateItems((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), text: value, done: false },
                ]);
            }
            closeAdd();
        } catch (err) {
            console.error(err.message || "Failed to create task");
        }
    }

    useEffect(() => {
        function handleOutsideClick(e) {
            if (!menuRef.current) return;
            if (menuRef.current.contains(e.target)) return;
            setIsMenuOpen(false);
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    useEffect(
        () => () => {
            clearEditLongPressTimer();
        },
        []
    );

    useEffect(() => {
        if (isCollapsed) {
            setIsMenuOpen(false);
        }
    }, [isCollapsed]);

    useEffect(() => {
        if (totalCount === 0) {
            previousCompletionPercentRef.current = 0;
            return;
        }

        const previousPercent = previousCompletionPercentRef.current;
        const reachedFullCompletion = completionPercent === 100 && previousPercent < 100;

        if (reachedFullCompletion) {
            setIsCompleteModalOpen(true);
            setIsMenuOpen(false);
        }

        previousCompletionPercentRef.current = completionPercent;
    }, [completionPercent, totalCount]);

    useEffect(() => {
        if (editingTaskId) {
            clearEditLongPressTimer();
        }
    }, [editingTaskId]);

    function handleRenameList() {
        onRequestRename(listId);
    }

    function handleDeleteList() {
        const confirmed = window.confirm(
            `Delete priorities list "${title}"? This cannot be undone.`
        );
        if (!confirmed) return;
        onDeleteList(listId);
    }

    function handleCompleteList() {
        setIsCompleteModalOpen(true);
        setIsMenuOpen(false);
    }

    function closeCompleteModal() {
        if (isCompletingList) return;
        setIsCompleteModalOpen(false);
    }

    async function confirmCompleteList() {
        if (isCompletingList) return;

        setIsCompletingList(true);
        setShowCompletionReward(true);

        try {
            await new Promise((resolve) => {
                window.setTimeout(resolve, 900);
            });

            if (typeof onCompleteList === "function") {
                await onCompleteList(listId);
            }
        } finally {
            setIsCompletingList(false);
            setShowCompletionReward(false);
            setIsCompleteModalOpen(false);
        }
    }

    const EDIT_LONG_PRESS_MS = 420;

    function clearEditLongPressTimer() {
        if (editLongPressTimerRef.current) {
            window.clearTimeout(editLongPressTimerRef.current);
            editLongPressTimerRef.current = null;
        }
    }

    function startInlineEdit(item) {
        setEditingTaskId(item.id);
        setEditingText(item.text);
    }

    function handleInlineEditPointerDown(event, item) {
        if (draggingId || deletingId || editingTaskId) return;
        if (event.pointerType !== "mouse") return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        clearEditLongPressTimer();
        editLongPressTimerRef.current = window.setTimeout(() => {
            startInlineEdit(item);
        }, EDIT_LONG_PRESS_MS);
    }

    function handleInlineEditPointerEnd() {
        clearEditLongPressTimer();
    }

    function cancelInlineEdit() {
        setEditingTaskId(null);
        setEditingText("");
    }

    async function commitInlineEdit(item) {
        const nextText = editingText.trim();
        if (!nextText) {
            cancelInlineEdit();
            return;
        }

        if (nextText === item.text) {
            cancelInlineEdit();
            return;
        }

        try {
            if (typeof onEditTask === "function") {
                await onEditTask(listId, item.id, nextText);
            } else {
                updateItems((prev) =>
                    prev.map((existingItem) =>
                        existingItem.id === item.id ? { ...existingItem, text: nextText } : existingItem
                    )
                );
            }
        } catch (err) {
            console.error(err.message || "Failed to edit task");
        } finally {
            cancelInlineEdit();
        }
    }

    async function handleDeleteItem(itemId) {
        try {
            if (typeof onDeleteTask === "function") {
                await onDeleteTask(listId, itemId);
            } else {
                updateItems((prev) => prev.filter((item) => item.id !== itemId));
            }
        } catch (err) {
            console.error(err.message || "Failed to delete task");
        }
    }

    // ----- Drag & drop logic -----

    const TOUCH_HOLD_MS = 320;
    const TAP_MOVE_TOLERANCE = 8;

    function resetTouchGesture() {
        clearTimeout(touchHoldTimerRef.current);
        touchGestureRef.current = {
            active: false,
            id: null,
            startX: 0,
            startY: 0,
            held: false,
            moved: false,
        };
        setTouchHoldId(null);
        setDraggingId(null);
        setDragOrder(null);
    }

    function startReorderDrag(e, itemId) {
        if (editingTaskId || deletingId) return;
        if (e.button != null && e.button !== 0) return;

        e.preventDefault();
        clearEditLongPressTimer();

        touchGestureRef.current = {
            active: true,
            id: itemId,
            startX: e.clientX,
            startY: e.clientY,
            held: true,
            moved: false,
        };
        setDraggingId(itemId);
        setTouchHoldId(itemId);
        setDragOrder([...items]);

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) { }
    }

    function handleItemPointerDown(e, itemId) {
        if (editingTaskId || deletingId) return;
        if (e.button != null && e.button !== 0) return;

        if (e.pointerType !== "touch") {
            e.preventDefault();
        }
        clearEditLongPressTimer();

        if (e.pointerType !== "touch") {
            startReorderDrag(e, itemId);
            return;
        }

        touchGestureRef.current = {
            active: true,
            id: itemId,
            startX: e.clientX,
            startY: e.clientY,
            held: false,
            moved: false,
        };

        clearTimeout(touchHoldTimerRef.current);
        touchHoldTimerRef.current = setTimeout(() => {
            if (!touchGestureRef.current.active || touchGestureRef.current.id !== itemId) return;
            touchGestureRef.current.held = true;
            startReorderDrag(e, itemId);
        }, TOUCH_HOLD_MS);
    }

    function handleItemPointerMove(e, itemId) {
        const gesture = touchGestureRef.current;
        if (!gesture.active || gesture.id !== itemId) return;

        const dx = e.clientX - gesture.startX;
        const dy = e.clientY - gesture.startY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (!gesture.held) {
            if (absDx > TAP_MOVE_TOLERANCE || absDy > TAP_MOVE_TOLERANCE) {
                clearTimeout(touchHoldTimerRef.current);
                touchGestureRef.current.active = false;
            }
            return;
        }

        touchGestureRef.current.moved = true;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const li = el && el.closest("[data-item-id]");
        const hoveredId = li && li.dataset.itemId;

        if (hoveredId && hoveredId !== String(itemId)) {
            setDragOrder((prev) => {
                const source = prev || items;
                const fromIndex = source.findIndex((i) => String(i.id) === String(itemId));
                const toIndex = source.findIndex((i) => String(i.id) === hoveredId);
                if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return source;
                const next = [...source];
                const [moved] = next.splice(fromIndex, 1);
                next.splice(toIndex, 0, moved);
                return next;
            });
        }
    }

    async function handleItemPointerUp(e, itemId) {
        const gesture = touchGestureRef.current;
        clearTimeout(touchHoldTimerRef.current);
        if (!gesture.active || gesture.id !== itemId) return;

        if (!gesture.held) {
            resetTouchGesture();
            return;
        }

        if (dragOrder) {
            updateItems(dragOrder);
        }
        resetTouchGesture();
    }

    function handleItemPointerCancel(itemId) {
        const gesture = touchGestureRef.current;
        if (!gesture.active || gesture.id !== itemId) return;
        resetTouchGesture();
    }

    return (
        <section
            className={`todoList ${!isCollapsed ? "todoList--expanded" : ""} ${isMenuOpen ? "todoList--menuOpen" : ""} ${showCompletionReward ? "todoList--celebrating" : ""}`.trim()}
        >
            <header
                className="todoList__header"
                role="button"
                tabIndex={0}
                aria-expanded={!isCollapsed}
                onClick={toggleCollapsed}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleCollapsed();
                    }
                }}
            >
                <div className="todoList__heading">
                    <h2 className="todoList__title">{title}</h2>
                    <div className="todoList__meta">
                        <span className="todoList__metaLabel">{completionPercent}%</span>
                        <span
                            className="todoList__progressTrack"
                            style={{ "--progress": `${completionPercent}%` }}
                            aria-hidden="true"
                        >
                            <span
                                className="todoList__progressFill"
                                style={{ width: `${completionPercent}%` }}
                            />
                        </span>
                    </div>
                </div>

                {isCollapsed ? (
                    <span className="todoList__chevron" aria-hidden="true">
                        &gt;
                    </span>
                ) : (
                    <div className="todoList__menuWrap" ref={menuRef}>
                        <button
                            type="button"
                            className="todoList__menuBtn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen((prev) => !prev);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            aria-label={`More actions for ${title}`}
                            title="More actions"
                        >
                            ...
                        </button>

                        {isMenuOpen && (
                            <div
                                className="todoList__menu"
                                role="menu"
                                onClick={(e) => e.stopPropagation()}
                            >

                                <button
                                    type="button"
                                    className="todoList__menuItem"
                                    role="menuitem"
                                    onClick={() => {
                                        setHideCompleted((prev) => !prev);
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    {hideCompleted ? "Show done" : "Hide done"}
                                </button>

                                <button
                                    type="button"
                                    className="todoList__menuItem"
                                    role="menuitem"
                                    onClick={() => {
                                        handleRenameList();
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    Modify
                                </button>

                                <button
                                    type="button"
                                    className="todoList__menuItem"
                                    role="menuitem"
                                    onClick={() => {
                                        handleCompleteList();
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    Complete
                                </button>

                                <button
                                    type="button"
                                    className="todoList__menuItem todoList__menuItem--danger"
                                    role="menuitem"
                                    onClick={() => {
                                        handleDeleteList();
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </header>

            <div
                className={`todoList__body${isCollapsed ? " todoList__body--collapsed" : ""}`}
                aria-hidden={isCollapsed}
            >
                <div className="todoList__bodyInner">
                    <div className="todoList__milestonesRow">
                        <div className="todoList__milestonesTitle">Tasks</div>
                        <AddButton onClick={openAdd} ariaLabel="Add task">
                            + Add
                        </AddButton>
                    </div>
                    <ul className="todoList__items">
                        {visibleItems.map((item) => {
                            const classes = ["todoList__item"];

                            if (draggingId === item.id) {
                                classes.push("todoList__item--dragging");
                            }

                            if (touchHoldId === item.id) {
                                classes.push("todoList__item--touchHold");
                            }

                            return (
                                <li
                                    key={item.id}
                                    data-item-id={String(item.id)}
                                    className={classes.join(" ")}
                                    onPointerDown={(event) => handleItemPointerDown(event, item.id)}
                                    onPointerMove={(event) => handleItemPointerMove(event, item.id)}
                                    onPointerUp={(event) => handleItemPointerUp(event, item.id)}
                                    onPointerCancel={() => handleItemPointerCancel(item.id)}
                                >
                                    <label className="todoList__label">
                                        <input
                                            className="todoList__checkbox"
                                            type="checkbox"
                                            checked={item.done}
                                            onChange={() => toggleItem(item.id)}
                                        />
                                        <span
                                            className="todoList__textWrap"
                                            onPointerDown={(event) => handleInlineEditPointerDown(event, item)}
                                            onPointerUp={handleInlineEditPointerEnd}
                                            onPointerLeave={handleInlineEditPointerEnd}
                                            onPointerCancel={handleInlineEditPointerEnd}
                                        >
                                            {editingTaskId === item.id ? (
                                                <input
                                                    type="text"
                                                    className="todoList__inlineEditInput"
                                                    value={editingText}
                                                    onChange={(event) => setEditingText(event.target.value)}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onBlur={() => commitInlineEdit(item)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter") {
                                                            event.preventDefault();
                                                            commitInlineEdit(item);
                                                        }
                                                        if (event.key === "Escape") {
                                                            event.preventDefault();
                                                            cancelInlineEdit();
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className={
                                                        item.done
                                                            ? "todoList__text todoList__text--done"
                                                            : "todoList__text"
                                                    }
                                                >
                                                    {item.text}
                                                </span>
                                            )}
                                        </span>
                                    </label>

                                    <div className="todoList__taskActions">
                                        <button
                                            type="button"
                                            className="todoList__taskActionBtn"
                                            onClick={() => startInlineEdit(item)}
                                            aria-label="Modify task"
                                            title="Modify"
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                <path
                                                    d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.96 1.96 3.75 3.75 2.13-2.09z"
                                                    fill="currentColor"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            className="todoList__taskActionBtn todoList__taskActionBtn--danger"
                                            onClick={() => handleDeleteItem(item.id)}
                                            aria-label="Delete task"
                                            title="Delete"
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                <path
                                                    d="M6 7h12l-1 14H7L6 7zm3-4h6l1 2h4v2H4V5h4l1-2z"
                                                    fill="currentColor"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            <AddMilestoneModal
                isOpen={isAddOpen}
                isCollapsed={isCollapsed}
                onClose={closeAdd}
                onSubmit={submitAdd}
                value={newText}
                onChange={setNewText}
            />

            <CompleteListModal
                isOpen={isCompleteModalOpen}
                title={title}
                completionPercent={completionPercent}
                doneCount={doneCount}
                totalCount={totalCount}
                pendingCount={pendingCount}
                isSubmitting={isCompletingList}
                isCelebrating={showCompletionReward}
                onCancel={closeCompleteModal}
                onConfirm={confirmCompleteList}
            />
        </section>
    );
}
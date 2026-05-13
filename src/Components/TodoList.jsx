import { useEffect, useMemo, useRef, useState } from "react";
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
    onDeleteList,
    onEditTask,
}) {

    const [internalIsCollapsed, setInternalIsCollapsed] = useState(true);
    const [hideCompleted, setHideCompleted] = useState(false);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newText, setNewText] = useState("");

    // Drag state
    const [draggingId, setDraggingId] = useState(null);
    const [dragStartX, setDragStartX] = useState(null);
    const [dragOrder, setDragOrder] = useState(null); // local order while dragging
    const [isTouchDragging, setIsTouchDragging] = useState(false);
    const [touchHoldId, setTouchHoldId] = useState(null);
    const [touchActivatedId, setTouchActivatedId] = useState(null);
    const [deletePreviewId, setDeletePreviewId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingText, setEditingText] = useState("");
    const menuRef = useRef(null);
    const editLongPressTimerRef = useRef(null);
    const touchHoldTimerRef = useRef(null);
    const touchGestureRef = useRef({
        active: false,
        id: null,
        startX: 0,
        startY: 0,
        held: false,
        moved: false,
    });

    const totalCount = items.length;
    const doneCount = useMemo(() => items.filter((i) => i.done).length, [items]);
    const completionPercent = totalCount > 0
        ? Math.round((doneCount / totalCount) * 100)
        : 0;
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

    // ----- Drag & drop logic -----

    const DELETE_THRESHOLD = 40; // px to the right

    function handleDragStart(e, id) {
        if (editingTaskId) return;
        setDraggingId(id);
        setDragStartX(e.clientX);
        setDeletePreviewId(null);
        setDragOrder([...items]); // snapshot current order for local reorder
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
        }
    }

    function handleDragOver(e, overId) {
        e.preventDefault();
        if (!draggingId || draggingId === overId || deletingId || editingTaskId) return;

        setDragOrder((prev) => {
            const source = prev || items;
            const fromIndex = source.findIndex((i) => i.id === draggingId);
            const toIndex = source.findIndex((i) => i.id === overId);
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
                return source;
            }
            const next = [...source];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
    }

    function handleDrag(e, id) {
        if (!dragStartX || deletingId || editingTaskId) return;
        if (!e.clientX) return;

        const dx = e.clientX - dragStartX;

        // While dragging: preview delete if far enough to the right
        if (dx > DELETE_THRESHOLD) {
            setDeletePreviewId(id);
        } else if (deletePreviewId === id) {
            setDeletePreviewId(null);
        }
    }

    async function handleDragEnd(e, id) {
        if (editingTaskId) return;
        if (!dragStartX) {
            setDraggingId(null);
            setDragStartX(null);
            setDeletePreviewId(null);
            return;
        }
        const dx = e.clientX - dragStartX;

        if (dx > DELETE_THRESHOLD) {
            // Trigger slide‑out animation first
            setDeletingId(id);
            setDeletePreviewId(null);
            setDraggingId(null);
            setDragStartX(null);
            setDragOrder(null);

            setTimeout(async () => {
                try {
                    if (typeof onDeleteTask === "function") {
                        await onDeleteTask(listId, id);
                    } else {
                        updateItems((prev) => prev.filter((i) => i.id !== id));
                    }
                } catch (err) {
                    console.error(err.message || "Failed to delete task");
                } finally {
                    setDeletingId(null);
                }
            }, 300); // match CSS duration below
        } else {
            // Commit reordered items to parent
            if (dragOrder) {
                updateItems(dragOrder);
            }
            setDraggingId(null);
            setDragStartX(null);
            setDeletePreviewId(null);
            setDragOrder(null);
        }
    }

    // ----- Touch hold gestures (mobile): hold => enlarge, release => rename, move => reorder/delete -----

    const TOUCH_HOLD_MS = 320;
    const TAP_MOVE_TOLERANCE = 8;
    const REORDER_MOVE_THRESHOLD = 12;
    const DELETE_DIRECTION_BUFFER = 10;

    function resetTouchGesture(clearActivated = false) {
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
        setIsTouchDragging(false);
        setDraggingId(null);
        setDeletePreviewId(null);
        setDragOrder(null);
        if (clearActivated) {
            setTouchActivatedId(null);
        }
    }

    async function runDelete(itemId) {
        setDeletingId(itemId);
        setDeletePreviewId(null);
        setTimeout(async () => {
            try {
                if (typeof onDeleteTask === "function") {
                    await onDeleteTask(listId, itemId);
                } else {
                    updateItems((prev) => prev.filter((i) => i.id !== itemId));
                }
            } catch (err) {
                console.error(err.message || "Failed to delete task");
            } finally {
                setDeletingId(null);
            }
        }, 300);
    }

    function handleItemPointerDown(e, itemId) {
        if (e.pointerType === "mouse") return;
        if (editingTaskId || deletingId) return;

        // Prevent iOS long-press text selection/callout for gesture interactions.
        if (!e.target.closest("input, button, textarea")) {
            e.preventDefault();
        }

        // If already activated from a previous hold, continue immediately.
        if (touchActivatedId === itemId) {
            touchGestureRef.current = {
                active: true,
                id: itemId,
                startX: e.clientX,
                startY: e.clientY,
                held: true,
                moved: false,
            };
            setTouchHoldId(itemId);
            setDraggingId(itemId);
            setDragOrder([...items]);
            setIsTouchDragging(true);
            try { e.target.setPointerCapture(e.pointerId); } catch (_) { }
            return;
        }

        clearEditLongPressTimer();
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
            setTouchHoldId(itemId);
            setTouchActivatedId(itemId);
            setDraggingId(itemId);
            setDragOrder([...items]);
            setIsTouchDragging(true);
            try { e.target.setPointerCapture(e.pointerId); } catch (_) { }
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
                // User is scrolling or moving before hold, do nothing special.
                clearTimeout(touchHoldTimerRef.current);
                touchGestureRef.current.active = false;
            }
            return;
        }

        const isIntentionalRightSwipe = dx > DELETE_THRESHOLD && dx > absDy + DELETE_DIRECTION_BUFFER;
        if (isIntentionalRightSwipe) {
            setDeletePreviewId(itemId);
        } else if (deletePreviewId === itemId) {
            setDeletePreviewId(null);
        }

        if (absDy < REORDER_MOVE_THRESHOLD) return;

        touchGestureRef.current.moved = true;
        try { e.target.releasePointerCapture(e.pointerId); } catch (_) { }
        const el = document.elementFromPoint(e.clientX, e.clientY);
        try { e.target.setPointerCapture(e.pointerId); } catch (_) { }
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

        const dx = e.clientX - gesture.startX;
        const dy = Math.abs(e.clientY - gesture.startY);

        if (!gesture.held) {
            resetTouchGesture();
            return;
        }

        if (deletePreviewId === itemId) {
            resetTouchGesture(true);
            await runDelete(itemId);
            return;
        }

        if (gesture.moved || dy >= REORDER_MOVE_THRESHOLD) {
            if (dragOrder) updateItems(dragOrder);
            resetTouchGesture(true);
            return;
        }

        const targetItem = items.find((i) => i.id === itemId);
        resetTouchGesture(true);
        if (targetItem) {
            startInlineEdit(targetItem);
        }
    }

    function handleItemPointerCancel(itemId) {
        const gesture = touchGestureRef.current;
        if (!gesture.active || gesture.id !== itemId) return;
        if (gesture.held) {
            // Keep activated visual state until rename/reorder/delete happens.
            clearTimeout(touchHoldTimerRef.current);
            touchGestureRef.current.active = false;
            setTouchHoldId(null);
            setIsTouchDragging(false);
            setDraggingId(null);
            setDeletePreviewId(null);
            setDragOrder(null);
            return;
        }
        resetTouchGesture();
    }

    return (
        <section className={`todoList ${!isCollapsed ? "todoList--expanded" : ""} ${isMenuOpen ? "todoList--menuOpen" : ""}`.trim()}>
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
                                        openAdd();
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    Add milestone
                                </button>

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
                        <div className="todoList__milestonesTitle">Milestones</div>
                        <button
                            type="button"
                            className="todoList__milestonesAddBtn"
                            onClick={openAdd}
                        >
                            + Add
                        </button>
                    </div>
                    <ul className="todoList__items" style={{ touchAction: isTouchDragging ? "none" : undefined }}>
                        {visibleItems.map((item) => {
                            const classes = ["todoList__item"];
                            if (item.id === draggingId)
                                classes.push("todoList__item--dragging");
                            if (item.id === touchHoldId || item.id === touchActivatedId)
                                classes.push("todoList__item--touchHold");
                            if (item.id === deletePreviewId)
                                classes.push("todoList__item--deletePreview");
                            if (item.id === deletingId)
                                classes.push("todoList__item--deleting");

                            return (
                                <li
                                    key={item.id}
                                    data-item-id={String(item.id)}
                                    className={classes.join(" ")}
                                    draggable={editingTaskId !== item.id}
                                    onDragStart={(e) => handleDragStart(e, item.id)}
                                    onDragOver={(e) => handleDragOver(e, item.id)}
                                    onDrag={(e) => handleDrag(e, item.id)}
                                    onDragEnd={(e) => handleDragEnd(e, item.id)}
                                    onPointerDown={(e) => handleItemPointerDown(e, item.id)}
                                    onPointerMove={(e) => handleItemPointerMove(e, item.id)}
                                    onPointerUp={(e) => handleItemPointerUp(e, item.id)}
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
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {isAddOpen && !isCollapsed && (
                <div
                    className="todoList__modalBackdrop"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeAdd();
                    }}
                >
                    <div className="todoList__modal">
                        <div className="todoList__modalTitle">New milestone</div>

                        <form
                            className="todoList__modalForm"
                            onSubmit={submitAdd}
                        >
                            <input
                                className="todoList__modalInput"
                                value={newText}
                                onChange={(e) => setNewText(e.target.value)}
                                placeholder="e.g. Buy milk this evening"
                                autoFocus
                            />

                            <div className="todoList__modalActions">
                                <button
                                    type="button"
                                    className="todoList__modalBtn todoList__modalBtn--ghost"
                                    onClick={closeAdd}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="todoList__modalBtn todoList__modalBtn--primary"
                                >
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
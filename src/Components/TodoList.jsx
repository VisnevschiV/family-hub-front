import { useEffect, useMemo, useRef, useState } from "react";
import "./TodoList/todoList.css";
import "./TodoList/todoListdesktop.css";
import "./TodoList/todoListmobile.css";

export default function TodoList({
    listId,
    title,
    items = [],
    onItemsChange,
    onAddTask,
    onDeleteTask,
    onToggleTask,
    onRequestRename,
    onDeleteList,
    onEditTask,
}) {

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newText, setNewText] = useState("");

    // Drag state
    const [draggingId, setDraggingId] = useState(null);
    const [dragStartX, setDragStartX] = useState(null);
    const [deletePreviewId, setDeletePreviewId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingText, setEditingText] = useState("");
    const menuRef = useRef(null);
    const editLongPressTimerRef = useRef(null);
    const pointerSwipeRef = useRef({ active: false, id: null, startX: 0, startY: 0, directionLocked: false });

    const totalCount = items.length;
    const doneCount = useMemo(() => items.filter((i) => i.done).length, [items]);

    const visibleItems = useMemo(() => {
        return hideCompleted ? items.filter((i) => !i.done) : items;
    }, [items, hideCompleted]);

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
        setIsCollapsed((prev) => !prev);
        setIsAddOpen(false);
    }

    function openAdd() {
        setNewText("");
        setIsAddOpen(true);
        setIsCollapsed(false);
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
        if (editingTaskId) {
            clearEditLongPressTimer();
        }
    }, [editingTaskId]);

    function handleRenameList() {
        onRequestRename(listId);
    }

    function handleDeleteList() {
        const confirmed = window.confirm(
            `Delete to-do list \"${title}\"? This cannot be undone.`
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
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
        }
    }

    function handleDragOver(e, overId) {
        e.preventDefault();
        if (!draggingId || draggingId === overId || deletingId || editingTaskId) return;

        updateItems((prev) => {
            const fromIndex = prev.findIndex((i) => i.id === draggingId);
            const toIndex = prev.findIndex((i) => i.id === overId);
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
                return prev;
            }

            const newItems = [...prev];
            const [moved] = newItems.splice(fromIndex, 1);
            newItems.splice(toIndex, 0, moved);
            return newItems;
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
            setDraggingId(null);
            setDragStartX(null);
            setDeletePreviewId(null);
        }
    }

    // ----- Touch swipe-to-delete (pointer events, works on mobile) -----

    function handleItemPointerDown(e, itemId) {
        if (e.pointerType === "mouse") return; // desktop uses drag events
        if (editingTaskId || deletingId) return;
        pointerSwipeRef.current = { active: true, id: itemId, startX: e.clientX, startY: e.clientY, directionLocked: false };
    }

    function handleItemPointerMove(e, itemId) {
        const swipe = pointerSwipeRef.current;
        if (!swipe.active || swipe.id !== itemId) return;

        const dx = e.clientX - swipe.startX;
        const dy = Math.abs(e.clientY - swipe.startY);

        if (!swipe.directionLocked) {
            // More vertical than horizontal — user is scrolling, not swiping
            if (dy > Math.abs(dx) && dy > 5) {
                pointerSwipeRef.current.active = false;
                setDeletePreviewId(null);
                return;
            }
            if (Math.abs(dx) > 5) {
                pointerSwipeRef.current.directionLocked = true;
                clearEditLongPressTimer(); // cancel long-press edit if swiping
            }
        }

        if (dx > DELETE_THRESHOLD) {
            setDeletePreviewId(itemId);
        } else if (deletePreviewId === itemId) {
            setDeletePreviewId(null);
        }
    }

    async function handleItemPointerUp(e, itemId) {
        const swipe = pointerSwipeRef.current;
        if (!swipe.active || swipe.id !== itemId) return;

        const dx = e.clientX - swipe.startX;
        pointerSwipeRef.current = { active: false, id: null, startX: 0, startY: 0, directionLocked: false };

        if (dx > DELETE_THRESHOLD) {
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
    }

    function handleItemPointerCancel(itemId) {
        if (pointerSwipeRef.current.id === itemId) {
            pointerSwipeRef.current = { active: false, id: null, startX: 0, startY: 0, directionLocked: false };
            setDeletePreviewId(null);
        }
    }

    return (
        <section className={`todoList ${isMenuOpen ? "todoList--menuOpen" : ""}`}>
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
                        {doneCount}/{totalCount}
                    </div>
                </div>

                <div className="todoList__headerActions">
                    <button
                        type="button"
                        className="todoList__iconBtn"
                        onClick={(e) => {
                            e.stopPropagation();
                            openAdd();
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        aria-label={`Add a task to ${title}`}
                        title="Add task"
                    >
                        +
                    </button>

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
                </div>
            </header>

            {!isCollapsed && (
                <ul className="todoList__items">
                    {visibleItems.map((item) => {
                        const classes = ["todoList__item"];
                        if (item.id === draggingId)
                            classes.push("todoList__item--dragging");
                        if (item.id === deletePreviewId)
                            classes.push("todoList__item--deletePreview");
                        if (item.id === deletingId)
                            classes.push("todoList__item--deleting");

                        return (
                            <li
                                key={item.id}
                                className={classes.join(" ")}
                                draggable={editingTaskId !== item.id}
                                style={{ touchAction: "pan-y" }}
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
            )}

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
                        <div className="todoList__modalTitle">New task</div>

                        <form
                            className="todoList__modalForm"
                            onSubmit={submitAdd}
                        >
                            <input
                                className="todoList__modalInput"
                                value={newText}
                                onChange={(e) => setNewText(e.target.value)}
                                placeholder="e.g. Buy milk"
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
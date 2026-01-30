import { useMemo, useState } from "react";
import "./TodoList.css";

export default function TodoList({ title, initialItems = [] }) {
    const [items, setItems] = useState(initialItems);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newText, setNewText] = useState("");

    // Drag state
    const [draggingId, setDraggingId] = useState(null);
    const [dragStartX, setDragStartX] = useState(null);
    const [deletePreviewId, setDeletePreviewId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const totalCount = items.length;
    const doneCount = useMemo(() => items.filter((i) => i.done).length, [items]);

    const visibleItems = useMemo(() => {
        return hideCompleted ? items.filter((i) => !i.done) : items;
    }, [items, hideCompleted]);

    function toggleItem(id) {
        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
        );
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

    function submitAdd(e) {
        e.preventDefault();
        const value = newText.trim();
        if (!value) return;

        setItems((prev) => [
            ...prev,
            { id: crypto.randomUUID(), text: value, done: false },
        ]);
        closeAdd();
    }

    // ----- Drag & drop logic -----

    const DELETE_THRESHOLD = 40; // px to the right

    function handleDragStart(e, id) {
        setDraggingId(id);
        setDragStartX(e.clientX);
        setDeletePreviewId(null);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
        }
    }

    function handleDragOver(e, overId) {
        e.preventDefault();
        if (!draggingId || draggingId === overId || deletingId) return;

        setItems((prev) => {
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
        if (!dragStartX || deletingId) return;
        if (!e.clientX) return;

        const dx = e.clientX - dragStartX;

        // While dragging: preview delete if far enough to the right
        if (dx > DELETE_THRESHOLD) {
            setDeletePreviewId(id);
        } else if (deletePreviewId === id) {
            setDeletePreviewId(null);
        }
    }

    function handleDragEnd(e, id) {
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

            setTimeout(() => {
                setItems((prev) => prev.filter((i) => i.id !== id));
                setDeletingId(null);
            }, 300); // match CSS duration below
        } else {
            setDraggingId(null);
            setDragStartX(null);
            setDeletePreviewId(null);
        }
    }

    return (
           <section className="todoList">
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
                           className="todoList__toggleDoneBtn"
                           aria-pressed={hideCompleted}
                           onClick={(e) => {
                               e.stopPropagation();
                               setHideCompleted((prev) => !prev);
                           }}
                           onKeyDown={(e) => e.stopPropagation()}
                           title={
                               hideCompleted
                                   ? "Show completed items"
                                   : "Hide completed items"
                           }
                       >
                           {hideCompleted ? "Show done" : "Hide done"}
                       </button>

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
                                   draggable
                                   onDragStart={(e) =>
                                       handleDragStart(e, item.id)
                                   }
                                   onDragOver={(e) => handleDragOver(e, item.id)}
                                   onDrag={(e) => handleDrag(e, item.id)}
                                   onDragEnd={(e) => handleDragEnd(e, item.id)}
                               >
                                   <label className="todoList__label">
                                       <input
                                           className="todoList__checkbox"
                                           type="checkbox"
                                           checked={item.done}
                                           onChange={() => toggleItem(item.id)}
                                       />
                                       <span
                                           className={
                                               item.done
                                                   ? "todoList__text todoList__text--done"
                                                   : "todoList__text"
                                           }
                                       >
                                           {item.text}
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
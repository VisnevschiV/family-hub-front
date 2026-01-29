import { useMemo, useState } from "react";
import "./TodoList.css";

export default function TodoList({ title, initialItems = [] }) {
    const [items, setItems] = useState(initialItems);

    const remainingCount = useMemo(
        () => items.filter((i) => !i.done).length,
        [items]
    );

    function toggleItem(id) {
        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
        );
    }

    return (
        <section className="todoList">
            <header className="todoList__header">
                <h2 className="todoList__title">{title}</h2>
                <div className="todoList__meta">{remainingCount} left</div>
            </header>

            <ul className="todoList__items">
                {items.map((item) => (
                    <li key={item.id} className="todoList__item">
                        <label className="todoList__label">
                            <input
                                className="todoList__checkbox"
                                type="checkbox"
                                checked={item.done}
                                onChange={() => toggleItem(item.id)}
                            />
                            <span className={item.done ? "todoList__text todoList__text--done" : "todoList__text"}>
                {item.text}
              </span>
                        </label>
                    </li>
                ))}
            </ul>
        </section>
    );
}
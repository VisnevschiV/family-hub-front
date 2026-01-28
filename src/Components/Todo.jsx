import { useMemo, useState } from "react";

function Todo({ initialItems }) {
    const [text, setText] = useState("");
    const [items, setItems] = useState(() => {
        if (Array.isArray(initialItems) && initialItems.length > 0) {
            return initialItems.map((x) => ({
                id: x.id ?? safeId(),
                title: String(x.title ?? ""),
                done: Boolean(x.done),
            }));
        }
        return [{ id: safeId(), title: "Try Todo component", done: false }];
    });

    const remaining = useMemo(() => items.filter((x) => !x.done).length, [items]);

    function addItem() {
        const title = text.trim();
        if (!title) return;

        setItems((prev) => [{ id: safeId(), title, done: false }, ...prev]);
        setText("");
    }

    function toggle(id) {
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
    }

    function remove(id) {
        setItems((prev) => prev.filter((x) => x.id !== id));
    }

    function clearDone() {
        setItems((prev) => prev.filter((x) => !x.done));
    }

    function onKeyDown(e) {
        if (e.key === "Enter") addItem();
    }

    return (
        <div style={boxStyle}>
            <div style={topRowStyle}>
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Add a todo…"
                    style={inputStyle}
                />
                <button type="button" onClick={addItem}>
                    Add
                </button>
                <button type="button" onClick={clearDone} disabled={!items.some((x) => x.done)}>
                    Clear done
                </button>
            </div>

            <div style={{ opacity: 0.85, marginBottom: 10 }}>
                Total: <strong>{items.length}</strong> · Remaining: <strong>{remaining}</strong>
            </div>

            <ul style={listStyle}>
                {items.map((item) => (
                    <li key={item.id} style={itemRowStyle}>
                        <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                            <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => toggle(item.id)}
                            />
                            <span style={{ textDecoration: item.done ? "line-through" : "none" }}>
                {item.title}
              </span>
                        </label>

                        <button type="button" onClick={() => remove(item.id)}>
                            Remove
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function safeId() {
    // Avoid relying solely on crypto in case the environment changes
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

const boxStyle = {
    border: "1px dashed rgba(255,255,255,0.22)",
    borderRadius: 12,
    padding: 12,
};

const topRowStyle = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 10,
};

const inputStyle = {
    flex: 1,
    minWidth: 220,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.18)",
    color: "inherit",
};

const listStyle = {
    margin: 0,
    paddingLeft: 18,
    display: "grid",
    gap: 8,
};

const itemRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
};

export default Todo;
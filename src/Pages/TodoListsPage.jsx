import TodoList from "../Components/TodoList.jsx";

export default function TodoListsPage() {
    const lists = [
        {
            id: "home",
            title: "Home",
            initialItems: [
                { id: "h1", text: "Take out trash", done: false },
                { id: "h2", text: "Clean kitchen", done: true },
            ],
        },
        {
            id: "shopping",
            title: "Shopping",
            initialItems: [
                { id: "s1", text: "Milk", done: false },
                { id: "s2", text: "Eggs", done: false },
            ],
        },
    ];

    return (
        <div style={{ padding: 24, display: "grid", gap: 16 }}>
            <h1 style={{ margin: 0 }}>To‑Do Lists</h1>

            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                {lists.map((list) => (
                    <TodoList
                        key={list.id}
                        title={list.title}
                        initialItems={list.initialItems}
                    />
                ))}
            </div>
        </div>
    );
}
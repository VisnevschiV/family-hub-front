import TodoList from "../../Components/TodoList.jsx";
import { fetchProtectedData } from "../../api/fetchProtectedDataService.js";

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

    // Optional: quick smoke test that your token works on a protected endpoint
    // useEffect(() => {
    //     fetchProtectedData()
    //         .then((data) => console.log("Protected data:", data))
    //         .catch((err) => console.error("Protected call failed:", err));
    // }, []);

    return (
        <div className="page">
            <header className="page__header">
                <h1 className="page__title">Shared To-Do</h1>
                <p className="page__subtitle">
                    Coordinate chores, shopping, and reminders together.
                </p>
            </header>

            <div className="page__grid">
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
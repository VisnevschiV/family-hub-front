import Calendar from "../Components/Calendar.jsx";
import Todo from "../Components/Todo.jsx";

function TestPage() {
    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
            <header style={{ marginBottom: 16 }}>
                <h1 style={{ margin: 0 }}>Test Page</h1>
                <p style={{ margin: "8px 0 0", opacity: 0.8 }}>
                    A playground to develop and verify components without integrating full flows yet.
                </p>
            </header>

            <div style={gridStyle}>
                <section style={cardStyle}>
                    <h2 style={h2Style}>Calendar (component)</h2>
                    <Calendar />
                </section>

                <section style={cardStyle}>
                    <h2 style={h2Style}>Todo (component)</h2>
                    <Todo />
                </section>
            </div>
        </div>
    );
}

const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: 12,
    alignItems: "start",
};

const cardStyle = {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 16,
    background: "rgba(255,255,255,0.04)",
};

const h2Style = { margin: "0 0 12px" };

export default TestPage;
function DashboardPage() {
    return (
        <div className="page">
            <header className="page__header">
                <h1 className="page__title">Family Dashboard</h1>
                <p className="page__subtitle">
                    A quick look at your shared tasks, events, and updates.
                </p>
            </header>

            <section className="page__grid">
                <div className="card">
                    <h2 className="card__title">Today</h2>
                    <p className="card__text">
                        Upcoming events and tasks will appear here.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Shared To-Do</h2>
                    <p className="card__text">
                        Most recent tasks and progress will show here.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Family Notes</h2>
                    <p className="card__text">
                        Quick updates and reminders for everyone.
                    </p>
                </div>
            </section>
        </div>
    );
}

export default DashboardPage;

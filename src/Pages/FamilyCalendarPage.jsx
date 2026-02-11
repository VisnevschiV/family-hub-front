function FamilyCalendarPage() {
    return (
        <div className="page">
            <header className="page__header">
                <h1 className="page__title">Shared Calendar</h1>
                <p className="page__subtitle">
                    Track events, trips, and family milestones together.
                </p>
            </header>

            <section className="page__grid">
                <div className="card">
                    <h2 className="card__title">Upcoming Events</h2>
                    <p className="card__text">
                        This is where the calendar view will live.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Create Event</h2>
                    <p className="card__text">
                        Add events with start and end dates.
                    </p>
                </div>
            </section>
        </div>
    );
}

export default FamilyCalendarPage;

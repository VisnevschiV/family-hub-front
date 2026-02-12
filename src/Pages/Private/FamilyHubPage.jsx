function FamilyHubPage() {
    return (
        <div className="page">
            <header className="page__header">
                <h1 className="page__title">Family Hub</h1>
                <p className="page__subtitle">
                    Manage your family group and shared spaces.
                </p>
            </header>

            <section className="page__grid">
                <div className="card">
                    <h2 className="card__title">Invitation Code</h2>
                    <p className="card__text">
                        Create or join a family using a code.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Members</h2>
                    <p className="card__text">
                        View members and admin actions for the group.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Shared Spaces</h2>
                    <p className="card__text">
                        Quick links to the shared calendar and to-do list.
                    </p>
                </div>
            </section>
        </div>
    );
}

export default FamilyHubPage;

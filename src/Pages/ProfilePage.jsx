function ProfilePage() {
    return (
        <div className="page">
            <header className="page__header">
                <h1 className="page__title">Profile & Family</h1>
                <p className="page__subtitle">
                    Manage your personal details and family settings in one place.
                </p>
            </header>

            <section className="page__grid">
                <div className="card">
                    <h2 className="card__title">Personal Info</h2>
                    <p className="card__text">
                        Name, birthday, and contact details go here.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Security</h2>
                    <p className="card__text">
                        Change your password and manage sessions.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Invite Members</h2>
                    <p className="card__text">
                        Generate and share your family invitation code.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Member Roles</h2>
                    <p className="card__text">
                        Everyone is admin by default, adjust later.
                    </p>
                </div>
                <div className="card">
                    <h2 className="card__title">Leave Family</h2>
                    <p className="card__text">
                        Remove yourself from the family group.
                    </p>
                </div>
            </section>
        </div>
    );
}

export default ProfilePage;

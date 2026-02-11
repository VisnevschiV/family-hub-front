import { Link } from "react-router-dom";
import "./WelcomePage.css";

function WelcomePage() {
    return (
        <div className="welcome">
            <div className="welcome__bg">
                <div className="welcome__blob welcome__blob--one" />
                <div className="welcome__blob welcome__blob--two" />
            </div>

            <header className="welcome__header">
                <div className="welcome__brand">
                    <div className="welcome__logo">FH</div>
                    <div>
                        <div className="welcome__title">Family Hub</div>
                        <div className="welcome__subtitle">Shared life, organized</div>
                    </div>
                </div>
                <div className="welcome__actions">
                    <Link className="welcome__link" to="/login">
                        Log in
                    </Link>
                    <Link className="welcome__cta" to="/register">
                        Create account
                    </Link>
                </div>
            </header>

            <main className="welcome__main">
                <section className="welcome__hero">
                    <div className="welcome__heroText">
                        <div className="welcome__eyebrow">Made for real families</div>
                        <h1 className="welcome__headline">
                            One calm place for all your family plans.
                        </h1>
                        <p className="welcome__lead">
                            Keep everyone in sync with shared tasks, calendars, and
                            family updates that feel warm and effortless.
                        </p>
                        <div className="welcome__heroActions">
                            <Link className="welcome__cta" to="/register">
                                Get started
                            </Link>
                            <Link className="welcome__ghost" to="/login">
                                I already have an account
                            </Link>
                        </div>
                    </div>
                    <div className="welcome__heroCard">
                        <div className="welcome__heroCardTitle">This week</div>
                        <div className="welcome__heroCardBody">
                            <div className="welcome__heroItem">
                                <span className="welcome__dot" />
                                Family dinner on Thursday
                            </div>
                            <div className="welcome__heroItem">
                                <span className="welcome__dot" />
                                Pack for weekend trip
                            </div>
                            <div className="welcome__heroItem">
                                <span className="welcome__dot" />
                                Grocery run with shared list
                            </div>
                        </div>
                        <div className="welcome__heroFooter">All in one hub</div>
                    </div>
                </section>

                <section className="welcome__grid">
                    <div className="welcome__panel">
                        <h2 className="welcome__panelTitle">Invite your family</h2>
                        <p className="welcome__panelText">
                            Create a family space and share an invitation code in
                            seconds.
                        </p>
                    </div>
                    <div className="welcome__panel">
                        <h2 className="welcome__panelTitle">Plan together</h2>
                        <p className="welcome__panelText">
                            Use a shared to-do list and calendar for tasks, trips,
                            and events.
                        </p>
                    </div>
                    <div className="welcome__panel">
                        <h2 className="welcome__panelTitle">Stay flexible</h2>
                        <p className="welcome__panelText">
                            Everyone has admin rights so plans stay easy to update.
                        </p>
                    </div>
                </section>

                <section className="welcome__ctaPanel">
                    <div>
                        <h2 className="welcome__panelTitle">Ready to bring everyone in?</h2>
                        <p className="welcome__panelText">
                            Start with a free account and invite your family when you are
                            ready.
                        </p>
                    </div>
                    <Link className="welcome__cta" to="/register">
                        Create your family hub
                    </Link>
                </section>
            </main>
        </div>
    );
}

export default WelcomePage;

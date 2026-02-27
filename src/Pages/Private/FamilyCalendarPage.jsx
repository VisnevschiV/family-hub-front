import { useEffect, useMemo, useState } from "react";
import {
    createCalendarEvent,
    deleteCalendarEvent,
    getCalendarEvents,
    updateCalendarEvent,
} from "../../api/calendar.js";
import "./FamilyCalendarPage.css";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function mapBackendEvents(data) {
    const sourceEvents = Array.isArray(data)
        ? data
        : Array.isArray(data?.events)
            ? data.events
            : [];

    return sourceEvents
        .map((eventItem) => {
            const backendId =
                eventItem.id ||
                eventItem.ID ||
                eventItem.eventId ||
                eventItem.eventID ||
                eventItem.uuid;
            const timestampRaw =
                eventItem.time ||
                eventItem.dateTime ||
                eventItem.datetime ||
                eventItem.timestamp ||
                eventItem.start;
            const parsedDate = new Date(timestampRaw);

            if (!backendId || Number.isNaN(parsedDate.getTime())) {
                return null;
            }

            return {
                id: String(backendId),
                title: eventItem.title || eventItem.name || "Untitled event",
                description: eventItem.description || "",
                timestamp: parsedDate.getTime(),
                dateKey: toDateKey(parsedDate),
                timeLabel: parsedDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            };
        })
        .filter(Boolean);
}

function FamilyCalendarPage() {
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [events, setEvents] = useState([]);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [eventTitle, setEventTitle] = useState("");
    const [eventDescription, setEventDescription] = useState("");
    const [eventDateTime, setEventDateTime] = useState("");
    const [editingEventId, setEditingEventId] = useState(null);
    const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
    const [calendarError, setCalendarError] = useState("");

    async function refreshEvents() {
        const data = await getCalendarEvents();
        setEvents(mapBackendEvents(data));
    }

    useEffect(() => {
        let active = true;

        getCalendarEvents()
            .then((data) => {
                if (!active) return;
                setEvents(mapBackendEvents(data));
            })
            .catch((error) => {
                if (!active) return;
                setCalendarError(error.message || "Failed to load calendar events");
            });

        return () => {
            active = false;
        };
    }, []);

    const monthLabel = useMemo(
        () =>
            visibleMonth.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
            }),
        [visibleMonth]
    );

    const dayCells = useMemo(() => {
        const year = visibleMonth.getFullYear();
        const month = visibleMonth.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const firstWeekday = firstDayOfMonth.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];

        for (let index = 0; index < firstWeekday; index += 1) {
            cells.push({
                key: `empty-start-${index}`,
                isCurrentMonth: false,
                dayNumber: null,
                isToday: false,
                dateKey: null,
                dayEvents: [],
            });
        }

        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();
        const todayDate = today.getDate();

        for (let day = 1; day <= daysInMonth; day += 1) {
            const isToday = year === todayYear && month === todayMonth && day === todayDate;
            const dateKey = toDateKey(new Date(year, month, day));
            const dayEvents = events
                .filter((eventItem) => eventItem.dateKey === dateKey)
                .sort((a, b) => a.timestamp - b.timestamp);

            cells.push({
                key: `day-${day}`,
                isCurrentMonth: true,
                dayNumber: day,
                isToday,
                dateKey,
                dayEvents,
            });
        }

        const remainder = cells.length % 7;
        const trailingDays = remainder === 0 ? 0 : 7 - remainder;

        for (let index = 0; index < trailingDays; index += 1) {
            cells.push({
                key: `empty-end-${index}`,
                isCurrentMonth: false,
                dayNumber: null,
                isToday: false,
                dateKey: null,
                dayEvents: [],
            });
        }

        return cells;
    }, [events, visibleMonth]);

    function showPreviousMonth() {
        setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
    }

    function showNextMonth() {
        setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
    }

    function showCurrentMonth() {
        const now = new Date();
        setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }

    function openCreateModal() {
        const now = new Date();
        const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        setEventDateTime(localNow.toISOString().slice(0, 16));
        setEventTitle("");
        setEventDescription("");
        setEditingEventId(null);
        setCreateModalOpen(true);
    }

    function openEditModal(eventItem) {
        const localValue = new Date(eventItem.timestamp - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);

        setEventTitle(eventItem.title);
        setEventDescription(eventItem.description || "");
        setEventDateTime(localValue);
        setEditingEventId(eventItem.id);
        setCreateModalOpen(true);
    }

    function closeCreateModal() {
        setCreateModalOpen(false);
        setEditingEventId(null);
    }

    async function handleCreateEvent(event) {
        event.preventDefault();

        const title = eventTitle.trim();
        const description = eventDescription.trim();
        if (!title || !eventDateTime) return;

        const parsedDate = new Date(eventDateTime);
        if (Number.isNaN(parsedDate.getTime())) return;

        const isoTime = parsedDate.toISOString();

        try {
            setCalendarError("");

            if (editingEventId) {
                await updateCalendarEvent(editingEventId, title, description, isoTime);
            } else {
                await createCalendarEvent(title, description, isoTime);
            }

            await refreshEvents();
            const updatedDateKey = toDateKey(parsedDate);
            setVisibleMonth(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
            setSelectedDateKey(updatedDateKey);
            closeCreateModal();
        } catch (error) {
            setCalendarError(error.message || "Failed to save event");
        }
    }

    async function handleDeleteEvent() {
        if (!editingEventId) return;

        try {
            setCalendarError("");
            await deleteCalendarEvent(editingEventId);
            await refreshEvents();
            closeCreateModal();
        } catch (error) {
            setCalendarError(error.message || "Failed to delete event");
        }
    }

    const selectedDateLabel = useMemo(() => {
        const [year, month, day] = selectedDateKey.split("-").map(Number);
        if (!year || !month || !day) return "Selected day";
        return new Date(year, month - 1, day).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    }, [selectedDateKey]);

    const selectedDateEvents = useMemo(
        () =>
            events
                .filter((eventItem) => eventItem.dateKey === selectedDateKey)
                .sort((a, b) => a.timestamp - b.timestamp),
        [events, selectedDateKey]
    );

    return (
        <div className="page">
            <header className="page__header">
                <h1 className="page__title">Shared Calendar</h1>
                <p className="page__subtitle">Track events, trips, and family milestones together.</p>
            </header>

            {calendarError ? <p className="calendarView__error">{calendarError}</p> : null}

            <section className="card calendarView">
                <div className="calendarView__toolbar">
                    <button type="button" className="calendarView__button" onClick={showPreviousMonth}>
                        Previous
                    </button>
                    <h2 className="calendarView__monthLabel">{monthLabel}</h2>
                    <div className="calendarView__toolbarRight">
                        <button type="button" className="calendarView__button" onClick={openCreateModal}>
                            Create event
                        </button>
                        <button type="button" className="calendarView__button" onClick={showCurrentMonth}>
                            Today
                        </button>
                        <button type="button" className="calendarView__button" onClick={showNextMonth}>
                            Next
                        </button>
                    </div>
                </div>

                <div className="calendarView__weekHeader" role="row">
                    {WEEK_DAYS.map((day) => (
                        <div key={day} className="calendarView__weekDay" role="columnheader">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="calendarView__grid" role="grid" aria-label={monthLabel}>
                    {dayCells.map((cell) => (
                        <div
                            key={cell.key}
                            className={`calendarView__cell ${cell.isCurrentMonth ? "calendarView__cell--current" : "calendarView__cell--empty"
                                } ${cell.isToday ? "calendarView__cell--today" : ""} ${cell.dateKey && cell.dateKey === selectedDateKey ? "calendarView__cell--selected" : ""
                                }`}
                            role="gridcell"
                            onClick={cell.dateKey ? () => setSelectedDateKey(cell.dateKey) : undefined}
                        >
                            {cell.dayNumber ? (
                                <>
                                    <span className="calendarView__dayNumber">{cell.dayNumber}</span>
                                    <div className="calendarView__events">
                                        {cell.dayEvents.slice(0, 2).map((eventItem) => (
                                            <div
                                                key={eventItem.id}
                                                className="calendarView__eventItem"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openEditModal(eventItem);
                                                }}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === " ") {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        openEditModal(eventItem);
                                                    }
                                                }}
                                            >
                                                <div className="calendarView__eventTime">{eventItem.timeLabel}</div>
                                                <div className="calendarView__eventTitle">{eventItem.title}</div>
                                                {eventItem.description ? (
                                                    <div className="calendarView__eventDescription">
                                                        {eventItem.description}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                        {cell.dayEvents.length > 2 ? (
                                            <div className="calendarView__moreEvents">
                                                +{cell.dayEvents.length - 2} more
                                            </div>
                                        ) : null}
                                    </div>
                                </>
                            ) : null}
                        </div>
                    ))}
                </div>
            </section>

            <section className="card calendarItinerary">
                <h2 className="card__title">Itinerary · {selectedDateLabel}</h2>
                {selectedDateEvents.length === 0 ? (
                    <p className="card__text">No events planned for this day yet.</p>
                ) : (
                    <div className="calendarItinerary__list">
                        {selectedDateEvents.map((eventItem) => (
                            <article key={eventItem.id} className="calendarItinerary__item">
                                <div className="calendarItinerary__time">{eventItem.timeLabel}</div>
                                <div className="calendarItinerary__content">
                                    <h3 className="calendarItinerary__title">{eventItem.title}</h3>
                                    <p className="calendarItinerary__description">{eventItem.description}</p>
                                </div>
                                <div className="calendarItinerary__actions">
                                    <button
                                        type="button"
                                        className="calendarView__button"
                                        onClick={() => openEditModal(eventItem)}
                                    >
                                        Edit
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {createModalOpen ? (
                <div className="calendarModalOverlay" role="dialog" aria-modal="true">
                    <div className="calendarModalCard">
                        <div className="calendarModalHeader">
                            <div>
                                <h2 className="calendarModalTitle">
                                    {editingEventId ? "Edit event" : "Create new event"}
                                </h2>
                                <p className="calendarModalSubtitle">
                                    {editingEventId
                                        ? "Update title, description, and date/time."
                                        : "Add title, description, and date/time."}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="calendarModalClose"
                                onClick={closeCreateModal}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <form className="calendarModalBody" onSubmit={handleCreateEvent}>
                            <label className="calendarModalField">
                                <span>Title</span>
                                <input
                                    type="text"
                                    value={eventTitle}
                                    onChange={(event) => setEventTitle(event.target.value)}
                                    placeholder="Birthday dinner"
                                    maxLength={120}
                                    required
                                    autoFocus
                                />
                            </label>

                            <label className="calendarModalField">
                                <span>Description</span>
                                <textarea
                                    value={eventDescription}
                                    onChange={(event) => setEventDescription(event.target.value)}
                                    placeholder="Bring dessert and candles"
                                    maxLength={500}
                                    rows={3}
                                    required
                                />
                            </label>

                            <label className="calendarModalField">
                                <span>Date and time</span>
                                <input
                                    type="datetime-local"
                                    value={eventDateTime}
                                    onChange={(event) => setEventDateTime(event.target.value)}
                                    required
                                />
                            </label>

                            <div className="calendarModalActions">
                                {editingEventId ? (
                                    <button
                                        type="button"
                                        className="calendarModalButton calendarModalButton--danger"
                                        onClick={handleDeleteEvent}
                                    >
                                        Delete
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    className="calendarModalButton calendarModalButton--ghost"
                                    onClick={closeCreateModal}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="calendarModalButton">
                                    {editingEventId ? "Save changes" : "Save event"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default FamilyCalendarPage;

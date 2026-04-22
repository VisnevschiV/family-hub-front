import { useEffect, useMemo, useRef, useState } from "react";
import {
    createCalendarEvent,
    deleteCalendarEvent,
    getCalendarEvents,
    updateCalendarEvent,
} from "../../api/calendar.js";
import { getFamilyMembers } from "../../api/families.js";
import { getPeriodMonth, getPeriodProfile, startPeriod, stopPeriod } from "../../api/periodProfile.js";
import "./FamilyCalendarPage/familyCalendarPage.css";
import "./FamilyCalendarPage/familyCalendarPagedesktop.css";
import "./FamilyCalendarPage/familyCalendarPagemobile.css";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_PRESS_DURATION_MS = 450;

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseIsoDate(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function clampDate(date, minDate, maxDate) {
    if (date < minDate) return new Date(minDate);
    if (date > maxDate) return new Date(maxDate);
    return date;
}

function addRangeToKeySet(targetSet, startDate, endDate) {
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
        targetSet.add(toDateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
}

function findOpenPeriodRecord(records) {
    if (!Array.isArray(records)) return null;
    return records.find((record) => Boolean(record?.startDate) && !record?.endDate) || null;
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
                participantIds: extractParticipantIds(eventItem),
                participantNames: extractParticipantNames(eventItem),
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

function extractParticipantIds(eventItem) {
    const candidates =
        eventItem.participants ||
        eventItem.participantIds ||
        eventItem.participantsIds ||
        eventItem.participantIDs ||
        eventItem.attendeeIds ||
        eventItem.memberIds ||
        eventItem.assigneeIds;

    if (Array.isArray(candidates)) {
        return candidates
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value));
    }

    const participantObjects =
        eventItem.participants || eventItem.attendees || eventItem.members || eventItem.assignees;

    if (Array.isArray(participantObjects)) {
        return participantObjects
            .map((participant) => {
                if (participant === null || participant === undefined) return null;
                if (typeof participant === "string" || typeof participant === "number") {
                    const participantId = Number(participant);
                    return Number.isInteger(participantId) ? participantId : null;
                }
                if (typeof participant !== "object") return null;

                const participantId =
                    participant.id ||
                    participant.ID ||
                    participant.personaId ||
                    participant.userId ||
                    participant.memberId;

                const normalizedId = Number(participantId);
                return Number.isInteger(normalizedId) ? normalizedId : null;
            })
            .filter(Boolean);
    }

    return [];
}

function extractParticipantNames(eventItem) {
    const participantObjects =
        eventItem.participants || eventItem.attendees || eventItem.members || eventItem.assignees;

    if (Array.isArray(participantObjects)) {
        return participantObjects
            .map((participant) => {
                if (participant === null || participant === undefined) return null;
                if (typeof participant === "string") return participant;
                if (typeof participant !== "object") return null;

                return (
                    participant.name ||
                    participant.fullName ||
                    participant.displayName ||
                    participant.email ||
                    null
                );
            })
            .filter(Boolean);
    }

    if (Array.isArray(eventItem.participantNames)) {
        return eventItem.participantNames.filter(Boolean);
    }

    return [];
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
    const [familyMembers, setFamilyMembers] = useState([]);
    const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
    const [participantsDropdownOpen, setParticipantsDropdownOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
    const [calendarError, setCalendarError] = useState("");
    const [calendarNotice, setCalendarNotice] = useState("");
    const [startingPeriod, setStartingPeriod] = useState(false);
    const [periodDateKeys, setPeriodDateKeys] = useState(new Set());
    const [periodCurrentlyOpen, setPeriodCurrentlyOpen] = useState(false);
    const [openPeriodStartDateKey, setOpenPeriodStartDateKey] = useState("");
    const longPressTimerRef = useRef(null);
    const longPressTriggeredRef = useRef(false);
    const itinerarySectionRef = useRef(null);

    function clearLongPressTimer() {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }

    useEffect(
        () => () => {
            clearLongPressTimer();
        },
        []
    );

    async function refreshEvents() {
        const data = await getCalendarEvents();
        setEvents(mapBackendEvents(data));
    }

    useEffect(() => {
        let active = true;

        Promise.all([getCalendarEvents(), getFamilyMembers()])
            .then(([eventsData, membersData]) => {
                if (!active) return;
                setEvents(mapBackendEvents(eventsData));
                setFamilyMembers(Array.isArray(membersData) ? membersData : []);
            })
            .catch((error) => {
                if (!active) return;
                setCalendarError(error.message || "Failed to load calendar data");
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        async function loadPeriodForMonth() {
            const year = visibleMonth.getFullYear();
            const month = visibleMonth.getMonth() + 1;
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0);
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const isFutureMonth = monthStart > currentMonthStart;

            try {
                const [monthData, profile] = await Promise.all([
                    getPeriodMonth(year, month),
                    getPeriodProfile().catch(() => null),
                ]);

                if (!active) return;

                const periodLength = Number(profile?.periodLengthDays) || 5;
                const nextPeriodKeys = new Set();

                const records = Array.isArray(monthData?.records) ? monthData.records : [];
                const openRecord = findOpenPeriodRecord(records);

                if (openRecord) {
                    setPeriodCurrentlyOpen(true);
                    setOpenPeriodStartDateKey(openRecord.startDate || "");
                } else {
                    setPeriodCurrentlyOpen(false);
                    setOpenPeriodStartDateKey("");
                }

                for (const record of records) {
                    const startDate = parseIsoDate(record?.startDate);
                    if (!startDate) continue;

                    const endDate = record?.endDate
                        ? parseIsoDate(record.endDate)
                        : addDays(startDate, Math.max(periodLength - 1, 0));
                    if (!endDate) continue;

                    // Skip ranges that do not overlap the current month at all.
                    if (endDate < monthStart || startDate > monthEnd) {
                        continue;
                    }

                    const clampedStart = clampDate(startDate, monthStart, monthEnd);
                    const clampedEnd = clampDate(endDate, monthStart, monthEnd);

                    if (clampedStart <= clampedEnd) {
                        addRangeToKeySet(nextPeriodKeys, clampedStart, clampedEnd);
                    }
                }

                // For future months, when no records exist, rely on backend prediction.
                if (isFutureMonth && records.length === 0) {
                    const predictionStart = parseIsoDate(monthData?.prediction?.startDate);
                    if (predictionStart) {
                        const predictionEnd = monthData?.prediction?.endDate
                            ? parseIsoDate(monthData.prediction.endDate)
                            : addDays(predictionStart, Math.max(periodLength - 1, 0));

                        if (predictionEnd) {
                            const clampedStart = clampDate(predictionStart, monthStart, monthEnd);
                            const clampedEnd = clampDate(predictionEnd, monthStart, monthEnd);

                            if (clampedStart <= clampedEnd) {
                                addRangeToKeySet(nextPeriodKeys, clampedStart, clampedEnd);
                            }
                        }
                    }
                }

                setPeriodDateKeys(nextPeriodKeys);
            } catch {
                if (!active) return;
                setPeriodDateKeys(new Set());
            }
        }

        loadPeriodForMonth();

        return () => {
            active = false;
        };
    }, [visibleMonth]);

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

    function openCreateModalForDate(dateKey) {
        const targetDateKey = dateKey || selectedDateKey || toDateKey(new Date());
        const [year, month, day] = targetDateKey.split("-").map(Number);
        const hasValidDate =
            Number.isInteger(year) &&
            Number.isInteger(month) &&
            Number.isInteger(day) &&
            month >= 1 &&
            month <= 12 &&
            day >= 1 &&
            day <= 31;

        const now = new Date();
        const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        if (hasValidDate) {
            setSelectedDateKey(targetDateKey);
            setVisibleMonth(new Date(year, month - 1, 1));
        }

        setEventDateTime(defaultTime);
        setEventTitle("");
        setEventDescription("");
        setSelectedParticipantIds([]);
        setParticipantsDropdownOpen(false);
        setEditingEventId(null);
        setCalendarNotice("");
        setCreateModalOpen(true);
    }

    function handleCellPointerDown(event, cell) {
        if (!cell?.dateKey) return;

        if (event.target instanceof Element && event.target.closest(".calendarView__eventItem")) {
            return;
        }

        longPressTriggeredRef.current = false;
        clearLongPressTimer();

        longPressTimerRef.current = window.setTimeout(() => {
            longPressTriggeredRef.current = true;
            openCreateModalForDate(cell.dateKey);
        }, LONG_PRESS_DURATION_MS);
    }

    function handleCellPointerEnd() {
        clearLongPressTimer();
    }

    function selectDateAndScroll(dateKey) {
        setSelectedDateKey(dateKey);

        window.requestAnimationFrame(() => {
            itinerarySectionRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    }

    function openEditModal(eventItem) {
        const localValue = new Date(eventItem.timestamp - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);

        setEventTitle(eventItem.title);
        setEventDescription(eventItem.description || "");
        setEventDateTime(localValue);
        setSelectedParticipantIds(Array.isArray(eventItem.participantIds) ? eventItem.participantIds : []);
        setParticipantsDropdownOpen(false);
        setEditingEventId(eventItem.id);
        setCalendarNotice("");
        setCreateModalOpen(true);
    }

    function closeCreateModal() {
        setCreateModalOpen(false);
        setEditingEventId(null);
        setParticipantsDropdownOpen(false);
        setCalendarNotice("");
    }

    function toggleParticipant(participantId) {
        setSelectedParticipantIds((current) => {
            if (current.includes(participantId)) {
                return current.filter((id) => id !== participantId);
            }
            return [...current, participantId];
        });
    }

    async function handleCreateEvent(event) {
        event.preventDefault();

        const title = eventTitle.trim();
        const description = eventDescription.trim();
        if (!title || !eventDateTime) return;

        let parsedDate = null;

        if (editingEventId) {
            parsedDate = new Date(eventDateTime);
        } else {
            const [year, month, day] = selectedDateKey.split("-").map(Number);
            const [hoursRaw, minutesRaw] = eventDateTime.split(":");
            const hours = Number(hoursRaw);
            const minutes = Number(minutesRaw);

            if (
                !Number.isInteger(year) ||
                !Number.isInteger(month) ||
                !Number.isInteger(day) ||
                Number.isNaN(hours) ||
                Number.isNaN(minutes)
            ) {
                return;
            }

            parsedDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        }

        if (Number.isNaN(parsedDate.getTime())) return;

        const isoTime = parsedDate.toISOString();

        try {
            setCalendarError("");

            if (editingEventId) {
                await updateCalendarEvent(
                    editingEventId,
                    title,
                    description,
                    isoTime,
                    selectedParticipantIds
                );
            } else {
                await createCalendarEvent(title, description, isoTime, selectedParticipantIds);
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

    async function handleStartPeriodForSelectedDay() {
        if (editingEventId || startingPeriod || !selectedDateKey) return;

        const todayKey = toDateKey(new Date());
        if (selectedDateKey > todayKey) {
            setCalendarError("Period date cannot be in the future.");
            setCalendarNotice("");
            return;
        }

        if (
            periodCurrentlyOpen &&
            openPeriodStartDateKey &&
            selectedDateKey < openPeriodStartDateKey
        ) {
            setCalendarError(
                `Stop date cannot be before the start date (${openPeriodStartDateKey}).`
            );
            setCalendarNotice("");
            return;
        }

        try {
            setStartingPeriod(true);
            setCalendarError("");
            setCalendarNotice("");

            if (periodCurrentlyOpen) {
                await stopPeriod(selectedDateKey);
                setPeriodCurrentlyOpen(false);
                setOpenPeriodStartDateKey("");
                setCalendarNotice(`Period stopped on ${selectedDateKey}.`);
            } else {
                await startPeriod(selectedDateKey);
                setPeriodCurrentlyOpen(true);
                setOpenPeriodStartDateKey(selectedDateKey);
                setCalendarNotice(`Period started on ${selectedDateKey}.`);
            }
        } catch (error) {
            setCalendarError(error.message || `Failed to ${periodCurrentlyOpen ? "stop" : "start"} period`);
        } finally {
            setStartingPeriod(false);
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

    const selectedParticipantLabels = useMemo(() => {
        if (selectedParticipantIds.length === 0) {
            return "Family";
        }

        const membersById = new Map(familyMembers.map((member) => [member.id, member.name]));
        return selectedParticipantIds
            .map((participantId) => membersById.get(participantId) || participantId)
            .join(", ");
    }, [familyMembers, selectedParticipantIds]);

    return (
        <div className="page">
            <header className="page__header">
                <h1 className="page__title">Shared Calendar</h1>
                <p className="page__subtitle">Track events, trips, and family milestones together.</p>
            </header>

            {calendarError ? <p className="calendarView__error">{calendarError}</p> : null}
            {calendarNotice ? <p className="calendarView__notice">{calendarNotice}</p> : null}

            <section className="card calendarView">
                <div className="calendarView__toolbar">
                    <h2 className="calendarView__monthLabel">{monthLabel}</h2>
                    <div className="calendarView__toolbarRight">
                        <button type="button" className="calendarView__button" onClick={showPreviousMonth} aria-label="Previous month">
                            &lt;
                        </button>
                        <button type="button" className="calendarView__button" onClick={showCurrentMonth}>
                            Today
                        </button>
                        <button type="button" className="calendarView__button" onClick={showNextMonth} aria-label="Next month">
                            &gt;
                        </button>
                    </div>
                </div>

                <div className="calendarView__weekHeader" role="row">
                    {WEEK_DAYS.map((day, dayIndex) => (
                        <div
                            key={day}
                            className={`calendarView__weekDay ${dayIndex === 0 || dayIndex === 6 ? "calendarView__weekDay--weekend" : ""}`}
                            role="columnheader"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                <div className="calendarView__grid" role="grid" aria-label={monthLabel}>
                    {dayCells.map((cell, cellIndex) => (
                        <div
                            key={cell.key}
                            className={`calendarView__cell ${cell.isCurrentMonth ? "calendarView__cell--current" : "calendarView__cell--empty"
                                } ${cell.isToday ? "calendarView__cell--today" : ""} ${cell.dateKey && cell.dateKey === selectedDateKey ? "calendarView__cell--selected" : ""
                                } ${cellIndex % 7 === 0 || cellIndex % 7 === 6 ? "calendarView__cell--weekend" : ""
                                } ${cell.dateKey && periodDateKeys.has(cell.dateKey) ? "calendarView__cell--period" : ""
                                }`}
                            role="gridcell"
                            onClick={cell.dateKey ? () => {
                                if (longPressTriggeredRef.current) {
                                    longPressTriggeredRef.current = false;
                                    return;
                                }
                                selectDateAndScroll(cell.dateKey);
                            } : undefined}
                            onDoubleClick={cell.dateKey ? () => openCreateModalForDate(cell.dateKey) : undefined}
                            onPointerDown={cell.dateKey ? (event) => handleCellPointerDown(event, cell) : undefined}
                            onPointerUp={cell.dateKey ? handleCellPointerEnd : undefined}
                            onPointerLeave={cell.dateKey ? handleCellPointerEnd : undefined}
                            onPointerCancel={cell.dateKey ? handleCellPointerEnd : undefined}
                        >
                            {cell.dayNumber ? (
                                <>
                                    <span className="calendarView__dayNumber">{cell.dayNumber}</span>
                                    <div className="calendarView__events">
                                        {cell.dayEvents.slice(0, 2).map((eventItem) => (
                                            <div
                                                key={eventItem.id}
                                                className="calendarView__eventItem"
                                            >
                                                <div className="calendarView__eventTime">{eventItem.timeLabel}</div>
                                                <div className="calendarView__eventTitle">{eventItem.title}</div>
                                                {eventItem.participantNames.length > 0 ? (
                                                    <div className="calendarView__eventDescription">
                                                        With: {eventItem.participantNames.join(", ")}
                                                    </div>
                                                ) : null}
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

            <section ref={itinerarySectionRef} className="card calendarItinerary">
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
                                    {eventItem.participantNames.length > 0 ? (
                                        <p className="calendarItinerary__description">
                                            With: {eventItem.participantNames.join(", ")}
                                        </p>
                                    ) : null}
                                    <p className="calendarItinerary__description">{eventItem.description}</p>
                                    <button
                                        type="button"
                                        className="calendarItinerary__detailsButton"
                                        onClick={() => openEditModal(eventItem)}
                                    >
                                        View details / Modify
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
                                        : "Date is set from your selected day. Add title, details, and time."}
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

                            {editingEventId ? (
                                <label className="calendarModalField">
                                    <span>Date and time</span>
                                    <input
                                        type="datetime-local"
                                        value={eventDateTime}
                                        onChange={(event) => setEventDateTime(event.target.value)}
                                        required
                                    />
                                </label>
                            ) : (
                                <>
                                    <label className="calendarModalField">
                                        <span>Date</span>
                                        <input type="text" value={selectedDateLabel} readOnly />
                                    </label>

                                    <label className="calendarModalField">
                                        <span>Time</span>
                                        <input
                                            type="time"
                                            value={eventDateTime}
                                            onChange={(event) => setEventDateTime(event.target.value)}
                                            required
                                        />
                                    </label>
                                </>
                            )}

                            <div className="calendarModalField">
                                <span>Participants</span>
                                <button
                                    type="button"
                                    className="calendarParticipants__trigger"
                                    onClick={() =>
                                        setParticipantsDropdownOpen((current) => !current)
                                    }
                                >
                                    {selectedParticipantLabels}
                                </button>

                                {participantsDropdownOpen ? (
                                    <div className="calendarParticipants__menu">
                                        {familyMembers.length === 0 ? (
                                            <p className="calendarParticipants__empty">
                                                No family members available
                                            </p>
                                        ) : (
                                            familyMembers.map((member) => {
                                                const isSelected = selectedParticipantIds.includes(member.id);

                                                return (
                                                    <label
                                                        key={member.id}
                                                        className="calendarParticipants__option"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleParticipant(member.id)}
                                                        />
                                                        <span>{member.name}</span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : null}
                            </div>

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
                                {!editingEventId ? (
                                    <button
                                        type="button"
                                        className="calendarModalButton calendarModalButton--period"
                                        onClick={handleStartPeriodForSelectedDay}
                                        disabled={startingPeriod}
                                    >
                                        {startingPeriod
                                            ? periodCurrentlyOpen
                                                ? "Stopping..."
                                                : "Starting..."
                                            : periodCurrentlyOpen
                                                ? "Stop period"
                                                : "Start period"}
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

import { useEffect, useMemo, useRef, useState } from "react";
import {
    createCalendarEvent,
    deleteCalendarEvent,
    getCalendarEvents,
    updateCalendarEvent,
} from "../../api/calendar.js";
import { getFamilyMembers } from "../../api/families.js";
import { fetchCurrentPersona } from "../../api/persona.js";
import NoFamilyBanner from "../../Components/NoFamilyBanner.jsx";
import AddButton from "../../Components/AddButton.jsx";
import SegmentedControl from "../../Components/SegmentedControl.jsx";
import {
    getFamilyPeriodMonth,
    getPeriodMonth,
    getPeriodProfile,
    startPeriod,
    stopPeriod,
} from "../../api/periodProfile.js";
import "./FamilyCalendarPage/familyCalendarPage.css";
import "./FamilyCalendarPage/familyCalendarPagedesktop.css";
import "./FamilyCalendarPage/familyCalendarPagemobile.css";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_PRESS_DURATION_MS = 450;
const MONTH_SWIPE_THRESHOLD_PX = 48;
const DAY_HOURS = Array.from({ length: 25 }, (_, hour) => hour);
const EVENT_BLOCK_MINUTES = 60;
const MIN_EVENT_BLOCK_MINUTES = 30;

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

function parseFlexibleDate(value) {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "string" || typeof value === "number") {
        return parseIsoDate(value);
    }

    if (Array.isArray(value) && value.length >= 3) {
        const [year, month, day] = value.map(Number);
        if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
            return new Date(year, month - 1, day);
        }
        return null;
    }

    if (typeof value === "object") {
        const year = Number(value.year ?? value.y ?? value.YYYY);
        const month = Number(value.month ?? value.monthValue ?? value.MM);
        const day = Number(value.day ?? value.dayOfMonth ?? value.dd);

        if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
            return new Date(year, month - 1, day);
        }

        if (value.date) {
            return parseFlexibleDate(value.date);
        }
    }

    return null;
}

function getRecordStartDate(record) {
    return parseFlexibleDate(
        record?.startDate ||
        record?.periodStartDate ||
        record?.start ||
        record?.from ||
        record?.date
    );
}

function getRecordEndDate(record) {
    return parseFlexibleDate(
        record?.endDate ||
        record?.periodEndDate ||
        record?.end ||
        record?.to
    );
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
    return records.find((record) => Boolean(getRecordStartDate(record)) && !getRecordEndDate(record)) || null;
}

function addMemberNameForDate(targetMap, dateKey, memberName) {
    if (!dateKey || !memberName) return;
    const currentNames = targetMap.get(dateKey) || [];
    if (!currentNames.includes(memberName)) {
        targetMap.set(dateKey, [...currentNames, memberName]);
    }
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
    const [familyPeriodNamesByDate, setFamilyPeriodNamesByDate] = useState(new Map());
    const [periodCurrentlyOpen, setPeriodCurrentlyOpen] = useState(false);
    const [openPeriodStartDateKey, setOpenPeriodStartDateKey] = useState("");
    const [hasFamily, setHasFamily] = useState(true);
    const [monthViewOpen, setMonthViewOpen] = useState(true);
    const [monthTransitionDirection, setMonthTransitionDirection] = useState("");
    const [calendarFilter, setCalendarFilter] = useState("Shared");
    const longPressTimerRef = useRef(null);
    const longPressTriggeredRef = useRef(false);
    const monthSwipeStartRef = useRef(null);
    const monthSwipeTriggeredRef = useRef(false);
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

    useEffect(() => {
        fetchCurrentPersona()
            .then((data) => setHasFamily(Boolean(data?.family)))
            .catch(() => setHasFamily(true));
    }, []);

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
                const [monthData, profile, familyMonthData, membersData] = await Promise.all([
                    getPeriodMonth(year, month),
                    getPeriodProfile().catch(() => null),
                    getFamilyPeriodMonth(year, month).catch(() => []),
                    getFamilyMembers().catch(() => []),
                ]);

                console.log("[FamilyCalendarPage] family/records/month response", familyMonthData);

                const membersById = new Map(
                    (Array.isArray(membersData) ? membersData : [])
                        .filter((m) => m?.id != null && m?.name)
                        .flatMap((m) => [[String(m.id), m.name], [Number(m.id), m.name]])
                );

                if (!active) return;

                const periodLength = Number(profile?.periodLengthDays) || 5;
                const nextPeriodKeys = new Set();
                const nextFamilyPeriodNamesByDate = new Map();

                const records = Array.isArray(monthData?.records) ? monthData.records : [];
                const predictionStart =
                    getRecordStartDate(monthData?.prediction) ||
                    parseIsoDate(monthData?.prediction?.startDate);
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

                    if (endDate < monthStart || startDate > monthEnd) continue;

                    const clampedStart = clampDate(startDate, monthStart, monthEnd);
                    const clampedEnd = clampDate(endDate, monthStart, monthEnd);

                    if (clampedStart <= clampedEnd) {
                        addRangeToKeySet(nextPeriodKeys, clampedStart, clampedEnd);
                    }
                }

                if (isFutureMonth && records.length === 0) {
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

                // --- Family members period mapping via new per-month endpoint ---
                const familyMonthList = Array.isArray(familyMonthData) ? familyMonthData : [];
                console.log("[FamilyCalendarPage] family month entries", familyMonthList);

                for (const entry of familyMonthList) {
                    const personaId = entry?.personaId;
                    const memberName =
                        (personaId != null
                            ? membersById.get(String(personaId)) || membersById.get(Number(personaId))
                            : undefined) ||
                        entry?.memberName ||
                        entry?.name ||
                        (personaId != null ? `Member ${personaId}` : "Family member");

                    const memberRecords = Array.isArray(entry?.records) ? entry.records : [];

                    for (const record of memberRecords) {
                        const startDate = getRecordStartDate(record);
                        if (!startDate) continue;

                        const endDate = getRecordEndDate(record) ||
                            addDays(startDate, Math.max(Number(entry?.periodLengthDays) || 5, 1) - 1);

                        const clampedStart = clampDate(startDate, monthStart, monthEnd);
                        const clampedEnd = clampDate(endDate, monthStart, monthEnd);
                        if (clampedStart > clampedEnd) continue;

                        const cursor = new Date(clampedStart);
                        while (cursor <= clampedEnd) {
                            addMemberNameForDate(nextFamilyPeriodNamesByDate, toDateKey(cursor), memberName);
                            cursor.setDate(cursor.getDate() + 1);
                        }
                    }

                    // Use prediction when no real records and it is flagged as predicted
                    if (memberRecords.length === 0 && entry?.prediction) {
                        const pred = entry.prediction;
                        const predStart = getRecordStartDate(pred) || parseFlexibleDate(pred?.startDate);
                        if (!predStart) continue;

                        const predEnd = getRecordEndDate(pred) ||
                            parseFlexibleDate(pred?.endDate) ||
                            addDays(predStart, Math.max(Number(entry?.periodLengthDays) || 5, 1) - 1);

                        const clampedStart = clampDate(predStart, monthStart, monthEnd);
                        const clampedEnd = clampDate(predEnd, monthStart, monthEnd);
                        if (clampedStart > clampedEnd) continue;
                        const cursor = new Date(clampedStart);
                        while (cursor <= clampedEnd) {
                            addMemberNameForDate(nextFamilyPeriodNamesByDate, toDateKey(cursor), memberName);
                            cursor.setDate(cursor.getDate() + 1);
                        }
                    }
                }

                setPeriodDateKeys(nextPeriodKeys);
                setFamilyPeriodNamesByDate(nextFamilyPeriodNamesByDate);
            } catch {
                if (!active) return;
                setPeriodDateKeys(new Set());
                setFamilyPeriodNamesByDate(new Map());
            }
        }

        loadPeriodForMonth();

        return () => {
            active = false;
        };
    }, [visibleMonth]);

    const monthLabel = useMemo(() => {
        if (monthViewOpen) {
            return visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
        }
        const [sy, sm] = selectedDateKey.split("-").map(Number);
        return new Date(sy, sm - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }, [visibleMonth, selectedDateKey, monthViewOpen]);

    const dayCells = useMemo(() => {
        const year = visibleMonth.getFullYear();
        const month = visibleMonth.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const firstWeekday = firstDayOfMonth.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPreviousMonth = new Date(year, month, 0).getDate();

        const cells = [];
        const todayKey = toDateKey(new Date());

        for (let index = 0; index < firstWeekday; index += 1) {
            const dayNumber = daysInPreviousMonth - firstWeekday + index + 1;
            const adjacentDate = new Date(year, month - 1, dayNumber);
            const dateKey = toDateKey(adjacentDate);
            const dayEvents = events
                .filter((eventItem) => eventItem.dateKey === dateKey)
                .sort((a, b) => a.timestamp - b.timestamp);

            cells.push({
                key: `empty-start-${index}`,
                isCurrentMonth: false,
                monthRelation: "previous",
                isPastCurrentMonth: false,
                dayNumber,
                isToday: false,
                dateKey,
                dayEvents,
                periodMemberNames: familyPeriodNamesByDate.get(dateKey) || [],
            });
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            const dateKey = toDateKey(new Date(year, month, day));
            const dayEvents = events
                .filter((eventItem) => eventItem.dateKey === dateKey)
                .sort((a, b) => a.timestamp - b.timestamp);

            cells.push({
                key: `day-${day}`,
                isCurrentMonth: true,
                monthRelation: "current",
                isPastCurrentMonth: dateKey < todayKey,
                dayNumber: day,
                dateKey,
                dayEvents,
                periodMemberNames: familyPeriodNamesByDate.get(dateKey) || [],
            });
        }

        const remainder = cells.length % 7;
        const trailingDays = remainder === 0 ? 0 : 7 - remainder;

        for (let index = 0; index < trailingDays; index += 1) {
            const dayNumber = index + 1;
            const adjacentDate = new Date(year, month + 1, dayNumber);
            const dateKey = toDateKey(adjacentDate);
            const dayEvents = events
                .filter((eventItem) => eventItem.dateKey === dateKey)
                .sort((a, b) => a.timestamp - b.timestamp);

            cells.push({
                key: `empty-end-${index}`,
                isCurrentMonth: false,
                monthRelation: "next",
                isPastCurrentMonth: false,
                dayNumber,
                isToday: false,
                dateKey,
                dayEvents,
                periodMemberNames: familyPeriodNamesByDate.get(dateKey) || [],
            });
        }

        return cells;
    }, [events, familyPeriodNamesByDate, visibleMonth]);

    const fiveDayCells = useMemo(() => {
        const [sy, sm, sd] = selectedDateKey.split("-").map(Number);
        const todayKey = toDateKey(new Date());
        return [-2, -1, 0, 1, 2].map((offset) => {
            const date = new Date(sy, sm - 1, sd + offset);
            const dateKey = toDateKey(date);
            const dayEvents = events
                .filter((eventItem) => eventItem.dateKey === dateKey)
                .sort((a, b) => a.timestamp - b.timestamp);
            const isCurrentMonth = date.getMonth() === sm - 1;
            const monthRelation = !isCurrentMonth
                ? date < new Date(sy, sm - 1, 1)
                    ? "previous"
                    : "next"
                : "current";
            return {
                key: `fiveday-${dateKey}`,
                isCurrentMonth,
                monthRelation,
                isPastCurrentMonth: isCurrentMonth && dateKey < todayKey,
                dayNumber: date.getDate(),
                dayName: date.toLocaleDateString(undefined, { weekday: "short" }),
                dateKey,
                dayEvents,
                periodMemberNames: familyPeriodNamesByDate.get(dateKey) || [],
            };
        });
    }, [selectedDateKey, events, familyPeriodNamesByDate]);

    function showCurrentMonth() {
        setMonthTransitionDirection("");
        const now = new Date();
        setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
        setSelectedDateKey(toDateKey(now));
    }

    function showPreviousMonth() {
        setMonthTransitionDirection("right");
        setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
    }

    function showNextMonth() {
        setMonthTransitionDirection("left");
        setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
    }

    function handleMonthGridTouchStart(event) {
        const touch = event.touches?.[0];
        if (!touch) return;

        monthSwipeStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
        };
        monthSwipeTriggeredRef.current = false;
    }

    function handleMonthGridTouchEnd(event) {
        const touch = event.changedTouches?.[0];
        const swipeStart = monthSwipeStartRef.current;
        monthSwipeStartRef.current = null;

        if (!touch || !swipeStart) return;

        const deltaX = touch.clientX - swipeStart.x;
        const deltaY = touch.clientY - swipeStart.y;

        if (Math.abs(deltaX) < MONTH_SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) {
            return;
        }

        monthSwipeTriggeredRef.current = true;

        if (deltaX < 0) {
            showNextMonth();
            return;
        }

        showPreviousMonth();
    }

    function toggleMonthView() {
        setMonthTransitionDirection("");
        setMonthViewOpen((prev) => {
            if (!prev) {
                const [y, m] = selectedDateKey.split("-").map(Number);
                setVisibleMonth(new Date(y, m - 1, 1));
            }
            return !prev;
        });
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

    function handleDayCellClick(cell) {
        if (!cell?.dateKey) return;

        if (cell.isCurrentMonth) {
            selectDateAndScroll(cell.dateKey);
            return;
        }

        const targetDate = parseIsoDate(cell.dateKey);
        if (!targetDate) return;

        setVisibleMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
        selectDateAndScroll(cell.dateKey);
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

            setVisibleMonth(
                (current) => new Date(current.getFullYear(), current.getMonth(), 1)
            );
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

    const selectedDateTimelineEvents = useMemo(() => {
        const minimumHeightPercent = (MIN_EVENT_BLOCK_MINUTES / (24 * 60)) * 100;

        return selectedDateEvents.map((eventItem) => {
            const timestamp = new Date(eventItem.timestamp);
            const minutes = timestamp.getHours() * 60 + timestamp.getMinutes();
            const topPercent = (minutes / (24 * 60)) * 100;
            const heightPercent = Math.max((EVENT_BLOCK_MINUTES / (24 * 60)) * 100, minimumHeightPercent);

            return {
                ...eventItem,
                topPercent,
                heightPercent,
            };
        });
    }, [selectedDateEvents]);

    const selectedDateNowLinePercent = useMemo(() => {
        const now = new Date();
        if (selectedDateKey !== toDateKey(now)) return null;

        const minutes = now.getHours() * 60 + now.getMinutes();
        return (minutes / (24 * 60)) * 100;
    }, [selectedDateKey]);

    const selectedParticipantLabels = useMemo(() => {
        if (selectedParticipantIds.length === 0) {
            return "Family";
        }

        const membersById = new Map(familyMembers.map((member) => [member.id, member.name]));
        return selectedParticipantIds
            .map((participantId) => membersById.get(participantId) || participantId)
            .join(", ");
    }, [familyMembers, selectedParticipantIds]);

    const selectedDatePeriodMembers = useMemo(
        () => familyPeriodNamesByDate.get(selectedDateKey) || [],
        [familyPeriodNamesByDate, selectedDateKey]
    );

    const visibleMonthKey = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;

    if (!hasFamily) {
        return <NoFamilyBanner onFamilyJoined={() => setHasFamily(true)} />;
    }

    return (
        <div className="page">
            {calendarError ? <p className="calendarView__error text-medium">{calendarError}</p> : null}
            {calendarNotice ? <p className="calendarView__notice text-medium">{calendarNotice}</p> : null}

            <section className={`calendarView${monthViewOpen ? "" : " calendarView--compact"}`}>
                <div className="calendarView__toolbar">
                    <div className="calendarView__monthNav">
                        <button
                            type="button"
                            className="calendarView__navButton"
                            onClick={showPreviousMonth}
                            aria-label="Previous month"
                        >
                            <span className="calendarView__navIcon calendarView__navIcon--left" aria-hidden="true" />
                        </button>
                        <h2 className="calendarView__monthLabel">{monthLabel}</h2>
                        <button
                            type="button"
                            className="calendarView__navButton"
                            onClick={showNextMonth}
                            aria-label="Next month"
                        >
                            <span className="calendarView__navIcon calendarView__navIcon--right" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="calendarView__toolbarRight">
                        <button type="button" className="calendarView__button" onClick={showCurrentMonth}>
                            Today
                        </button>
                        <button type="button" className={`calendarView__button${monthViewOpen ? " calendarView__button--active" : ""}`} onClick={toggleMonthView} aria-label="Toggle month view">
                            &#128197;
                        </button>
                    </div>
                </div>

                {monthViewOpen ? (
                    <>
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
                        <div
                            key={`${visibleMonthKey}-${monthTransitionDirection || "static"}`}
                            className={`calendarView__grid${monthTransitionDirection ? ` calendarView__grid--slide-${monthTransitionDirection}` : ""}`}
                            role="grid"
                            aria-label={monthLabel}
                            onTouchStart={handleMonthGridTouchStart}
                            onTouchEnd={handleMonthGridTouchEnd}
                            onAnimationEnd={() => setMonthTransitionDirection("")}
                        >
                            {dayCells.map((cell, cellIndex) => (
                                <div
                                    key={cell.key}
                                    className={`calendarView__cell ${cell.isCurrentMonth ? "calendarView__cell--current" : "calendarView__cell--empty"
                                        } ${cell.dateKey && cell.dateKey === selectedDateKey ? "calendarView__cell--selected" : ""
                                        } ${cellIndex % 7 === 0 || cellIndex % 7 === 6 ? "calendarView__cell--weekend" : ""
                                        } ${cell.monthRelation === "previous" ? "calendarView__cell--pastMonth" : ""
                                        } ${cell.monthRelation === "next" ? "calendarView__cell--nextMonth" : ""
                                        } ${cell.isPastCurrentMonth ? "calendarView__cell--pastCurrentMonth" : ""
                                        } ${cell.dateKey && periodDateKeys.has(cell.dateKey) ? "calendarView__cell--period" : ""
                                        } ${(cell.periodMemberNames || []).length > 0 ? "calendarView__cell--familyPeriod" : ""
                                        }`}
                                    role="gridcell"
                                    onClick={cell.dateKey ? () => {
                                        if (longPressTriggeredRef.current || monthSwipeTriggeredRef.current) {
                                            longPressTriggeredRef.current = false;
                                            monthSwipeTriggeredRef.current = false;
                                            return;
                                        }
                                        handleDayCellClick(cell);
                                    } : undefined}
                                    onDoubleClick={cell.isCurrentMonth && cell.dateKey ? () => openCreateModalForDate(cell.dateKey) : undefined}
                                    onPointerDown={cell.isCurrentMonth && cell.dateKey ? (event) => handleCellPointerDown(event, cell) : undefined}
                                    onPointerUp={cell.isCurrentMonth && cell.dateKey ? handleCellPointerEnd : undefined}
                                    onPointerLeave={cell.isCurrentMonth && cell.dateKey ? handleCellPointerEnd : undefined}
                                    onPointerCancel={cell.isCurrentMonth && cell.dateKey ? handleCellPointerEnd : undefined}
                                >
                                    {cell.dayNumber ? (
                                        <>
                                            <span className="calendarView__dayNumber">{cell.dayNumber}</span>
                                            {cell.isCurrentMonth || cell.dayEvents.length > 0 || (cell.periodMemberNames || []).length > 0 ? (
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
                                            ) : null}
                                        </>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="calendarView__grid calendarView__grid--fiveDay" role="grid" aria-label={monthLabel}>
                            {fiveDayCells.map((cell) => (
                                <div
                                    key={cell.key}
                                    className={`calendarView__cell ${cell.isCurrentMonth ? "calendarView__cell--current" : "calendarView__cell--empty"
                                        } ${cell.dateKey === selectedDateKey ? "calendarView__cell--selected" : ""
                                        } ${cell.monthRelation === "previous" ? "calendarView__cell--pastMonth" : ""
                                        } ${cell.monthRelation === "next" ? "calendarView__cell--nextMonth" : ""
                                        } ${cell.isPastCurrentMonth ? "calendarView__cell--pastCurrentMonth" : ""
                                        } ${cell.dateKey && periodDateKeys.has(cell.dateKey) ? "calendarView__cell--period" : ""
                                        } ${(cell.periodMemberNames || []).length > 0 ? "calendarView__cell--familyPeriod" : ""
                                        }`}
                                    role="gridcell"
                                    onClick={() => selectDateAndScroll(cell.dateKey)}
                                    onDoubleClick={() => openCreateModalForDate(cell.dateKey)}
                                    onPointerDown={(event) => handleCellPointerDown(event, cell)}
                                    onPointerUp={handleCellPointerEnd}
                                    onPointerLeave={handleCellPointerEnd}
                                    onPointerCancel={handleCellPointerEnd}
                                >
                                    <div className="calendarView__compactDay">
                                        <span className={`calendarView__compactDayName${!cell.isCurrentMonth ? " calendarView__compactDayName--muted" : ""}`}>
                                            {cell.dayName}
                                        </span>
                                        <span className="calendarView__compactDayNumber">{cell.dayNumber}</span>
                                        <span
                                            className={`calendarView__eventDot${cell.dayEvents.length > 0 ? " calendarView__eventDot--hasEvents" : ""}`}
                                            aria-label={cell.dayEvents.length > 0 ? "Has events" : "No events"}
                                            title={cell.dayEvents.length > 0 ? `${cell.dayEvents.length} event(s)` : "No events"}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            <div className="calendarView__actionsRow">
                <SegmentedControl
                    options={["Mine", "Shared", "Partner"]}
                    value={calendarFilter}
                    onChange={setCalendarFilter}
                />
                <AddButton onClick={() => openCreateModalForDate(selectedDateKey)} />
            </div>

            <section ref={itinerarySectionRef} className="calendarItinerary">
                <h2 className="card__title">{selectedDateLabel}</h2>
                {selectedDatePeriodMembers.length > 0 ? (
                    <div className="calendarItinerary__periodSummary">
                        <h3 className="calendarItinerary__periodTitle">Period tracker</h3>
                        <p className="calendarItinerary__periodNames text-medium">
                            A family period is tracked on this day.
                        </p>
                    </div>
                ) : null}
                <div className="calendarItinerary__timeline" aria-label="Day timeline from 00:00 to 24:00">
                    <div className="calendarItinerary__timelineScale" aria-hidden="true">
                        {DAY_HOURS.map((hour) => (
                            <div
                                key={`scale-${hour}`}
                                className="calendarItinerary__timelineScaleLabel"
                                style={{ top: `${(hour / 24) * 100}%` }}
                            >
                                {`${String(hour).padStart(2, "0")}:00`}
                            </div>
                        ))}
                    </div>

                    <div className="calendarItinerary__timelineTrack">
                        {DAY_HOURS.map((hour) => (
                            <div
                                key={`line-${hour}`}
                                className="calendarItinerary__timelineHourLine"
                                style={{ top: `${(hour / 24) * 100}%` }}
                            />
                        ))}

                        {selectedDateNowLinePercent !== null ? (
                            <div
                                className="calendarItinerary__timelineNowLine"
                                style={{ top: `${selectedDateNowLinePercent}%` }}
                            >
                                <span className="calendarItinerary__timelineNowLabel">Now</span>
                            </div>
                        ) : null}

                        {selectedDateTimelineEvents.length === 0 ? (
                            <p className="calendarItinerary__timelineEmpty text-medium">No events planned for this day yet.</p>
                        ) : (
                            selectedDateTimelineEvents.map((eventItem) => (
                                <article
                                    key={eventItem.id}
                                    className="calendarItinerary__timelineEvent"
                                    style={{
                                        top: `${eventItem.topPercent}%`,
                                        height: `${eventItem.heightPercent}%`,
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openEditModal(eventItem)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            openEditModal(eventItem);
                                        }
                                    }}
                                >
                                    <div className="calendarItinerary__timelineEventTime">{eventItem.timeLabel}</div>
                                    <h3 className="calendarItinerary__timelineEventTitle">{eventItem.title}</h3>
                                    {eventItem.participantNames.length > 0 ? (
                                        <p className="calendarItinerary__timelineEventMeta text-small">
                                            With: {eventItem.participantNames.join(", ")}
                                        </p>
                                    ) : null}
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {createModalOpen ? (
                <div className="calendarModalOverlay" role="dialog" aria-modal="true">
                    <div className="calendarModalCard">
                        <div className="calendarModalHeader">
                            <div>
                                <h2 className="calendarModalTitle">
                                    {editingEventId ? "Edit event" : "Create new event"}
                                </h2>
                                <p className="calendarModalSubtitle text-medium">
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
                                            <p className="calendarParticipants__empty text-medium">
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

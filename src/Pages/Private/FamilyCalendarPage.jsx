import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    createCalendarEvent,
    deleteCalendarEvent,
    getCalendarOccurrences,
    updateCalendarEvent,
} from "../../api/calendar.js";
import { getFamilyMembers } from "../../api/families.js";
import { fetchCurrentPersona } from "../../api/persona.js";
import NoFamilyBanner from "../../Components/NoFamilyBanner.jsx";
import AddButton from "../../Components/AddButton.jsx";
import SegmentedControl from "../../Components/SegmentedControl.jsx";
import UniversalModal from "../../Components/UniversalModal/UniversalModal.jsx";
import { ModalActions, ModalField, ModalHeader } from "../../Components/UniversalModal/ModalPrimitives.jsx";
import {
    getFamilyPeriodMonth,
    getPeriodMonth,
    getPeriodProfile,
    startPeriod,
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
const DAY_TOTAL_MINUTES = 24 * 60;
const RECURRENCE_FREQUENCY_OPTIONS = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];

function normalizeBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
        const normalizedValue = value.trim().toLowerCase();
        return normalizedValue === "true" || normalizedValue === "1" || normalizedValue === "yes";
    }
    return false;
}

function formatEventTime(date) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function toTimeInputValue(date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}

function compareCalendarEvents(a, b) {
    if (a.allDay !== b.allDay) {
        return a.allDay ? -1 : 1;
    }

    return a.timestamp - b.timestamp;
}

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

function normalizeParticipantId(value) {
    if (value === null || value === undefined || value === "") return null;

    const numericValue = Number(value);
    return Number.isInteger(numericValue) ? numericValue : String(value);
}

function memberMatchesPersona(member, personaId) {
    if (!member || personaId === null) return false;

    return [member.id, member.personaId, member.userId, member.memberId]
        .map(normalizeParticipantId)
        .some((candidateId) => candidateId === personaId);
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

function getVisibleMonthOccurrenceRange(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const firstWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const displayedCellsCount = firstWeekday + daysInMonth;
    const trailingDays = displayedCellsCount % 7 === 0 ? 0 : 7 - (displayedCellsCount % 7);

    const start = new Date(year, month, 1 - firstWeekday, 0, 0, 0, 0);
    const endExclusive = new Date(
        year,
        month,
        1 - firstWeekday + displayedCellsCount + trailingDays,
        0,
        0,
        0,
        0
    );

    return {
        startIso: start.toISOString(),
        endIso: endExclusive.toISOString(),
    };
}

function mapBackendEvents(data, familyMembers = []) {
    const sourceEvents = Array.isArray(data)
        ? data
        : Array.isArray(data?.events)
            ? data.events
            : [];



    return sourceEvents
        .map((eventItem) => {
            const backendId =
                eventItem.eventId ||
                eventItem.eventID ||
                eventItem.id ||
                eventItem.ID ||
                eventItem.uuid;
            const timestampRaw =
                eventItem.occurrenceStart ||
                eventItem.time ||
                eventItem.dateTime ||
                eventItem.datetime ||
                eventItem.timestamp ||
                eventItem.start;
            const endTimestampRaw =
                eventItem.occurrenceEnd ||
                eventItem.endTime ||
                eventItem.endDateTime ||
                eventItem.endDatetime ||
                eventItem.endTimestamp ||
                eventItem.end;
            const parsedDate = new Date(timestampRaw);
            const parsedEndDate = parseFlexibleDate(endTimestampRaw);
            const participantIds = extractParticipantIds(eventItem);
            const participantNames = extractParticipantNames(eventItem);
            const isAllDay = normalizeBoolean(
                eventItem.allDayEvent ?? eventItem.allDay ?? eventItem.isAllDay ?? eventItem.fullDay
            );
            const hasValidEndDate =
                parsedEndDate instanceof Date &&
                !Number.isNaN(parsedEndDate.getTime()) &&
                parsedEndDate.getTime() > parsedDate.getTime();
            const endTimestamp = hasValidEndDate ? parsedEndDate.getTime() : null;

            const startTimeLabel = formatEventTime(parsedDate);
            const endTimeLabel = endTimestamp ? formatEventTime(new Date(endTimestamp)) : null;
            const timeRangeLabel = isAllDay
                ? "All day"
                : endTimeLabel
                    ? `${startTimeLabel} - ${endTimeLabel}`
                    : startTimeLabel;

            if (!backendId || Number.isNaN(parsedDate.getTime())) {
                return null;
            }

            return {
                id: String(backendId),
                title: eventItem.title || eventItem.name || "Untitled event",
                description: eventItem.description || "",
                participantIds,
                participantNames,
                gender: extractParticipantGenders(participantIds, familyMembers),
                recurrence: extractRecurrence(eventItem),
                timestamp: parsedDate.getTime(),
                endTimestamp,
                allDay: isAllDay,
                dateKey: toDateKey(parsedDate),
                timeLabel: startTimeLabel,
                timeRangeLabel,
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

    if (Array.isArray(candidates) && candidates.every((value) => typeof value !== "object" || value === null)) {
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

    if (Array.isArray(candidates)) {
        return candidates
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

function extractParticipantGenders(participantIds, familyMembers) {
    const participants = Array.isArray(participantIds) ? participantIds : [];

    let hasMale = false;
    let hasFemale = false;

    participants.forEach((participantId) => {
        const member = familyMembers.find(
            m => Number(m.id) === Number(participantId)
        );

        if (!member) return;

        if (member.gender === "MALE") {
            hasMale = true;
        }

        if (member.gender === "FEMALE") {
            hasFemale = true;
        }
    });

    if (hasMale && !hasFemale) return "male";
    if (hasFemale && !hasMale) return "female";
    return "mixed";
}

function normalizeRecurrenceFrequency(value) {
    const normalized = String(value || "").trim().toUpperCase();
    return RECURRENCE_FREQUENCY_OPTIONS.includes(normalized) ? normalized : "NONE";
}

function extractRecurrence(eventItem) {
    const recurrence = eventItem?.recurrence || eventItem?.recurrenceRule || eventItem?.repeat || null;
    const source = recurrence && typeof recurrence === "object" ? recurrence : eventItem;

    const frequency = normalizeRecurrenceFrequency(
        source?.frequency || source?.type || source?.repeatType || source?.recurrenceFrequency
    );
    const interval = Number(source?.interval || source?.every || source?.recurrenceInterval || 1);
    const untilRaw = source?.until || source?.untilDate || source?.endDate || source?.recurrenceUntil;
    const untilDate = parseFlexibleDate(untilRaw);

    return {
        frequency,
        interval: Number.isInteger(interval) && interval > 0 ? interval : 1,
        untilDateKey: untilDate ? toDateKey(untilDate) : "",
    };
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
    const [eventDateKey, setEventDateKey] = useState(() => toDateKey(new Date()));
    const [eventDateTime, setEventDateTime] = useState("");
    const [eventEndTime, setEventEndTime] = useState("");
    const [eventAllDay, setEventAllDay] = useState(false);
    const [eventRecurrenceFrequency, setEventRecurrenceFrequency] = useState("NONE");
    const [eventRecurrenceInterval, setEventRecurrenceInterval] = useState("1");
    const [eventRecurrenceUntilDateKey, setEventRecurrenceUntilDateKey] = useState("");
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
    const [isCurrentPersonaMale, setIsCurrentPersonaMale] = useState(false);
    const [currentPersonaId, setCurrentPersonaId] = useState(null);
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
            .then((data) => {
                setHasFamily(Boolean(data?.family));
                setIsCurrentPersonaMale(String(data?.gender || "").toUpperCase() === "MALE");
                setCurrentPersonaId(
                    normalizeParticipantId(data?.id ?? data?.personaId ?? data?.userId)
                );
            })
            .catch(() => {
                setHasFamily(true);
                setIsCurrentPersonaMale(false);
                setCurrentPersonaId(null);
            });
    }, []);

    const refreshEvents = useCallback(async (monthToLoad) => {
        const targetMonth = monthToLoad || visibleMonth;
        const { startIso, endIso } = getVisibleMonthOccurrenceRange(targetMonth);
        const data = await getCalendarOccurrences(startIso, endIso);
        setEvents(mapBackendEvents(data, familyMembers));
    }, [familyMembers, visibleMonth]);

    useEffect(() => {
        let active = true;

        getFamilyMembers()
            .then((membersData) => {
                if (!active) return;
                setFamilyMembers(Array.isArray(membersData) ? membersData : []);
            })
            .catch((error) => {
                if (!active) return;
                setCalendarError(error.message || "Failed to load family members");
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        refreshEvents(visibleMonth).catch((error) => {
            if (!active) return;
            setCalendarError(error.message || "Failed to load calendar data");
        });

        return () => {
            active = false;
        };
    }, [refreshEvents, visibleMonth]);

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

                const membersById = new Map(
                    (Array.isArray(membersData) ? membersData : [])
                        .filter((m) => m?.id != null && m?.name)
                        .flatMap((m) => [[String(m.id), m.name, m.gender], [Number(m.id), m.name, m.gender]])
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

    const monthLabel = useMemo(
        () => visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        [visibleMonth]
    );

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
                .sort(compareCalendarEvents);

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
                .sort(compareCalendarEvents);

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
                .sort(compareCalendarEvents);

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
        const baselineDate = hasValidDate
            ? new Date(year, month - 1, day, now.getHours(), now.getMinutes(), 0, 0)
            : new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
        const defaultStartTime = toTimeInputValue(baselineDate);
        const defaultEndTime = toTimeInputValue(addMinutes(baselineDate, EVENT_BLOCK_MINUTES));

        if (hasValidDate) {
            setSelectedDateKey(targetDateKey);
            setVisibleMonth(new Date(year, month - 1, 1));
            setEventDateKey(targetDateKey);
        } else {
            setEventDateKey(toDateKey(new Date()));
        }

        setEventDateTime(defaultStartTime);
        setEventEndTime(defaultEndTime);
        setEventAllDay(false);
        setEventRecurrenceFrequency("NONE");
        setEventRecurrenceInterval("1");
        setEventRecurrenceUntilDateKey("");
        setEventTitle("");
        setEventDescription("");
        setSelectedParticipantIds(getDefaultParticipantIdsForFilter(calendarFilter));
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
        const startDate = new Date(eventItem.timestamp);
        const endDate = eventItem.endTimestamp
            ? new Date(eventItem.endTimestamp)
            : addMinutes(startDate, EVENT_BLOCK_MINUTES);

        setEventTitle(eventItem.title);
        setEventDescription(eventItem.description || "");
        setEventDateKey(toDateKey(startDate));
        setEventDateTime(toTimeInputValue(startDate));
        setEventEndTime(toTimeInputValue(endDate));
        setEventAllDay(Boolean(eventItem.allDay));
        setEventRecurrenceFrequency(eventItem.recurrence?.frequency || "NONE");
        setEventRecurrenceInterval(String(eventItem.recurrence?.interval || 1));
        setEventRecurrenceUntilDateKey(eventItem.recurrence?.untilDateKey || "");
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

    function getDefaultParticipantIdsForFilter(filter) {
        if (filter === "Mine" && currentPersonaId !== null) {
            const currentMember = familyMembers.find((member) =>
                memberMatchesPersona(member, currentPersonaId)
            );

            if (currentMember) {
                return [currentMember.id];
            }
        }

        if (filter === "Partner") {
            const partnerMember = familyMembers.find(
                (member) => !memberMatchesPersona(member, currentPersonaId)
            );
            return partnerMember ? [partnerMember.id] : [];
        }

        return [];
    }

    async function handleCreateEvent(event) {
        event.preventDefault();

        const title = eventTitle.trim();
        const description = eventDescription.trim() || null;
        if (!title || !eventDateKey || (!eventAllDay && !eventDateTime)) return;

        const [year, month, day] = eventDateKey.split("-").map(Number);
        if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
            return;
        }

        let parsedDate = null;

        if (eventAllDay) {
            parsedDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else {
            const [hoursRaw, minutesRaw] = eventDateTime.split(":");
            const hours = Number(hoursRaw);
            const minutes = Number(minutesRaw);

            if (Number.isNaN(hours) || Number.isNaN(minutes)) {
                return;
            }

            parsedDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        }

        if (Number.isNaN(parsedDate.getTime())) return;

        let parsedEndDate = null;

        if (eventAllDay) {
            parsedEndDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        } else {
            const [endHoursRaw, endMinutesRaw] = eventEndTime.split(":");
            const endHours = Number(endHoursRaw);
            const endMinutes = Number(endMinutesRaw);

            if (Number.isNaN(endHours) || Number.isNaN(endMinutes)) {
                return;
            }

            parsedEndDate = new Date(year, month - 1, day, endHours, endMinutes, 0, 0);
            if (parsedEndDate.getTime() <= parsedDate.getTime()) {
                setCalendarError("End time must be later than start time.");
                return;
            }
        }

        if (Number.isNaN(parsedEndDate.getTime())) return;

        const isoTime = parsedDate.toISOString();
        const isoEndTime = parsedEndDate.toISOString();
        const normalizedFrequency = normalizeRecurrenceFrequency(eventRecurrenceFrequency);
        const recurrenceInterval = Math.max(1, Number(eventRecurrenceInterval) || 1);
        let recurrenceUntilIso = null;

        if (normalizedFrequency !== "NONE" && eventRecurrenceUntilDateKey) {
            const parsedUntilDate = parseFlexibleDate(eventRecurrenceUntilDateKey);

            if (!parsedUntilDate) {
                setCalendarError("Invalid recurrence end date.");
                return;
            }

            const recurrenceEndOfDay = new Date(
                parsedUntilDate.getFullYear(),
                parsedUntilDate.getMonth(),
                parsedUntilDate.getDate(),
                23,
                59,
                59,
                999
            );

            if (recurrenceEndOfDay.getTime() < parsedDate.getTime()) {
                setCalendarError("Recurrence end date cannot be before the event date.");
                return;
            }

            recurrenceUntilIso = recurrenceEndOfDay.toISOString();
        }

        const recurrencePayload =
            normalizedFrequency === "NONE"
                ? null
                : {
                    frequency: normalizedFrequency,
                    interval: recurrenceInterval,
                    ...(recurrenceUntilIso ? { until: recurrenceUntilIso } : {}),
                };

        try {
            setCalendarError("");

            if (editingEventId) {
                await updateCalendarEvent(
                    editingEventId,
                    title,
                    description,
                    isoTime,
                    isoEndTime,
                    eventAllDay,
                    selectedParticipantIds,
                    recurrencePayload
                );
            } else {
                await createCalendarEvent(
                    title,
                    description,
                    isoTime,
                    isoEndTime,
                    eventAllDay,
                    selectedParticipantIds,
                    recurrencePayload
                );
            }

            const updatedDateKey = toDateKey(parsedDate);
            const targetMonth = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
            await refreshEvents(targetMonth);
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

        if (periodCurrentlyOpen) {
            setCalendarError("An active period is already open.");
            setCalendarNotice("");
            return;
        }

        try {
            setStartingPeriod(true);
            setCalendarError("");
            setCalendarNotice("");

            await startPeriod(selectedDateKey);
            setPeriodCurrentlyOpen(true);
            setOpenPeriodStartDateKey(selectedDateKey);
            setCalendarNotice(`Period started on ${selectedDateKey}.`);

            setVisibleMonth(
                (current) => new Date(current.getFullYear(), current.getMonth(), 1)
            );
        } catch (error) {
            setCalendarError(error.message || "Failed to start period");
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
                .sort(compareCalendarEvents),
        [events, selectedDateKey]
    );

    const selectedDateAllDayEvents = useMemo(
        () => selectedDateEvents.filter((eventItem) => eventItem.allDay),
        [selectedDateEvents]
    );

    const selectedDateTimelineEvents = useMemo(() => {
        const minimumHeightPercent = (MIN_EVENT_BLOCK_MINUTES / (24 * 60)) * 100;
        const timedEvents = selectedDateEvents
            .filter((eventItem) => !eventItem.allDay)
            .map((eventItem) => {
                const startDate = new Date(eventItem.timestamp);
                const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();

                const computedEndMinutes = eventItem.endTimestamp
                    ? Math.round((eventItem.endTimestamp - eventItem.timestamp) / 60000) + startMinutes
                    : startMinutes + EVENT_BLOCK_MINUTES;

                return {
                    ...eventItem,
                    startMinutes,
                    endMinutes: Math.min(
                        DAY_TOTAL_MINUTES,
                        Math.max(startMinutes + MIN_EVENT_BLOCK_MINUTES, computedEndMinutes)
                    ),
                };
            })
            .sort((a, b) => {
                if (a.startMinutes !== b.startMinutes) {
                    return a.startMinutes - b.startMinutes;
                }
                return a.endMinutes - b.endMinutes;
            });

        const overlapGroups = [];
        let currentGroup = [];
        let currentGroupEnd = -1;

        timedEvents.forEach((eventItem) => {
            if (currentGroup.length === 0) {
                currentGroup = [eventItem];
                currentGroupEnd = eventItem.endMinutes;
                return;
            }

            if (eventItem.startMinutes < currentGroupEnd) {
                currentGroup.push(eventItem);
                currentGroupEnd = Math.max(currentGroupEnd, eventItem.endMinutes);
                return;
            }

            overlapGroups.push(currentGroup);
            currentGroup = [eventItem];
            currentGroupEnd = eventItem.endMinutes;
        });

        if (currentGroup.length > 0) {
            overlapGroups.push(currentGroup);
        }

        return overlapGroups.flatMap((group) => {
            const laneEndMinutes = [];
            let maxColumns = 1;

            const positionedEvents = group.map((eventItem) => {
                let laneIndex = laneEndMinutes.findIndex((laneEnd) => laneEnd <= eventItem.startMinutes);

                if (laneIndex === -1) {
                    laneIndex = laneEndMinutes.length;
                    laneEndMinutes.push(eventItem.endMinutes);
                } else {
                    laneEndMinutes[laneIndex] = eventItem.endMinutes;
                }

                maxColumns = Math.max(maxColumns, laneEndMinutes.length);

                return {
                    ...eventItem,
                    columnIndex: laneIndex,
                };
            });

            return positionedEvents.map((eventItem) => {
                const topPercent = (eventItem.startMinutes / DAY_TOTAL_MINUTES) * 100;
                const eventDurationMinutes = eventItem.endMinutes - eventItem.startMinutes;
                const heightPercent = Math.max((eventDurationMinutes / DAY_TOTAL_MINUTES) * 100, minimumHeightPercent);

                return {
                    ...eventItem,
                    groupColumns: maxColumns,
                    topPercent,
                    heightPercent,
                };
            });
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

    const isSelectedDateInFuture = useMemo(() => {
        const todayKey = toDateKey(new Date());
        return selectedDateKey > todayKey;
    }, [selectedDateKey]);

    const periodActionHint = useMemo(() => {
        if (isSelectedDateInFuture) {
            return "Choose today or a past day to track period status.";
        }

        if (periodCurrentlyOpen && openPeriodStartDateKey) {
            return `Open period started on ${openPeriodStartDateKey}. Starting another period is disabled until it is closed.`;
        }

        return "Track period for the currently selected day.";
    }, [isSelectedDateInFuture, periodCurrentlyOpen, openPeriodStartDateKey]);

    const visibleMonthKey = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;

    if (!hasFamily) {
        return <NoFamilyBanner onFamilyJoined={() => setHasFamily(true)} />;
    }

    return (
        <div className="page">
            {calendarError ? <p className="calendarView__error text-medium">{calendarError}</p> : null}
            {calendarNotice ? <p className="calendarView__notice text-medium">{calendarNotice}</p> : null}

            <section className="calendarView calendarView--compact">
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
                                                    className={`calendarView__eventItem ${eventItem.gender} ${eventItem.allDay ? "calendarView__eventItem--allDay" : ""}`}
                                                >
                                                    <div className={`calendarView__eventTime ${eventItem.allDay ? "calendarView__eventTime--allDay" : ""}`}>
                                                        {eventItem.timeRangeLabel}
                                                    </div>
                                                    <div className="calendarView__eventTitle">{eventItem.title}</div>
                                                    <div className="calendarView__eventTitle">{eventItem.gender}</div>
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
                <div className="calendarItinerary__header">
                    <h2 className="card__title">{selectedDateLabel}</h2>
                    {!isCurrentPersonaMale ? (
                        <button
                            type="button"
                            className="calendarItinerary__periodAction"
                            onClick={handleStartPeriodForSelectedDay}
                            disabled={startingPeriod || isSelectedDateInFuture || periodCurrentlyOpen}
                        >
                            {startingPeriod ? "Starting..." : "Start period"}
                        </button>
                    ) : null}
                </div>
                {!isCurrentPersonaMale ? (
                    <p className="calendarItinerary__periodHint text-medium">{periodActionHint}</p>
                ) : null}
                {selectedDatePeriodMembers.length > 0 ? (
                    <div className="calendarItinerary__periodSummary">
                        <h3 className="calendarItinerary__periodTitle">Period tracker</h3>
                        <p className="calendarItinerary__periodNames text-medium">
                            A family period is tracked on this day.
                        </p>
                    </div>
                ) : null}
                {selectedDateAllDayEvents.length > 0 ? (
                    <div className="calendarItinerary__allDay">
                        <h3 className="calendarItinerary__allDayTitle">All-day events</h3>
                        <div className="calendarItinerary__allDayList">
                            {selectedDateAllDayEvents.map((eventItem) => (
                                <article key={`all-day-${eventItem.id}`} className="calendarItinerary__allDayItem">
                                    <p className="calendarItinerary__allDayTime">All day</p>
                                    <h4 className="calendarItinerary__allDayItemTitle">{eventItem.title}</h4>
                                    {eventItem.participantNames.length > 0 ? (
                                        <p className="calendarItinerary__allDayMeta text-small">
                                            With: {eventItem.participantNames.join(", ")}
                                        </p>
                                    ) : null}
                                </article>
                            ))}
                        </div>
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
                                        "--event-column": eventItem.columnIndex,
                                        "--event-columns": eventItem.groupColumns,
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
                                    <div className="calendarItinerary__timelineEventTime">{eventItem.timeRangeLabel}</div>
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
                <UniversalModal
                    isOpen={createModalOpen}
                    onClose={closeCreateModal}
                    overlayClassName="calendarModalOverlay universalModal__addOverlay"
                    dialogClassName="calendarModalCard universalModal__addSurface"
                >
                    <ModalHeader
                        title={editingEventId ? "Edit event" : "Create new event"}
                        subtitle={editingEventId
                            ? "Update title, timing, and participants."
                            : "Choose date, set all-day or a time range, then add details."}
                        onClose={closeCreateModal}
                        className="calendarModalHeader"
                        titleClassName="calendarModalTitle"
                        subtitleClassName="calendarModalSubtitle text-medium"
                        closeButtonClassName="calendarModalClose"
                    />

                    <form className="calendarModalBody universalModal__body" onSubmit={handleCreateEvent}>
                        <ModalField label="Title" className="calendarModalField">
                            <input
                                className="universalModal__input"
                                type="text"
                                value={eventTitle}
                                onChange={(event) => setEventTitle(event.target.value)}
                                placeholder="Birthday dinner"
                                maxLength={120}
                                required
                                autoFocus
                            />
                        </ModalField>

                        <ModalField label="Description" className="calendarModalField">
                            <textarea
                                className="universalModal__textarea"
                                value={eventDescription}
                                onChange={(event) => setEventDescription(event.target.value)}
                                placeholder="Bring dessert and candles"
                                maxLength={500}
                                rows={3}
                            />
                        </ModalField>

                        <ModalField label="Date" className="calendarModalField">
                            <input
                                className="universalModal__input"
                                type="date"
                                value={eventDateKey}
                                onChange={(event) => setEventDateKey(event.target.value)}
                                required
                            />
                        </ModalField>

                        <div className="calendarModalField calendarModalToggleRow universalModal__field">
                            <label className="calendarModalToggle">
                                <input
                                    type="checkbox"
                                    checked={eventAllDay}
                                    onChange={(event) => setEventAllDay(event.target.checked)}
                                />
                                <span>All day</span>
                            </label>
                        </div>

                        {!eventAllDay ? (
                            <div className="calendarModalTimeGrid">
                                <ModalField label="Start time" className="calendarModalField">
                                    <input
                                        className="universalModal__input"
                                        type="time"
                                        value={eventDateTime}
                                        onChange={(event) => setEventDateTime(event.target.value)}
                                        required
                                    />
                                </ModalField>

                                <ModalField label="End time" className="calendarModalField">
                                    <input
                                        className="universalModal__input"
                                        type="time"
                                        value={eventEndTime}
                                        onChange={(event) => setEventEndTime(event.target.value)}
                                        required
                                    />
                                </ModalField>
                            </div>
                        ) : (
                            <p className="calendarModalHint text-small">This event will be shown as all day.</p>
                        )}

                        <ModalField label="Repeat" className="calendarModalField">
                            <select
                                className="universalModal__input"
                                value={eventRecurrenceFrequency}
                                onChange={(event) => setEventRecurrenceFrequency(event.target.value)}
                            >
                                <option value="NONE">Does not repeat</option>
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                            </select>
                        </ModalField>

                        {eventRecurrenceFrequency !== "NONE" ? (
                            <div className="calendarModalTimeGrid">
                                <ModalField label="Repeat every" className="calendarModalField">
                                    <input
                                        className="universalModal__input"
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={eventRecurrenceInterval}
                                        onChange={(event) => setEventRecurrenceInterval(event.target.value)}
                                        required
                                    />
                                </ModalField>

                                <ModalField label="Repeat until" className="calendarModalField">
                                    <input
                                        className="universalModal__input"
                                        type="date"
                                        value={eventRecurrenceUntilDateKey}
                                        onChange={(event) => setEventRecurrenceUntilDateKey(event.target.value)}
                                    />
                                </ModalField>
                            </div>
                        ) : null}

                        <div className="calendarModalField universalModal__field">
                            <span className="universalModal__fieldLabel">Participants</span>
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

                        <ModalActions className="calendarModalActions universalModal__addActions">
                            {editingEventId ? (
                                <button
                                    type="button"
                                    className="calendarModalButton calendarModalButton--danger universalModal__button universalModal__button--danger"
                                    onClick={handleDeleteEvent}
                                >
                                    Delete
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className="btn-secondary medium universalModal__button universalModal__button--ghost"
                                onClick={closeCreateModal}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="addButton medium universalModal__button">
                                {editingEventId ? "Save changes" : "Save event"}
                            </button>
                        </ModalActions>
                    </form>
                </UniversalModal>
            ) : null}
        </div>
    );
}

export default FamilyCalendarPage;

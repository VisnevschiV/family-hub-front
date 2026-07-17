import { apiFetch } from "./client.js";

async function extractErrorMessage(response, fallback) {
    let errorMessage = fallback;

    try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            errorMessage = data.error || data.message || errorMessage;
        } else {
            const text = await response.text();
            if (text) errorMessage = text;
        }
    } catch {
        // Ignore parse errors, keep fallback.
    }

    return errorMessage;
}

export async function getCalendarEvents() {
    const response = await apiFetch("/calendar", {
        method: "GET",
    });

    if (!response.ok) {
        const errorMessage = await extractErrorMessage(
            response,
            `Failed to load calendar events: ${response.status}`
        );
        throw new Error(errorMessage);
    }

    try {
        return await response.json();
    } catch {
        return [];
    }
}

export async function getCalendarOccurrences(startIso, endIso) {
    const searchParams = new URLSearchParams();

    if (startIso) {
        searchParams.set("start", startIso);
    }

    if (endIso) {
        searchParams.set("end", endIso);
    }

    const query = searchParams.toString();
    const endpoint = query ? `/calendar/occurrences?${query}` : "/calendar/occurrences";

    const response = await apiFetch(endpoint, {
        method: "GET",
    });

    if (!response.ok) {
        const errorMessage = await extractErrorMessage(
            response,
            `Failed to load calendar occurrences: ${response.status}`
        );
        throw new Error(errorMessage);
    }

    try {
        return await response.json();
    } catch {
        return [];
    }
}

export async function createCalendarEvent(
    title,
    description,
    time,
    endTime,
    allDayEvent,
    participantIds = [],
    recurrence = null
) {
    const participants = participantIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id));

    const payload = {
        title,
        description,
        time,
        endTime,
        allDayEvent: Boolean(allDayEvent),
        participants,
    };

    if (recurrence && recurrence.frequency && recurrence.frequency !== "NONE") {
        payload.recurrence = recurrence;
    }

    const response = await apiFetch("/calendar", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorMessage = await extractErrorMessage(
            response,
            `Failed to create event: ${response.status}`
        );
        throw new Error(errorMessage);
    }
}

export async function updateCalendarEvent(
    eventId,
    title,
    description,
    time,
    endTime,
    allDayEvent,
    participantIds = [],
    recurrence = null
) {
    const participants = participantIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id));

    const payload = {
        title,
        description,
        time,
        endTime,
        allDayEvent: Boolean(allDayEvent),
        participants,
    };

    if (recurrence && recurrence.frequency && recurrence.frequency !== "NONE") {
        payload.recurrence = recurrence;
    }

    const response = await apiFetch(`/calendar/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorMessage = await extractErrorMessage(
            response,
            `Failed to update event: ${response.status}`
        );
        throw new Error(errorMessage);
    }
}

export async function deleteCalendarEvent(eventId) {
    const response = await apiFetch(`/calendar/${encodeURIComponent(eventId)}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        const errorMessage = await extractErrorMessage(
            response,
            `Failed to delete event: ${response.status}`
        );
        throw new Error(errorMessage);
    }
}

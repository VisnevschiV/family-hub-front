const API_BASE_URL = "http://localhost:8080";

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
    const response = await fetch(`${API_BASE_URL}/calendar`, {
        method: "GET",
        credentials: "include",
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

export async function createCalendarEvent(title, description, time) {
    const response = await fetch(`${API_BASE_URL}/calendar`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ title, description, time }),
    });

    if (!response.ok) {
        const errorMessage = await extractErrorMessage(
            response,
            `Failed to create event: ${response.status}`
        );
        throw new Error(errorMessage);
    }
}

export async function updateCalendarEvent(eventId, title, description, time) {
    const response = await fetch(`${API_BASE_URL}/calendar/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ title, description, time }),
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
    const response = await fetch(`${API_BASE_URL}/calendar/${encodeURIComponent(eventId)}`, {
        method: "DELETE",
        credentials: "include",
    });

    if (!response.ok) {
        const errorMessage = await extractErrorMessage(
            response,
            `Failed to delete event: ${response.status}`
        );
        throw new Error(errorMessage);
    }
}

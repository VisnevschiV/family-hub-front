import { apiFetch } from "./client.js";

const BASE = "/personas/me/period-profile";

async function parseErrorMessage(response, fallback) {
    try {
        const body = await response.json();
        return body?.message || body?.error || fallback;
    } catch {
        return fallback;
    }
}

export async function createPeriodProfile(payload) {
    const response = await apiFetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to create period profile");
        throw new Error(message);
    }
    return response.json();
}

export async function getPeriodProfile() {
    const response = await apiFetch(BASE);
    if (response.status === 204) return null;
    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to load period profile");
        throw new Error(message);
    }
    return response.json();
}

export async function updatePeriodProfile(payload) {
    const response = await apiFetch(BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to update period profile");
        throw new Error(message);
    }
    return response.json();
}

export async function deletePeriodProfile() {
    const response = await apiFetch(BASE, { method: "DELETE" });
    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to delete period profile");
        throw new Error(message);
    }
}

export async function startPeriod(date) {
    const response = await apiFetch(`${BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
    });
    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to start period");
        throw new Error(message);
    }
    return response.json();
}

export async function stopPeriod(date) {
    const response = await apiFetch(`${BASE}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
    });
    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to stop period");
        throw new Error(message);
    }
    return response.json();
}

export async function getPeriodMonth(year, month) {
    const response = await apiFetch(`${BASE}/records/month?year=${year}&month=${month}`);
    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to load period month data");
        throw new Error(message);
    }
    return response.json();
}

export async function getFamilyPeriodProfiles() {
    const response = await apiFetch(`${BASE}/family`);
    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to load family period profiles");
        throw new Error(message);
    }
    return response.json();
}

export async function getFamilyPeriodMonth(year, month) {
    const response = await apiFetch(`${BASE}/family/records/month?year=${year}&month=${month}`);
    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to load family period month data");
        throw new Error(message);
    }
    return response.json();
}

export async function recordPeriodEvent(eventType, date) {
    const response = await apiFetch(`${BASE}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, date }),
    });
    if (!response.ok) {
        const message = await parseErrorMessage(response, "Failed to record period event");
        throw new Error(message);
    }
    return response.json();
}

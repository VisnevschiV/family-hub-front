import { apiFetch } from "./client.js";

export async function fetchCurrentPersona() {
    const response = await apiFetch("/personas/me", {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error(`Failed to load persona: ${response.status}`);
    }

    return response.json();
}

export async function updatePersona(update) {
    const response = await apiFetch("/personas/me", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(update),
    });

    if (!response.ok) {
        throw new Error(`Failed to update persona: ${response.status}`);
    }

    return response.json();
}

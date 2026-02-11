const API_BASE_URL = "http://localhost:8080";

export async function fetchCurrentPersona() {
    const response = await fetch(`${API_BASE_URL}/personas/me`, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`Failed to load persona: ${response.status}`);
    }

    return response.json();
}

export async function updatePersona(update) {
    const response = await fetch(`${API_BASE_URL}/personas/me`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(update),
    });

    if (!response.ok) {
        throw new Error(`Failed to update persona: ${response.status}`);
    }

    return response.json();
}

import { apiFetch } from "./client.js";

export async function fetchProtectedData() {
    const response = await apiFetch("/some/protected", {
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
}

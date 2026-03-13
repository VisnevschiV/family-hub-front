import { API_BASE_URL } from "./config.js";

export async function fetchProtectedData() {
    const response = await fetch(`${API_BASE_URL}/some/protected`, {
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
}

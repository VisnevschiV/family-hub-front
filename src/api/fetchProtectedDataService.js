import { getAuthHeader } from "./auth.js";

export async function fetchProtectedData() {
    const response = await fetch("http://localhost:8080/some/protected", {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(), // adds Authorization: Bearer <token>
        },
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
}

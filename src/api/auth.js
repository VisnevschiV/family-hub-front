// src/api/auth.js

// Base URL of your Spring Boot backend.
// If you change ports or host, you only change it here.
const API_BASE_URL = "http://localhost:8080/auth";

// string "welcome to FamilyHub!"
export async function pingBackend() {
    const response = await fetch(`${API_BASE_URL}/`, {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const text = await response.text();
    return text;
}




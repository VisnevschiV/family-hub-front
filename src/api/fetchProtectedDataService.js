export async function fetchProtectedData() {
    const response = await fetch("http://localhost:8080/some/protected", {
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

export async function fetchProtectedData() {
    const response = await fetch("https://familyhub-gte6cabtbggua6cy.spaincentral-01.azurewebsites.net/some/protected", {
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

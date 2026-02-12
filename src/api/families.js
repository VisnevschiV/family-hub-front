const API_BASE_URL = "http://localhost:8080";

export async function createFamily(name) {
    const response = await fetch(`${API_BASE_URL}/families`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name }),
    });

    if (!response.ok) {
        let errorMessage = `Failed to create family: ${response.status}`;
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
            // Ignore parse errors, keep default message.
        }
        throw new Error(errorMessage);
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
}

export async function updateFamilyName(name) {
    console.log("updateFamilyName called with:", { name });
    const response = await fetch(`${API_BASE_URL}/families/me`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name }),
    });

    console.log("updateFamilyName response:", {
        ok: response.ok,
        status: response.status,
        url: response.url,
    });

    if (!response.ok) {
        let errorMessage = `Failed to update family: ${response.status}`;
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
            // Ignore parse errors, keep default message.
        }
        throw new Error(errorMessage);
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
}

export async function leaveFamily() {
    const response = await fetch(`${API_BASE_URL}/families/me/leave`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
    });

    if (!response.ok) {
        let errorMessage = `Failed to leave family: ${response.status}`;
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
            // Ignore parse errors, keep default message.
        }
        throw new Error(errorMessage);
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
}

export async function joinFamily(code) {
    const response = await fetch(`${API_BASE_URL}/families/join`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        let errorMessage = `Failed to join family: ${response.status}`;
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
            // Ignore parse errors, keep default message.
        }
        throw new Error(errorMessage);
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
}

export async function generateJoinCode() {
    const response = await fetch(`${API_BASE_URL}/families/me/join-code`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
    });

    if (!response.ok) {
        let errorMessage = `Failed to generate join code: ${response.status}`;
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
            // Ignore parse errors, keep default message.
        }
        throw new Error(errorMessage);
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
}

const API_BASE_URL = "http://localhost:8080";
const DEBUG_TASKS = true;

function logTaskError(context, details) {
    if (!DEBUG_TASKS) return;
    console.error("[tasks]", context, details);
}

export async function getTaskLists() {
    const requestUrl = `${API_BASE_URL}/tasks/getLists`;
    const response = await fetch(requestUrl, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        logTaskError("getTaskLists:response", {
            requestMethod: "GET",
            requestUrl,
            responseUrl: response.url,
            status: response.status,
            statusText: response.statusText,
            redirected: response.redirected,
            allow: response.headers.get("allow"),
        });

        let errorMessage = `Failed to load lists: ${response.status}`;
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
        return [];
    }
}

export async function createTaskList(name) {
    const requestUrl = `${API_BASE_URL}/tasks/createList`;
    const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name }),
    });

    if (!response.ok) {
        logTaskError("createTaskList:response", {
            requestMethod: "POST",
            requestUrl,
            responseUrl: response.url,
            status: response.status,
            statusText: response.statusText,
            redirected: response.redirected,
            allow: response.headers.get("allow"),
        });

        let errorMessage = `Failed to create list: ${response.status}`;
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

export async function deleteTaskList(listID) {
    const requestUrl = `${API_BASE_URL}/tasks/lists/${encodeURIComponent(listID)}`;
    const response = await fetch(
        requestUrl,
        {
            method: "DELETE",
            credentials: "include",
        }
    );

    if (!response.ok) {
        logTaskError("deleteTaskList:response", {
            requestMethod: "DELETE",
            requestUrl,
            responseUrl: response.url,
            status: response.status,
            statusText: response.statusText,
            redirected: response.redirected,
            allow: response.headers.get("allow"),
        });

        let errorMessage = `Failed to delete list: ${response.status}`;
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

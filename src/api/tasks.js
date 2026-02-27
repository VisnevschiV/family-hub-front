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

export async function updateTaskListName(id, newName) {
    const requestUrl = `${API_BASE_URL}/tasks/lists`;
    const response = await fetch(requestUrl, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id, newName }),
    });

    if (!response.ok) {
        logTaskError("updateTaskListName:response", {
            requestMethod: "PATCH",
            requestUrl,
            responseUrl: response.url,
            status: response.status,
            statusText: response.statusText,
            redirected: response.redirected,
            allow: response.headers.get("allow"),
        });

        let errorMessage = `Failed to rename list: ${response.status}`;
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

export async function createTask(listID, taskName) {
    const requestUrl = `${API_BASE_URL}/tasks`;
    const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ listID, taskName }),
    });

    if (!response.ok) {
        logTaskError("createTask:response", {
            requestMethod: "POST",
            requestUrl,
            responseUrl: response.url,
            status: response.status,
            statusText: response.statusText,
            redirected: response.redirected,
            allow: response.headers.get("allow"),
        });

        let errorMessage = `Failed to create task: ${response.status}`;
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

export async function deleteTask(listID, taskID) {
    const requestUrl = `${API_BASE_URL}/tasks`;
    const response = await fetch(requestUrl, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ listID, taskID }),
    });

    if (!response.ok) {
        logTaskError("deleteTask:response", {
            requestMethod: "DELETE",
            requestUrl,
            responseUrl: response.url,
            status: response.status,
            statusText: response.statusText,
            redirected: response.redirected,
            allow: response.headers.get("allow"),
        });

        let errorMessage = `Failed to delete task: ${response.status}`;
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

export async function updateTask(listID, taskID, newName, completed) {
    const requestUrl = `${API_BASE_URL}/tasks`;
    const response = await fetch(requestUrl, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ listID, taskID, newName, completed }),
    });

    if (!response.ok) {
        logTaskError("updateTask:response", {
            requestMethod: "PATCH",
            requestUrl,
            responseUrl: response.url,
            status: response.status,
            statusText: response.statusText,
            redirected: response.redirected,
            allow: response.headers.get("allow"),
        });

        let errorMessage = `Failed to update task: ${response.status}`;
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

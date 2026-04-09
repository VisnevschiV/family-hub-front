import { apiFetch, buildApiUrl } from "./client.js";
const DEBUG_TASKS = true;

function logTaskError(context, details) {
    if (!DEBUG_TASKS) return;
    console.error("[tasks]", context, details);
}

export async function getTaskLists() {
    const requestUrl = buildApiUrl("/tasks/getLists");
    const response = await apiFetch("/tasks/getLists", {
        method: "GET",
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
    const requestUrl = buildApiUrl("/tasks/createList");
    const response = await apiFetch("/tasks/createList", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
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
    const requestUrl = buildApiUrl(`/tasks/lists/${encodeURIComponent(listID)}`);
    const response = await apiFetch(
        `/tasks/lists/${encodeURIComponent(listID)}`,
        {
            method: "DELETE",
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
    const requestUrl = buildApiUrl("/tasks/lists");
    const response = await apiFetch("/tasks/lists", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
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
    const requestUrl = buildApiUrl("/tasks");
    const response = await apiFetch("/tasks", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
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
    const requestUrl = buildApiUrl("/tasks");
    const response = await apiFetch("/tasks", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
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
    const requestUrl = buildApiUrl("/tasks");
    const response = await apiFetch("/tasks", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
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

import { apiFetch, buildApiUrl } from "./client.js";

const DEBUG_BUDGET = true;
const BUDGET_API_BASE = "/api/budget";

function safeParseBody(body) {
    if (!body || typeof body !== "string") return body ?? null;

    try {
        return JSON.parse(body);
    } catch {
        return body;
    }
}

function logBudgetRequest(context, details) {
    if (!DEBUG_BUDGET) return;
    console.info("[budget]", `${context}:request`, details);
}

function logBudgetResponse(context, details) {
    if (!DEBUG_BUDGET) return;
    console.info("[budget]", `${context}:response`, details);
}

function logBudgetError(context, details) {
    if (!DEBUG_BUDGET) return;
    console.error("[budget]", context, details);
}

async function performBudgetRequest(context, path, init = {}) {
    const method = (init.method || "GET").toUpperCase();
    const requestUrl = buildApiUrl(path);

    logBudgetRequest(context, {
        requestMethod: method,
        requestUrl,
        requestBody: safeParseBody(init.body),
    });

    const response = await apiFetch(path, init);

    logBudgetResponse(context, {
        requestMethod: method,
        requestUrl,
        responseUrl: response.url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        redirected: response.redirected,
    });

    return { response, requestUrl, method };
}

export async function getBudget() {
    const path = BUDGET_API_BASE;
    const { response, requestUrl, method } = await performBudgetRequest("getBudget", path, {
        method: "GET",
    });

    if (!response.ok) {
        logBudgetError("getBudget:response", {
            requestMethod: method,
            requestUrl,
            responseUrl: response.url,
            status: response.status,
            statusText: response.statusText,
            redirected: response.redirected,
        });

        let errorMessage = `Failed to load budget: ${response.status}`;
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

export async function createBudget(name, currencyISOCode, parentBudgetId = null) {
    const path = BUDGET_API_BASE;
    const { response, requestUrl, method } = await performBudgetRequest("createBudget", path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name,
            currencyISOCode,
            parentBudgetId,
        }),
    });

    if (!response.ok) {
        logBudgetError("createBudget:response", {
            requestMethod: method,
            requestUrl,
            status: response.status,
        });

        let errorMessage = `Failed to create budget: ${response.status}`;
        try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                errorMessage = data.error || data.message || errorMessage;
            }
        } catch {
            // Ignore parse errors
        }
        throw new Error(errorMessage);
    }

    return await response.json();
}

export async function modifyBudget(budgetId, name, currencyISOCode, parentBudgetId = null) {
    const path = `${BUDGET_API_BASE}/${budgetId}`;
    const { response, requestUrl, method } = await performBudgetRequest("modifyBudget", path, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name,
            currencyISOCode,
            parentBudgetId,
        }),
    });

    if (!response.ok) {
        logBudgetError("modifyBudget:response", {
            requestMethod: method,
            requestUrl,
            status: response.status,
        });

        let errorMessage = `Failed to modify budget: ${response.status}`;
        try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                errorMessage = data.error || data.message || errorMessage;
            }
        } catch {
            // Ignore parse errors
        }
        throw new Error(errorMessage);
    }

    return await response.json();
}

export async function deleteBudget(budgetId) {
    const path = `${BUDGET_API_BASE}/${budgetId}`;
    const { response, requestUrl, method } = await performBudgetRequest("deleteBudget", path, {
        method: "DELETE",
    });

    if (!response.ok) {
        logBudgetError("deleteBudget:response", {
            requestMethod: method,
            requestUrl,
            status: response.status,
        });

        let errorMessage = `Failed to delete budget: ${response.status}`;
        try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                errorMessage = data.error || data.message || errorMessage;
            }
        } catch {
            // Ignore parse errors
        }
        throw new Error(errorMessage);
    }
}

export async function addTransaction(budgetId, description, amount, currencyISOCode) {
    const path = `${BUDGET_API_BASE}/${budgetId}/transaction`;
    const { response, requestUrl, method } = await performBudgetRequest("addTransaction", path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            budgetId,
            description,
            amount,
            currencyISOCode,
        }),
    });

    if (!response.ok) {
        logBudgetError("addTransaction:response", {
            requestMethod: method,
            requestUrl,
            status: response.status,
        });

        let errorMessage = `Failed to add transaction: ${response.status}`;
        try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                errorMessage = data.error || data.message || errorMessage;
            }
        } catch {
            // Ignore parse errors
        }
        throw new Error(errorMessage);
    }

    return await response.json();
}

export async function modifyTransaction(budgetId, transactionId, description, amount, currencyISOCode) {
    const path = `${BUDGET_API_BASE}/${budgetId}/transaction/${transactionId}`;
    const { response, requestUrl, method } = await performBudgetRequest("modifyTransaction", path, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            description,
            amount,
            currencyISOCode,
        }),
    });

    if (!response.ok) {
        logBudgetError("modifyTransaction:response", {
            requestMethod: method,
            requestUrl,
            status: response.status,
        });

        let errorMessage = `Failed to modify transaction: ${response.status}`;
        try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                errorMessage = data.error || data.message || errorMessage;
            }
        } catch {
            // Ignore parse errors
        }
        throw new Error(errorMessage);
    }

    return await response.json();
}

export async function deleteTransaction(budgetId, transactionId) {
    const path = `${BUDGET_API_BASE}/${budgetId}/transaction/${transactionId}`;
    const { response, requestUrl, method } = await performBudgetRequest("deleteTransaction", path, {
        method: "DELETE",
    });

    if (!response.ok) {
        logBudgetError("deleteTransaction:response", {
            requestMethod: method,
            requestUrl,
            status: response.status,
        });

        let errorMessage = `Failed to delete transaction: ${response.status}`;
        try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                errorMessage = data.error || data.message || errorMessage;
            }
        } catch {
            // Ignore parse errors
        }
        throw new Error(errorMessage);
    }
}

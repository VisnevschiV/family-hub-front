import { apiFetch } from "./client.js";

function mapMember(rawMember, fallbackIndex) {
    if (rawMember === null || rawMember === undefined) {
        return null;
    }

    if (typeof rawMember === "string" || typeof rawMember === "number") {
        const numericId = Number(rawMember);
        const value = Number.isInteger(numericId) ? numericId : String(rawMember);
        return {
            id: value,
            name: String(rawMember),
        };
    }

    if (typeof rawMember !== "object") {
        return null;
    }

    const id =
        rawMember.id ||
        rawMember.ID ||
        rawMember.personaId ||
        rawMember.personId ||
        rawMember.userId ||
        rawMember.memberId;

    if (id === null || id === undefined) {
        return null;
    }

    const numericId = Number(id);
    const normalizedId = Number.isInteger(numericId) ? numericId : String(id);

    const name =
        rawMember.name ||
        rawMember.fullName ||
        rawMember.displayName ||
        rawMember.email ||
        `Member ${fallbackIndex + 1}`;

    return {
        id: normalizedId,
        name,
    };
}

function extractMembers(payload) {
    const candidates = Array.isArray(payload)
        ? payload
        : payload?.members ||
        payload?.familyMembers ||
        payload?.personas ||
        payload?.people ||
        payload?.participants ||
        payload?.family?.members ||
        [];

    const mapped = candidates
        .map((member, index) => mapMember(member, index))
        .filter(Boolean);

    const uniqueById = new Map();
    for (const member of mapped) {
        if (!uniqueById.has(member.id)) {
            uniqueById.set(member.id, member);
        }
    }

    return Array.from(uniqueById.values());
}

export async function getFamilyMembers() {
    const candidatePaths = [
        "/families/me/members",
        "/families/members",
        "/families/me",
    ];

    for (const path of candidatePaths) {
        const response = await apiFetch(path, {
            method: "GET",
        });

        if (response.ok) {
            try {
                const data = await response.json();
                return extractMembers(data);
            } catch {
                return [];
            }
        }

        if (response.status === 404 || response.status === 405) {
            continue;
        }

        let errorMessage = `Failed to load family members: ${response.status}`;
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
            // Ignore parse errors, keep fallback message.
        }

        throw new Error(errorMessage);
    }

    return [];
}

export async function createFamily(name) {
    const response = await apiFetch("/families", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
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
    const response = await apiFetch("/families/me", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
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
    const response = await apiFetch("/families/me/leave", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
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
    const response = await apiFetch("/families/join", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
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
    const response = await apiFetch("/families/me/join-code", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
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

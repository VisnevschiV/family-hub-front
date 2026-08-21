export const THEME_COOKIE_NAME = "family-hub-theme";

function readThemeCookie() {
    const prefix = `${THEME_COOKIE_NAME}=`;
    const value = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix))
        ?.slice(prefix.length);

    return value === "light" || value === "dark" ? value : null;
}

export function getInitialTheme() {
    return readThemeCookie() || "dark";
}

export function applyTheme(theme, persist = true) {
    const safeTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = safeTheme;
    document.documentElement.style.colorScheme = safeTheme;

    if (persist) {
        document.cookie = `${THEME_COOKIE_NAME}=${safeTheme}; Max-Age=31536000; Path=/; SameSite=Lax`;
    }

    return safeTheme;
}

// In dev the Vite proxy rewrites /frankfurter/* → https://api.frankfurter.app/*
// In production the request goes directly to the public API (no CORS issue server-side).
const FRANKFURTER_BASE =
    import.meta.env.DEV
        ? "/frankfurter"
        : "https://api.frankfurter.app";

/**
 * In-memory cache: { [baseCurrency]: { rates: {[currency]: number}, fetchedAt: number } }
 * Rates are considered fresh for 60 minutes.
 */
const rateCache = {};
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Fetch exchange rates from the base currency to all available currencies.
 * Returns a rates map where rates[to] = how many `to` units equal 1 `base` unit.
 * Example: base=EUR, rates.CHF=0.96 → 1 EUR = 0.96 CHF → 1 CHF = 1/0.96 EUR
 *
 * @param {string} baseCurrency  ISO 4217 code, e.g. "EUR"
 * @returns {Promise<Record<string, number>>}
 */
export async function fetchExchangeRates(baseCurrency) {
    if (!baseCurrency) return {};

    const key = baseCurrency.toUpperCase();
    const cached = rateCache[key];

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.rates;
    }

    const response = await fetch(`${FRANKFURTER_BASE}/latest?from=${encodeURIComponent(key)}`);

    if (!response.ok) {
        throw new Error(`Exchange rate fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const rates = data?.rates ?? {};

    // The base currency converts to itself at 1:1
    rates[key] = 1;

    rateCache[key] = { rates, fetchedAt: Date.now() };
    return rates;
}

/**
 * Convert an amount from `fromCurrency` to `baseCurrency` using a pre-fetched rates map.
 * rates[X] = how many X equal 1 base unit.
 *
 * @param {number} amount
 * @param {string} fromCurrency
 * @param {string} baseCurrency
 * @param {Record<string, number>} rates
 * @returns {number}
 */
export function convertToBase(amount, fromCurrency, baseCurrency, rates) {
    const from = (fromCurrency || "").toUpperCase();
    const base = (baseCurrency || "").toUpperCase();

    if (from === base || !from) return amount;

    const rate = rates[from];
    if (!rate || rate === 0) return amount; // unknown currency — keep as-is

    // 1 base = rate[from] from-units → 1 from-unit = 1/rate[from] base-units
    return amount / rate;
}

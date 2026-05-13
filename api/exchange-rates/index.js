module.exports = async function (context, req) {
    try {
        const baseCurrency = (req.query.from || "EUR").toUpperCase();
        const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(baseCurrency)}`;
        const response = await fetch(url);

        if (!response.ok) {
            context.res = {
                status: response.status,
                body: { error: `Exchange rate fetch failed: ${response.status}` },
            };
            return;
        }

        const data = await response.json();
        context.res = {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: data,
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: { error: error.message || "Exchange rate proxy failed" },
        };
    }
};

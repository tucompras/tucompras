export function formatDate(
    date,
    options = {}
) {

    if (!date) {
        return "";
    }

    const parsedDate =
        date instanceof Date
            ? date
            : new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "";
    }

    const defaultOptions = {

        day: "2-digit",
        month: "2-digit",
        year: "numeric"

    };

    return new Intl.DateTimeFormat(
        "es-CO",
        {
            ...defaultOptions,
            ...options
        }
    ).format(parsedDate);

}


export function formatCurrency(
    value
) {

    const number =
        Number(value) || 0;

    return new Intl.NumberFormat(
        "es-CO",
        {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        }
    ).format(number);

}


export function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


export function generateId() {

    return crypto.randomUUID();

}


export function showElement(
    element
) {

    if (!element) {
        return;
    }

    element.hidden = false;

}


export function hideElement(
    element
) {

    if (!element) {
        return;
    }

    element.hidden = true;

}
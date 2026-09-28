export function normalizeText(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}


export function capitalize(
    value
) {

    if (!value) {
        return "";
    }

    const text =
        String(value).trim();

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );

}


export function isValidEmail(
    email
) {

    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return pattern.test(
        String(email).trim()
    );

}


export function isValidPhone(
    phone
) {

    const normalized =
        String(phone)
            .replace(/\D/g, "");

    return (
        normalized.length >= 7 &&
        normalized.length <= 15
    );

}


export function getErrorMessage(
    error
) {

    if (!error) {
        return "Ocurrió un error.";
    }

    return (
        error.message ||
        "Ocurrió un error inesperado."
    );

}
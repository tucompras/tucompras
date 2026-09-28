
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";

/* =========================================================
   ELEMENTOS
========================================================= */

const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const userAvatar = document.getElementById("userAvatar");
const logoutButton = document.getElementById("logoutButton");

const usersMenuItem = document.getElementById("usersMenuItem");
const clientsMenuItem = document.getElementById("clientsMenuItem");
const gestionesMenuItem = document.getElementById("gestionesMenuItem");
const ticketsMenuItem = document.getElementById("ticketsMenuItem");
const ventasMenuItem = document.getElementById("ventasMenuItem");
const seguimientosMenuItem = document.getElementById("seguimientosMenuItem");
const reportesMenuItem = document.getElementById("reportesMenuItem");
const comandosMenuItem = document.getElementById("comandosMenuItem");
const chatMenuItem = document.getElementById("chatMenuItem");
const dashboardMenuItem = document.getElementById("dashboardMenuItem");

const pageMessage = document.getElementById("pageMessage");
const deviceSelect = document.getElementById("deviceSelect");
const categorySelect = document.getElementById("categorySelect");
const functionSearch = document.getElementById("functionSearch");
const commandSelect = document.getElementById("commandSelect");
const devicePassword = document.getElementById("devicePassword");
const resetPasswordButton = document.getElementById("resetPasswordButton");
const dynamicFields = document.getElementById("dynamicFields");
const compatibilityBox = document.getElementById("compatibilityBox");

const generateButton = document.getElementById("generateButton");
const clearButton = document.getElementById("clearButton");
const commandOutput = document.getElementById("commandOutput");
const copyButton = document.getElementById("copyButton");
const copyFeedback = document.getElementById("copyFeedback");

const resultStatus = document.getElementById("resultStatus");
const verificationBox = document.getElementById("verificationBox");
const verificationText = document.getElementById("verificationText");
const noteBox = document.getElementById("noteBox");
const noteText = document.getElementById("noteText");
const warningBox = document.getElementById("warningBox");
const warningText = document.getElementById("warningText");

const catalogCount = document.getElementById("catalogCount");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistoryButton");

let currentUserProfile = null;
let filteredCommands = [];
let generatedCommand = "";

const DEVICE_LABELS = {
    sp: "BoxTrack SP",
    control: "BoxTrack con control",
    sin_control: "BoxTrack sin control",
    "4_cables": "BoxTrack 4 cables"
};

const ROLE_LABELS = {
    administrador: "Administrador",
    jefe_ventas_marketing: "Jefe de ventas y marketing",
    jefe_ventas: "Jefe de ventas y marketing",
    asesor_comercial: "Asesor comercial",
    asesor_soporte: "Asesor de soporte",
    jefe_soporte: "Jefe de soporte"
};

/* =========================================================
   BASE DEL DOCUMENTO
   Los comandos se estructuran a partir del PDF entregado.
========================================================= */

const COMMANDS = [
    {
        id: "apn",
        category: "conectividad",
        name: "Configurar APN del operador",
        template: "apn{PASS} {APN}",
        parameters: [{
            id: "apnOperator",
            type: "select",
            label: "Operador / SIM",
            options: [
                { value: "virgin", label: "Virgin Mobile" },
                { value: "tigo", label: "Tigo" },
                { value: "movistar", label: "Movistar" },
                { value: "claro", label: "Claro" },
                { value: "wom", label: "WOM" },
                { value: "multi_898", label: "Multioperador 898 / Syniverse" },
                { value: "multi_893", label: "Multioperador Premium 893" },
                { value: "uni_898", label: "Unioperador 898" }
            ]
        }],
        note: "Consulta el APN de la SIM y usa el proveedor correspondiente.",
        verification: "Esperar la respuesta del GPS. El material indica confirmación por SMS, normalmente con una respuesta de APN correcta."
    },
    {
        id: "ip_secumore",
        category: "plataformas",
        name: "IP Secumore Plus",
        template: "adminip{PASS} www.gps2828.com 7018",
        note: "Configuración documentada para Secumore Plus."
    },
    {
        id: "ip_plaspy",
        category: "plataformas",
        name: "IP Plaspy",
        template: "adminip{PASS} 54.85.159.138 8888",
        note: "Configuración documentada para Plaspy."
    },
    {
        id: "ip_traccar",
        category: "plataformas",
        name: "IP Traccar",
        template: "adminip{PASS} 142.4.205.26 5013",
        note: "Configuración documentada para Traccar."
    },
    {
        id: "ip_gpswox",
        category: "plataformas",
        name: "IP GPSWOX",
        template: "adminip{PASS} 142.4.205.26 6013",
        note: "Configuración documentada para GPSWOX."
    },
    {
        id: "ip_protrack",
        category: "plataformas",
        name: "IP Protrack",
        template: "adminip{PASS} tdevice.protrack365.com 9942",
        note: "Después de configurar, el material indica ingresar en plataforma como C-406."
    },
    {
        id: "ip_supertrack",
        category: "plataformas",
        name: "IP Supertrack / Wanwaytrack",
        template: "adminip{PASS} hwc9996.gps998.com 9996",
        note: "Configuración documentada para Supertrack / Wanwaytrack."
    },
    {
        id: "password",
        category: "seguridad",
        name: "Cambiar contraseña",
        template: "password{PASS} {NEW_PASSWORD}",
        parameters: [{ id: "newPassword", type: "text", label: "Nueva contraseña", placeholder: "Ej. 888888", inputmode: "numeric" }],
        verification: "Verifica la respuesta del dispositivo confirmando el cambio de contraseña."
    },
    {
        id: "ubicacion",
        category: "diagnostico",
        name: "Solicitar ubicación",
        template: "smslink{PASS}",
        verification: "El cliente debe recibir el mensaje SMS con el enlace de Google Maps."
    },
    {
        id: "intervalo",
        category: "monitoreo",
        name: "Configurar intervalo de carga",
        template: "fix020s060m***n{PASS}",
        note: "El documento describe 20 segundos inicialmente y después 60 minutos con ACC OFF."
    },
    {
        id: "angulo",
        category: "monitoreo",
        name: "Alarma por cambio de ángulo",
        template: "ANGLE{PASS} {ANGLE}",
        parameters: [{ id: "angle", type: "number", label: "Ángulo en grados", value: "30", min: "1", max: "180" }],
        note: "El material incluye 30 grados como referencia."
    },
    {
        id: "acc_on",
        category: "monitoreo",
        name: "Alarma ACC encendido/apagado",
        template: "acc{PASS}",
        verification: "Notifica a través de la plataforma."
    },
    {
        id: "acc_cancel",
        category: "monitoreo",
        name: "Cancelar alarma ACC",
        template: "noacc{PASS}",
        verification: "Cancela la alarma de encendido/apagado ACC."
    },
    {
        id: "acc_sirena_on",
        category: "monitoreo",
        name: "Activar alarma ACC con sirena",
        template: "acc{PASS} 1",
        verification: "Notifica mediante la sirena cuando corresponde."
    },
    {
        id: "acc_sirena_off",
        category: "monitoreo",
        name: "Cancelar alarma ACC por sirena",
        template: "acc{PASS} 0",
        verification: "Cancela la activación de la sirena por ACC."
    },
    {
        id: "quickstop",
        category: "control",
        name: "Corte rápido de combustible",
        template: "quickstop{PASS}",
        note: "El material indica que no es recomendado usarlo."
    },
    {
        id: "noquickstop",
        category: "control",
        name: "Cancelar corte rápido de combustible",
        template: "noquickstop{PASS}"
    },
    {
        id: "stop",
        category: "control",
        name: "Corte de combustible por velocidad",
        template: "stop{PASS}",
        verification: "El vehículo corta el combustible cuando la velocidad es inferior a 20 km/h según el documento."
    },
    {
        id: "resume",
        category: "control",
        name: "Reanudar combustible",
        template: "resume{PASS}",
        verification: "Esperar confirmación del restablecimiento de combustible."
    },
    {
        id: "arm",
        category: "seguridad",
        name: "Activar modo armado",
        template: "arm{PASS}",
        note: "El documento indica que el sonido de activación se gestiona mediante plataforma."
    },
    {
        id: "disarm",
        category: "seguridad",
        name: "Desactivar modo armado",
        template: "disarm{PASS}",
        note: "El documento indica que el sonido de desactivación se gestiona mediante plataforma."
    },
    {
        id: "silent",
        category: "seguridad",
        name: "Modo silencioso",
        template: "silent{PASS}",
        note: "Modo silencioso del altavoz: no reproduce sonido, pero mantiene el envío de alarmas por SMS."
    },
    {
        id: "lowbattery_on",
        category: "monitoreo",
        name: "Activar alarma de batería baja",
        template: "lowbattery{PASS} on"
    },
    {
        id: "lowbattery_off",
        category: "monitoreo",
        name: "Cancelar alarma de batería baja",
        template: "lowbattery{PASS} off"
    },
    {
        id: "extpower_on",
        category: "monitoreo",
        name: "Activar alarma por desconexión de batería",
        template: "exptower{PASS} on"
    },
    {
        id: "extpower_off",
        category: "monitoreo",
        name: "Cancelar alarma por desconexión de batería",
        template: "exptower{PASS} off"
    },
    {
        id: "move_on",
        category: "monitoreo",
        name: "Alarma de movimiento (200 m)",
        template: "move{PASS} 0200"
    },
    {
        id: "move_off",
        category: "monitoreo",
        name: "Cancelar alarma de movimiento",
        template: "nomove{PASS}"
    },
    {
        id: "vibrate_on",
        category: "monitoreo",
        name: "Activar alarma de vibración",
        template: "vibrate{PASS} 1",
        note: "Usar si se desea notificación de vibración en plataforma."
    },
    {
        id: "vibrate_off",
        category: "monitoreo",
        name: "Cancelar alarma de vibración",
        template: "vibrate{PASS} 0"
    },
    {
        id: "sensitivity_1",
        category: "monitoreo",
        name: "Sensibilidad de vibración - Nivel 1",
        template: "sensitivity{PASS} 1",
        note: "Nivel más sensible."
    },
    {
        id: "sensitivity_2",
        category: "monitoreo",
        name: "Sensibilidad de vibración - Nivel 2",
        template: "sensitivity{PASS} 2",
        note: "Nivel medio."
    },
    {
        id: "sensitivity_3",
        category: "monitoreo",
        name: "Sensibilidad de vibración - Nivel 3",
        template: "sensitivity{PASS} 3",
        note: "Nivel menos sensible."
    },
    {
        id: "sleep_on",
        category: "monitoreo",
        name: "Activar modo sueño",
        template: "sleep{PASS} on",
        note: "GPS/GSM en reposo cuando el vehículo está estacionado."
    },
    {
        id: "sleep_off",
        category: "monitoreo",
        name: "Cancelar modo sueño",
        template: "sleep{PASS} off"
    },
    {
        id: "suppress_on",
        category: "monitoreo",
        name: "Activar supresión estática",
        template: "suppress{PASS}",
        note: "También descrita como supresión estática."
    },
    {
        id: "suppress_off",
        category: "monitoreo",
        name: "Desactivar supresión estática",
        template: "nosuppress{PASS}",
        note: "No genera reporte cuando el dispositivo está detenido."
    },
    {
        id: "pulse_lock",
        category: "control",
        name: "Activar seguro de puertas",
        template: "pulse{PASS} {PULSE}",
        parameters: [{ id: "pulse", type: "text", label: "Parámetros X,Y,A,B", placeholder: "Ej. 1,2,1,3" }],
        compatibility: ["control"],
        note: "Pulso negativo. Verificar la conexión eléctrica según manual."
    },
    {
        id: "pulse_unlock",
        category: "control",
        name: "Desactivar seguro de puertas",
        template: "pulse{PASS} {PULSE}",
        parameters: [{ id: "pulse", type: "text", label: "Parámetros X,Y,A,B", placeholder: "Ej. 2,2,1,3" }],
        compatibility: ["control"],
        note: "Pulso negativo. Verificar la conexión eléctrica según manual."
    },
    {
        id: "speed",
        category: "conduccion",
        name: "Alarma por exceso de velocidad",
        template: "Speed{PASS} {SPEED}",
        parameters: [{ id: "speed", type: "number", label: "Velocidad en km/h", value: "80", min: "1", max: "200" }],
        verification: "El documento indica notificación a plataforma de los excesos de velocidad previamente configurados."
    },
    {
        id: "check",
        category: "diagnostico",
        name: "Verificar parámetros del dispositivo",
        template: "check{PASS}",
        verification: "El documento indica que el reporte incluye batería, señal GPS, ACC, satélites, estado de alarma, conexión de energía, modo sueño, GPRS/SMS/TCP/UDP y otros parámetros."
    },
    {
        id: "ipapn",
        category: "conectividad",
        name: "Verificación de APN / IP",
        template: "IPAPN{PASS}"
    },
    {
        id: "timezone",
        category: "conectividad",
        name: "Configurar zona horaria",
        template: "time zone{PASS} -5",
        note: "Ejemplo del documento para Colombia: UTC -5."
    },
    {
        id: "reset",
        category: "seguridad",
        name: "Restablecer dispositivo",
        template: "reset{PASS}",
        warning: "El documento indica que el dispositivo se apaga y enciende nuevamente."
    },
    {
        id: "kc_0",
        category: "monitoreo",
        name: "Cancelar alarma KC",
        template: "KC{PASS} 0"
    },
    {
        id: "kc_1",
        category: "monitoreo",
        name: "Alarma de GPRS (predeterminada)",
        template: "KC{PASS} 1",
        note: "El documento sugiere usarla si se desea notificación en plataforma."
    },
    {
        id: "kc_2",
        category: "monitoreo",
        name: "Alarma GPRS + SMS",
        template: "KC{PASS} 2"
    },
    {
        id: "kc_3",
        category: "monitoreo",
        name: "Alarma GPRS + SMS + llamada",
        template: "KC{PASS} 3"
    },
    {
        id: "admin",
        category: "microfono",
        name: "Configurar administrador para micrófono",
        template: "admin{PASS} {PHONE}",
        parameters: [{ id: "phone", type: "text", label: "Número administrador", placeholder: "3221234567", inputmode: "numeric", maxLength: 10 }],
        verification: "El GPS debe responder confirmando la configuración del administrador."
    },
    {
        id: "noadmin",
        category: "microfono",
        name: "Eliminar número de administrador",
        template: "noadmin{PASS} {PHONE}",
        parameters: [{ id: "phone", type: "text", label: "Número administrador", placeholder: "3221234567", inputmode: "numeric", maxLength: 10 }]
    },
    {
        id: "authnum",
        category: "microfono",
        name: "Verificar número de administrador",
        template: "authnum{PASS}"
    },
    {
        id: "monitor",
        category: "microfono",
        name: "Activar función de micrófono",
        template: "monitor{PASS}",
        verification: "Configura/activa la función de escucha remota según el material proporcionado.",
        note: "Disponible solo con SIM compatible con VoLTE y con el número de administrador previamente configurado."
    },
    {
        id: "tracker",
        category: "microfono",
        name: "Desactivar función de micrófono",
        template: "Tracker{PASS}",
        note: "El documento indica usar el comando desde el número de administrador."
    },
    {
        id: "drv",
        category: "conduccion",
        name: "Configurar juicio de conducción",
        template: "drv{PASS} {DRIVE_MODE}",
        parameters: [{
            id: "driveMode",
            type: "select",
            label: "Modo",
            options: [
                { value: "0", label: "Cancelar / activar 0" },
                { value: "1", label: "Activar / modo 1" }
            ]
        }],
        note: "El material describe el valor 0/1 como juicio de estado de manejo mediante ACC o vibración."
    },
    {
        id: "less_gprs_on",
        category: "conectividad",
        name: "Modo ahorro de datos - Activar",
        template: "Less gprs{PASS} on",
        note: "El dispositivo entra en reposo después de un período con ACC apagado y despierta al detectar movimiento/ACC."
    },
    {
        id: "less_gprs_off",
        category: "conectividad",
        name: "Modo ahorro de datos - Desactivar",
        template: "Less gprs{PASS} off"
    },
    {
        id: "acc_threshold",
        category: "conduccion",
        name: "Aceleración brusca",
        template: "accthr{PASS} {ACC_ENABLE}\naccthr{PASS} {ACC_THRESHOLD}",
        parameters: [
            {
                id: "accEnable",
                type: "select",
                label: "Activar / cancelar",
                options: [
                    { value: "0", label: "0 - Cancelar" },
                    { value: "1", label: "1 - Activar" }
                ]
            },
            {
                id: "accThreshold",
                type: "number",
                label: "Umbral en km/h",
                value: "50",
                min: "25",
                max: "100"
            }
        ],
        note: "El material indica rango de 25-100 km/h y que primero se activa la función y luego se envía el parámetro.",
        warning: "En este caso el generador produce dos líneas, porque el documento indica enviar primero activación y después el umbral."
    },
    {
        id: "brake_threshold",
        category: "conduccion",
        name: "Frenado brusco",
        template: "brakethr{PASS} {BRAKE_ENABLE}\nbrakethr{PASS} {BRAKE_THRESHOLD}",
        parameters: [
            {
                id: "brakeEnable",
                type: "select",
                label: "Activar / cancelar",
                options: [
                    { value: "0", label: "0 - Cancelar" },
                    { value: "1", label: "1 - Activar" }
                ]
            },
            {
                id: "brakeThreshold",
                type: "number",
                label: "Umbral en km/h",
                value: "40",
                min: "25",
                max: "100"
            }
        ],
        note: "Primero activar y luego enviar el parámetro de umbral, según el documento.",
        warning: "El generador produce dos líneas."
    },
    {
        id: "fatigue",
        category: "conduccion",
        name: "Alarma de fatiga al conducir",
        template: "fatigue{PASS} {FATIGUE}",
        parameters: [{
            id: "fatigue",
            type: "select",
            label: "Activar / cancelar",
            options: [
                { value: "0", label: "0 - Cancelar" },
                { value: "1", label: "1 - Activar" }
            ]
        }]
    },
    {
        id: "turn_threshold",
        category: "conduccion",
        name: "Giro brusco",
        template: "turnthr{PASS} {TURN_ENABLE}\nturnthr{PASS} {TURN_THRESHOLD}",
        parameters: [
            {
                id: "turnEnable",
                type: "select",
                label: "Activar / cancelar",
                options: [
                    { value: "0", label: "0 - Cancelar" },
                    { value: "1", label: "1 - Activar" }
                ]
            },
            {
                id: "turnThreshold",
                type: "number",
                label: "Umbral en grados",
                value: "30",
                min: "25",
                max: "100"
            }
        ],
        note: "Primero activar y luego enviar el parámetro de giro, según el documento.",
        warning: "El generador produce dos líneas."
    },
    {
        id: "ota",
        category: "firmware",
        name: "Actualización de firmware (OTA)",
        template: "OTA{PASS} agps.gps2828.com 21",
        verification: "Esperar actualización y confirmación del dispositivo.",
        note: "El documento destaca que se recomienda enviar este comando antes de comenzar la configuración completa.",
        warning: "Usar únicamente con una conexión estable y cuando corresponda actualizar firmware."
    },
    {
        id: "begin",
        category: "firmware",
        name: "Borrar configuración del dispositivo",
        template: "begin{PASS}",
        verification: "El material indica que borra la configuración guardada menos IP y APN.",
        warning: "Es una operación destructiva sobre la configuración. Verifica antes de enviarla."
    }
];

const APN_OPTIONS = [
    { value: "virgin", label: "Virgin Mobile", command: "web.vmc.net.co", note: "El documento indica que Virgin no tiene VoLTE." },
    { value: "tigo", label: "Tigo", command: "web.colombiamovil.com.co" },
    { value: "movistar", label: "Movistar", command: "internet.movistar.com.co" },
    { value: "claro", label: "Claro", command: "internet.comcel.com.co", note: "El material indica tener plan de datos." },
    { value: "wom", label: "WOM", command: "internet.wom.co" },
    { value: "multi_898", label: "Multioperador 898 / Syniverse", command: "Syniverse" },
    { value: "multi_893", label: "Multioperador Premium 893", command: "internet4gd.gdsp" },
    { value: "uni_898", label: "Unioperador 898", command: "m2m.tag.com" }
];

const CATEGORY_LABELS = {
    conectividad: "Conectividad y APN",
    plataformas: "Plataformas e IP",
    seguridad: "Seguridad y armado",
    diagnostico: "Diagnóstico",
    monitoreo: "Monitoreo y alertas",
    control: "Control del vehículo",
    conduccion: "Conducción y alertas",
    microfono: "Micrófono y administrador",
    firmware: "Firmware y restablecimiento"
};

const CATEGORY_ORDER = [
    "plataformas",
    "conectividad",
    "firmware",
    "control",
    "seguridad",
    "monitoreo",
    "conduccion",
    "microfono",
    "diagnostico"
];

/* =========================================================
   HELPERS DE UI
========================================================= */

function getInitials(name) {
    if (!name) return "U";
    const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map(part => part.charAt(0).toUpperCase()).join("");
}

function formatRole(role) {
    return ROLE_LABELS[role] || "Usuario";
}

function showUser(profile) {
    const name = profile?.nombre || profile?.email || "Usuario";
    if (userName) userName.textContent = name;
    if (userRole) userRole.textContent = formatRole(profile?.rol);
    if (userAvatar) userAvatar.textContent = getInitials(name);
}

function showPageMessage(message, type = "info") {
    if (!pageMessage) return;
    pageMessage.className = `page-message ${type}`;
    pageMessage.textContent = message;
}

function clearPageMessage() {
    if (!pageMessage) return;
    pageMessage.className = "page-message hidden";
    pageMessage.textContent = "";
}

function setResultStatus(label, type = "neutral") {
    if (!resultStatus) return;
    resultStatus.textContent = label;
    resultStatus.className = `status-chip ${type}`;
}

function normalizeDigits(value) {
    return String(value || "").replace(/\D/g, "");
}

function isValidPhone(value) {
    return normalizeDigits(value).length === 10;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* =========================================================
   MENÚ
========================================================= */

function configureMenu(profile) {
    const role = profile?.rol;

    // Comandos está disponible para todos los usuarios autenticados.
    if (comandosMenuItem) comandosMenuItem.style.display = "";

    // Usuarios solo admin.
    if (usersMenuItem && role !== "administrador") {
        usersMenuItem.remove();
    }

    // Soporte: mantiene el menú reducido utilizado en el resto del CRM.
    const isSupport = role === "asesor_soporte" || role === "jefe_soporte";

    if (isSupport) {
        [
            clientsMenuItem,
            gestionesMenuItem,
            ventasMenuItem,
            seguimientosMenuItem,
            reportesMenuItem,
            usersMenuItem
        ].forEach(item => item?.remove());

        if (chatMenuItem) {
            chatMenuItem.dataset.comingSoon = "Chat";
        }
    }
}

function configureComingSoon() {
    document.querySelectorAll("[data-coming-soon]").forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();
            const module = item.dataset.comingSoon || "Módulo";
            showPageMessage(`${module} será habilitado en la siguiente fase.`);
        });
    });
}

/* =========================================================
   CATEGORÍAS / COMANDOS
========================================================= */

function populateCategories() {
    if (!categorySelect) return;

    categorySelect.innerHTML = `<option value="">Seleccionar categoría</option>`;

    CATEGORY_ORDER.forEach(category => {
        if (!COMMANDS.some(command => command.category === category)) return;

        const option = document.createElement("option");
        option.value = category;
        option.textContent = CATEGORY_LABELS[category];
        categorySelect.appendChild(option);
    });
}

function getFilteredCommandData() {
    const category = categorySelect?.value || "";
    const search = String(functionSearch?.value || "").trim().toLowerCase();

    return COMMANDS.filter(command => {
        const categoryMatch = !category || command.category === category;
        const text = `${command.name} ${command.id} ${CATEGORY_LABELS[command.category] || ""}`.toLowerCase();
        const searchMatch = !search || text.includes(search);
        return categoryMatch && searchMatch;
    });
}

function populateCommands(preselectId = "") {
    if (!commandSelect) return;

    filteredCommands = getFilteredCommandData();

    commandSelect.innerHTML = `<option value="">Seleccionar función</option>`;

    filteredCommands.forEach(command => {
        const option = document.createElement("option");
        option.value = command.id;
        option.textContent = command.name;
        commandSelect.appendChild(option);
    });

    if (preselectId && filteredCommands.some(command => command.id === preselectId)) {
        commandSelect.value = preselectId;
    }

    if (catalogCount) {
        catalogCount.textContent = `${COMMANDS.length} comandos`;
    }

    renderDynamicFields();
}

/* =========================================================
   CAMPOS DINÁMICOS
========================================================= */

function renderDynamicFields() {
    if (!dynamicFields || !commandSelect) return;

    dynamicFields.innerHTML = "";

    const command = COMMANDS.find(item => item.id === commandSelect.value);

    if (!command) {
        compatibilityBox?.classList.add("hidden");
        return;
    }

    const fragment = document.createDocumentFragment();

    if (command.parameters?.length) {
        const wrapper = document.createElement("div");
        wrapper.className = "dynamic-grid";

        command.parameters.forEach(parameter => {
            const field = document.createElement("div");
            field.className = `dynamic-field ${parameter.full ? "full" : ""}`;

            const label = document.createElement("label");
            label.setAttribute("for", `dynamic-${parameter.id}`);
            label.textContent = parameter.label;

            let control;

            if (parameter.type === "select") {
                control = document.createElement("select");
                (parameter.options || []).forEach(optionData => {
                    const option = document.createElement("option");
                    option.value = optionData.value;
                    option.textContent = optionData.label;
                    control.appendChild(option);
                });
            } else {
                control = document.createElement("input");
                control.type = parameter.type || "text";
                if (parameter.placeholder) control.placeholder = parameter.placeholder;
                if (parameter.value !== undefined) control.value = parameter.value;
                if (parameter.min !== undefined) control.min = parameter.min;
                if (parameter.max !== undefined) control.max = parameter.max;
                if (parameter.maxLength !== undefined) control.maxLength = parameter.maxLength;
                if (parameter.inputmode) control.inputMode = parameter.inputmode;
            }

            control.id = `dynamic-${parameter.id}`;
            control.dataset.parameterId = parameter.id;
            control.addEventListener("input", refreshCompatibility);
            control.addEventListener("change", refreshCompatibility);

            field.append(label, control);
            wrapper.appendChild(field);
        });

        fragment.appendChild(wrapper);
    }

    dynamicFields.appendChild(fragment);
    refreshCompatibility();
}

function getParameterValue(id) {
    const field = document.getElementById(`dynamic-${id}`);
    return field ? field.value.trim() : "";
}

/* =========================================================
   COMPATIBILIDAD / VALIDACIÓN
========================================================= */

function refreshCompatibility() {
    if (!compatibilityBox) return;

    const command = COMMANDS.find(item => item.id === commandSelect?.value);
    const device = deviceSelect?.value || "";

    compatibilityBox.className = "compatibility-box hidden";
    compatibilityBox.textContent = "";

    if (!command) return;

    if (command.compatibility?.length && device && !command.compatibility.includes(device)) {
        compatibilityBox.className = "compatibility-box error";
        compatibilityBox.textContent = `Esta función está documentada únicamente para: ${command.compatibility.map(key => DEVICE_LABELS[key]).join(", ")}.`;
        return;
    }

    const notices = [];

    if (command.id === "monitor") {
        notices.push("El documento exige una SIM compatible con VoLTE y el número administrador previamente configurado.");
    }

    if (command.id === "apn") {
        const apnOperator = APN_OPTIONS.find(option => option.value === getParameterValue("apnOperator"));
        if (apnOperator?.note) notices.push(apnOperator.note);
    }

    if (command.id === "pulse_lock" || command.id === "pulse_unlock") {
        notices.push("Función por pulso negativo: verifica instalación eléctrica y manual antes de enviarla.");
    }

    if (notices.length) {
        compatibilityBox.className = "compatibility-box";
        compatibilityBox.innerHTML = notices.map(notice => `<div>${escapeHtml(notice)}</div>`).join("");
    }
}

/* =========================================================
   GENERACIÓN
========================================================= */

function buildApnCommand(password) {
    const selected = APN_OPTIONS.find(option => option.value === getParameterValue("apnOperator"));
    if (!selected) return null;

    return {
        command: `apn${password} ${selected.command}`,
        note: selected.note || "APN tomado del documento interno.",
        verification: "Esperar confirmación SMS del GPS. El material indica que normalmente responde confirmando APN."
    };
}

function buildCommand(command) {
    const password = String(devicePassword?.value || "").trim() || "123456";

    if (!/^\d{4,16}$/.test(password)) {
        throw new Error("La contraseña del GPS debe contener entre 4 y 16 dígitos.");
    }

    if (command.id === "apn") {
        return buildApnCommand(password);
    }

    if (command.id === "password") {
        const newPassword = normalizeDigits(getParameterValue("newPassword"));
        if (!/^\d{4,16}$/.test(newPassword)) {
            throw new Error("La nueva contraseña debe contener entre 4 y 16 dígitos.");
        }
        return {
            command: `password${password} ${newPassword}`,
            verification: command.verification,
            note: command.note
        };
    }

    if (command.id === "admin" || command.id === "noadmin") {
        const phone = normalizeDigits(getParameterValue("phone"));
        if (!isValidPhone(phone)) {
            throw new Error("El número de administrador debe tener exactamente 10 dígitos.");
        }
        return {
            command: `${command.id}${password} ${phone}`,
            verification: command.verification,
            note: command.note
        };
    }

    if (command.id === "pulse_lock" || command.id === "pulse_unlock") {
        const pulse = getParameterValue("pulse");
        if (!/^\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+$/.test(pulse)) {
            throw new Error("Usa el formato X,Y,A,B. Ejemplo: 1,2,1,3.");
        }
        return {
            command: `${command.id === "pulse_lock" ? "pulse" : "pulse"}${password} ${pulse}`,
            verification: command.verification,
            note: command.note,
            warning: command.warning
        };
    }

    if (command.id === "angulo") {
        const angle = Number(getParameterValue("angle"));
        if (!Number.isFinite(angle) || angle < 1 || angle > 180) {
            throw new Error("El ángulo debe estar entre 1 y 180 grados.");
        }
        return {
            command: `ANGLE${password} ${angle}`,
            verification: command.verification,
            note: command.note
        };
    }

    if (command.id === "speed") {
        const speed = Number(getParameterValue("speed"));
        if (!Number.isFinite(speed) || speed < 1 || speed > 200) {
            throw new Error("La velocidad debe estar entre 1 y 200 km/h.");
        }
        return {
            command: `Speed${password} ${speed}`,
            verification: command.verification,
            note: command.note
        };
    }

    if (command.id === "drv") {
        const mode = getParameterValue("driveMode");
        return {
            command: `drv${password} ${mode}`,
            verification: command.verification,
            note: command.note
        };
    }

    if (command.id === "acc_threshold") {
        const enable = getParameterValue("accEnable");
        const threshold = Number(getParameterValue("accThreshold"));

        if (!Number.isFinite(threshold) || threshold < 25 || threshold > 100) {
            throw new Error("El umbral de aceleración debe estar entre 25 y 100 km/h.");
        }

        return {
            command: `accthr${password} ${enable}\naccthr${password} ${threshold}`,
            note: command.note,
            warning: command.warning
        };
    }

    if (command.id === "brake_threshold") {
        const enable = getParameterValue("brakeEnable");
        const threshold = Number(getParameterValue("brakeThreshold"));

        if (!Number.isFinite(threshold) || threshold < 25 || threshold > 100) {
            throw new Error("El umbral de frenado debe estar entre 25 y 100 km/h.");
        }

        return {
            command: `brakethr${password} ${enable}\nbrakethr${password} ${threshold}`,
            note: command.note,
            warning: command.warning
        };
    }

    if (command.id === "fatigue") {
        const value = getParameterValue("fatigue");
        return {
            command: `fatigue${password} ${value}`,
            note: command.note
        };
    }

    if (command.id === "turn_threshold") {
        const enable = getParameterValue("turnEnable");
        const threshold = Number(getParameterValue("turnThreshold"));

        if (!Number.isFinite(threshold) || threshold < 25 || threshold > 100) {
            throw new Error("El umbral de giro debe estar entre 25 y 100 grados.");
        }

        return {
            command: `turnthr${password} ${enable}\nturnthr${password} ${threshold}`,
            note: command.note,
            warning: command.warning
        };
    }

    const output = command.template
        .replaceAll("{PASS}", password)
        .replaceAll("{PULSE}", getParameterValue("pulse"))
        .replaceAll("{PHONE}", getParameterValue("phone"))
        .replaceAll("{NEW_PASSWORD}", normalizeDigits(getParameterValue("newPassword")))
        .replaceAll("{ANGLE}", getParameterValue("angle"))
        .replaceAll("{SPEED}", getParameterValue("speed"))
        .replaceAll("{DRIVE_MODE}", getParameterValue("driveMode"))
        .replaceAll("{ACC_ENABLE}", getParameterValue("accEnable"))
        .replaceAll("{ACC_THRESHOLD}", getParameterValue("accThreshold"))
        .replaceAll("{BRAKE_ENABLE}", getParameterValue("brakeEnable"))
        .replaceAll("{BRAKE_THRESHOLD}", getParameterValue("brakeThreshold"))
        .replaceAll("{FATIGUE}", getParameterValue("fatigue"))
        .replaceAll("{TURN_ENABLE}", getParameterValue("turnEnable"))
        .replaceAll("{TURN_THRESHOLD}", getParameterValue("turnThreshold"));

    return {
        command: output,
        verification: command.verification,
        note: command.note,
        warning: command.warning
    };
}

function generateCommand() {
    clearPageMessage();

    const device = deviceSelect?.value || "";
    const selectedCommand = COMMANDS.find(command => command.id === commandSelect?.value);

    try {
        if (!device) {
            throw new Error("Selecciona el dispositivo GPS.");
        }

        if (!selectedCommand) {
            throw new Error("Selecciona la función que deseas generar.");
        }

        if (selectedCommand.compatibility?.length && !selectedCommand.compatibility.includes(device)) {
            throw new Error(`La función seleccionada no está documentada para ${DEVICE_LABELS[device]}.`);
        }

        const result = buildCommand(selectedCommand);

        if (!result?.command) {
            throw new Error("No fue posible construir el comando.");
        }

        generatedCommand = result.command;
        commandOutput.textContent = result.command;
        copyButton.disabled = false;

        verificationText.textContent = result.verification || "No se documentó una respuesta esperada específica.";
        noteText.textContent = result.note || "Sin nota técnica adicional.";
        warningText.textContent = result.warning || "";

        verificationBox.classList.toggle("hidden", !result.verification);
        noteBox.classList.toggle("hidden", !result.note);
        warningBox.classList.toggle("hidden", !result.warning);

        setResultStatus("Comando generado", "success");
        copyFeedback.classList.add("hidden");
        saveHistory(selectedCommand, result.command, device);

    } catch (error) {
        generatedCommand = "";
        commandOutput.textContent = "Selecciona una función válida y completa los parámetros.";
        copyButton.disabled = true;

        verificationBox.classList.add("hidden");
        noteBox.classList.add("hidden");
        warningBox.classList.add("hidden");

        setResultStatus("Revisar datos", "error");
        showPageMessage(error?.message || "No fue posible generar el comando.", "error");
    }
}

/* =========================================================
   COPIAR / HISTORIAL
========================================================= */

async function copyText(value) {
    if (!value) return false;

    try {
        await navigator.clipboard.writeText(value);
        return true;
    } catch {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        return copied;
    }
}

async function copyGeneratedCommand() {
    if (!generatedCommand) return;

    const copied = await copyText(generatedCommand);

    if (copied) {
        copyFeedback.textContent = "Comando copiado al portapapeles.";
        copyFeedback.classList.remove("hidden");
    } else {
        copyFeedback.textContent = "No fue posible copiar automáticamente.";
        copyFeedback.classList.remove("hidden");
    }
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem("crm_boxtrack_command_history") || "[]");
    } catch {
        return [];
    }
}

function saveHistory(command, output, device) {
    const history = getHistory();

    history.unshift({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        commandId: command.id,
        commandName: command.name,
        output,
        device,
        userName: currentUserProfile?.nombre || currentUserProfile?.email || "Usuario",
        createdAt: new Date().toISOString()
    });

    localStorage.setItem(
        "crm_boxtrack_command_history",
        JSON.stringify(history.slice(0, 12))
    );

    renderHistory();
}

function formatHistoryDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Fecha desconocida";

    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(date);
}

function renderHistory() {
    const history = getHistory();

    if (!history.length) {
        historyList.innerHTML = `<div class="history-empty">Todavía no has generado comandos en este navegador.</div>`;
        return;
    }

    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-main">
                <p class="history-command">${escapeHtml(item.output).replaceAll("\n", "<br>")}</p>
                <div class="history-meta">
                    ${escapeHtml(item.commandName)} · ${escapeHtml(DEVICE_LABELS[item.device] || item.device)} · ${escapeHtml(formatHistoryDate(item.createdAt))}
                </div>
            </div>
            <div class="history-actions">
                <button type="button" class="history-copy-button" data-history-id="${escapeHtml(item.id)}">Copiar</button>
            </div>
        </div>
    `).join("");
}

async function copyHistoryItem(historyId) {
    const item = getHistory().find(entry => entry.id === historyId);
    if (!item) return;

    const copied = await copyText(item.output);
    showPageMessage(copied ? "Comando histórico copiado." : "No fue posible copiar el comando.", copied ? "info" : "error");
}

function clearHistory() {
    localStorage.removeItem("crm_boxtrack_command_history");
    renderHistory();
}

/* =========================================================
   ATAJOS / LIMPIAR
========================================================= */

function resetBuilder() {
    deviceSelect.value = "";
    categorySelect.value = "";
    functionSearch.value = "";
    commandSelect.innerHTML = `<option value="">Seleccionar función</option>`;
    dynamicFields.innerHTML = "";
    compatibilityBox.className = "compatibility-box hidden";

    commandOutput.textContent = "Selecciona una función para generar el comando.";
    copyButton.disabled = true;
    generatedCommand = "";

    verificationBox.classList.add("hidden");
    noteBox.classList.add("hidden");
    warningBox.classList.add("hidden");

    setResultStatus("Esperando selección", "neutral");
    clearPageMessage();
}

function applyShortcut(commandId) {
    const command = COMMANDS.find(item => item.id === commandId);
    if (!command) return;

    categorySelect.value = command.category;
    functionSearch.value = "";
    populateCommands(commandId);
    commandSelect.value = commandId;
    renderDynamicFields();

    document.querySelector(".command-builder")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* =========================================================
   EVENTOS
========================================================= */

categorySelect?.addEventListener("change", () => {
    populateCommands();
});

functionSearch?.addEventListener("input", () => {
    populateCommands();
});

commandSelect?.addEventListener("change", () => {
    renderDynamicFields();
    refreshCompatibility();
});

deviceSelect?.addEventListener("change", refreshCompatibility);

devicePassword?.addEventListener("input", refreshCompatibility);

resetPasswordButton?.addEventListener("click", () => {
    devicePassword.value = "123456";
    devicePassword.focus();
    refreshCompatibility();
});

generateButton?.addEventListener("click", generateCommand);
clearButton?.addEventListener("click", resetBuilder);
copyButton?.addEventListener("click", copyGeneratedCommand);
clearHistoryButton?.addEventListener("click", clearHistory);

historyList?.addEventListener("click", event => {
    const button = event.target.closest("[data-history-id]");
    if (!button) return;
    copyHistoryItem(button.dataset.historyId);
});

document.querySelectorAll("[data-shortcut]").forEach(button => {
    button.addEventListener("click", () => {
        applyShortcut(button.dataset.shortcut);
    });
});

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "./login.html";
        } catch (error) {
            showPageMessage("No fue posible cerrar sesión.", "error");
        }
    });
}

configureComingSoon();
populateCategories();
populateCommands();
renderHistory();

/* =========================================================
   AUTENTICACIÓN
========================================================= */

onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "./login.html";
        return;
    }

    try {
        const snapshot = await getDoc(doc(db, "usuarios", user.uid));

        if (!snapshot.exists()) {
            await signOut(auth);
            window.location.href = "./login.html";
            return;
        }

        currentUserProfile = {
            id: snapshot.id,
            ...snapshot.data()
        };

        if (currentUserProfile.estado && currentUserProfile.estado !== "activo") {
            await signOut(auth);
            window.location.href = "./login.html";
            return;
        }

        showUser(currentUserProfile);
        configureMenu(currentUserProfile);

    } catch (error) {
        console.error("Error cargando perfil del generador:", error);
        showPageMessage("No fue posible validar la sesión del usuario.", "error");
    }
});

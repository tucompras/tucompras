import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    runTransaction,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


// ============================================================
// ESTADO
// ============================================================

let currentUserProfile = null;

let clients = [];

let gestiones = [];

let unsubscribeGestiones = null;

let isSaving = false;


// ============================================================
// ELEMENTOS
// ============================================================

const userName =
    document.getElementById("userName");

const userRole =
    document.getElementById("userRole");

const userAvatar =
    document.getElementById("userAvatar");

const usersMenuItem =
    document.getElementById("usersMenuItem");

const logoutButton =
    document.getElementById("logoutButton");

const newGestionButton =
    document.getElementById("newGestionButton");

const refreshGestionesButton =
    document.getElementById("refreshGestionesButton");

const pageMessage =
    document.getElementById("gestionPageMessage") ||
    document.getElementById("pageMessage");

const searchGestion =
    document.getElementById("gestionSearch") ||
    document.getElementById("searchGestion");

const typeFilter =
    document.getElementById("gestionTypeFilter") ||
    document.getElementById("typeFilter");

const resultFilter =
    document.getElementById("gestionResultFilter") ||
    document.getElementById("resultFilter");

const gestionesTableBody =
    document.getElementById("gestionesTableBody");

const gestionCounter =
    document.getElementById("gestionesCountLabel") ||
    document.getElementById("gestionCounter");

const totalGestiones =
    document.getElementById("totalGestiones");

const todayGestiones =
    document.getElementById("todayGestiones");

const pendingFollowups =
    document.getElementById("pendingFollowups");

const overdueFollowups =
    document.getElementById("overdueFollowups");

const yesterdayGestiones =
    document.getElementById("yesterdayGestiones");

const performanceTodayValue =
    document.getElementById("performanceTodayValue");

const todayPerformanceLabel =
    document.getElementById("todayPerformanceLabel");

const performanceYesterdayValue =
    document.getElementById("performanceYesterdayValue");

const performanceComparison =
    document.getElementById("performanceComparison");

const performanceStatus =
    document.getElementById("gestionPerformanceStatus");

const performanceStatusText =
    document.getElementById("gestionPerformanceStatusText");

const trafficGreen =
    document.getElementById("trafficGreen");

const trafficYellow =
    document.getElementById("trafficYellow");

const trafficRed =
    document.getElementById("trafficRed");

const trafficLevelLabel =
    document.getElementById("trafficLevelLabel");

const todayBar =
    document.getElementById("todayGestionesBar");

const yesterdayBar =
    document.getElementById("yesterdayGestionesBar");


// ============================================================
// MODAL
// ============================================================

const gestionModal =
    document.getElementById("gestionModal");

const gestionForm =
    document.getElementById("gestionForm");

const closeGestionModal =
    document.getElementById("closeGestionModal");

const cancelGestionButton =
    document.getElementById("cancelGestionButton");

const gestionClient =
    document.getElementById("gestionClient");

const gestionClientSelector =
    document.getElementById("gestionClientSelector");

const gestionType =
    document.getElementById("gestionType");

const gestionResult =
    document.getElementById("gestionResult");

const gestionDate =
    document.getElementById("gestionDate");

const gestionNextDate =
    document.getElementById("gestionNextDate");

const gestionReminder =
    document.getElementById("gestionReminder");

const gestionDescription =
    document.getElementById("gestionDescription");

const saveGestionButton =
    document.getElementById("saveGestionButton");

const formMessage =
    document.getElementById("gestionFormMessage") ||
    document.getElementById("formMessage");

const supportTicketSection =
    document.getElementById("supportTicketSection");

const supportTicketTitle =
    document.getElementById("supportTicketTitle");

const supportTicketPriority =
    document.getElementById("supportTicketPriority");

const supportTicketDescription =
    document.getElementById("supportTicketDescription");

const supportTicketInfo =
    document.getElementById("supportTicketInfo");


// ============================================================
// PREVIEW DEL CLIENT
// ============================================================

const selectedClientPreview =
    document.getElementById(
        "selectedClientPreview"
    );


// ============================================================
// UTILIDADES
// ============================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function getAdvisorName() {

    return (
        currentUserProfile?.nombre ||
        currentUserProfile?.email ||
        "Usuario"
    );

}


function getInitials(value) {

    const text =
        String(value || "U")
            .trim();

    if (!text) {
        return "U";
    }

    const parts =
        text.split(/\s+/);

    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();

    }

    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

}


function formatRole(role) {

    const roles = {

        administrador:
            "Administrador",

        jefe_ventas_marketing:
            "Jefe de ventas y marketing",

        asesor_comercial:
            "Asesor comercial",

        asesor_soporte:
            "Asesor de soporte"

    };

    return roles[role] || "Usuario";

}


function showPageMessage(
    message,
    type = "info"
) {

    if (!pageMessage) {
        return;
    }

    pageMessage.textContent =
        message;

    pageMessage.className =
        `page-message ${type}`;

}


function hidePageMessage() {

    if (!pageMessage) {
        return;
    }

    pageMessage.textContent = "";

    pageMessage.className =
        "page-message hidden";

}


function showFormMessage(
    message,
    type = "error"
) {

    if (!formMessage) {
        return;
    }

    formMessage.textContent =
        message;

    formMessage.className =
        `form-message ${type}`;

}


function hideFormMessage() {

    if (!formMessage) {
        return;
    }

    formMessage.textContent = "";

    formMessage.className =
        "form-message hidden";

}


function toDate(value) {

    if (!value) {
        return null;
    }

    if (
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate();

    }

    if (
        value instanceof Date
    ) {

        return value;

    }

    return new Date(value);

}


function formatDate(value) {

    const date =
        toDate(value);

    if (!date || Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString(
        "es-CO",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );

}


function isToday(value) {

    const date =
        toDate(value);

    if (!date) {
        return false;
    }

    const now =
        new Date();

    return (
        date.getFullYear() ===
            now.getFullYear() &&

        date.getMonth() ===
            now.getMonth() &&

        date.getDate() ===
            now.getDate()
    );

}


function isOverdue(value) {

    const date =
        toDate(value);

    if (!date) {
        return false;
    }

    return date.getTime() <
        Date.now();

}


// ============================================================
// USUARIO
// ============================================================

async function loadCurrentUserProfile(user) {

    const userRef =
        doc(
            db,
            "usuarios",
            user.uid
        );

    const snapshot =
        await getDoc(userRef);

    if (!snapshot.exists()) {

        throw new Error(
            "No existe el perfil del usuario."
        );

    }

    currentUserProfile = {

        id: snapshot.id,

        ...snapshot.data()

    };

}


function renderCurrentUser() {

    const name =
        getAdvisorName();

    if (userName) {

        userName.textContent =
            name;

    }

    if (userRole) {

        userRole.textContent =
            formatRole(
                currentUserProfile?.rol
            );

    }

    if (userAvatar) {

        userAvatar.textContent =
            getInitials(name);

    }

    if (usersMenuItem) {

        usersMenuItem.style.display =
            currentUserProfile?.rol ===
            "administrador"
                ? ""
                : "none";

    }

}



// ============================================================
// RENDIMIENTO Y SEMÁFORO
// ============================================================

function startOfDay(date = new Date()) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

function sameCalendarDay(value, referenceDate) {
    const date = toDate(value);
    if (!date) return false;

    const ref = startOfDay(referenceDate);
    const target = startOfDay(date);

    return target.getTime() === ref.getTime();
}

function updatePerformancePanel() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayCount = gestiones.filter(item =>
        sameCalendarDay(item.fecha, now)
    ).length;

    const yesterdayCount = gestiones.filter(item =>
        sameCalendarDay(item.fecha, yesterday)
    ).length;

    if (performanceTodayValue) {
        performanceTodayValue.textContent = todayCount;
    }

    if (todayPerformanceLabel) {
        todayPerformanceLabel.textContent = todayCount;
    }

    if (performanceYesterdayValue) {
        performanceYesterdayValue.textContent = yesterdayCount;
    }

    if (yesterdayGestiones) {
        yesterdayGestiones.textContent = yesterdayCount;
    }

    const maxValue = Math.max(todayCount, yesterdayCount, 1);

    if (todayBar) {
        todayBar.style.height = `${Math.max(8, (todayCount / maxValue) * 100)}%`;
    }

    if (yesterdayBar) {
        yesterdayBar.style.height = `${Math.max(8, (yesterdayCount / maxValue) * 100)}%`;
    }

    let level = "red";
    let message = "Sin actividad registrada hoy.";

    if (yesterdayCount === 0) {
        if (todayCount > 0) {
            level = "green";
            message = "Excelente inicio: ya tienes actividad registrada hoy.";
        }
    } else if (todayCount >= yesterdayCount) {
        level = "green";
        message = "Vas al mismo ritmo o por encima de ayer.";
    } else if (todayCount >= Math.ceil(yesterdayCount * 0.5)) {
        level = "yellow";
        message = "Vas avanzando. Aún puedes superar el ritmo de ayer.";
    } else {
        level = "red";
        message = "Hoy hay poca actividad frente a ayer.";
    }

    const percentage = yesterdayCount > 0
        ? Math.round((todayCount / yesterdayCount) * 100)
        : (todayCount > 0 ? 100 : 0);

    if (performanceComparison) {
        performanceComparison.textContent =
            yesterdayCount > 0
                ? `${percentage}% del ritmo de ayer`
                : todayCount > 0
                    ? "Primeras gestiones del día"
                    : "Sin gestiones todavía";
    }

    if (performanceStatus) {
        performanceStatus.className =
            `performance-status ${level}`;
    }

    if (performanceStatusText) {
        performanceStatusText.textContent = message;
    }

    [trafficGreen, trafficYellow, trafficRed].forEach(element => {
        element?.classList.remove("active");
    });

    const activeTraffic =
        level === "green"
            ? trafficGreen
            : level === "yellow"
                ? trafficYellow
                : trafficRed;

    activeTraffic?.classList.add("active");

    if (trafficLevelLabel) {
        trafficLevelLabel.textContent =
            level === "green"
                ? "Buen ritmo"
                : level === "yellow"
                    ? "Ritmo medio"
                    : "Aumentar actividad";
    }
}

function isSupportManagement() {
    return String(gestionType?.value || "").toLowerCase() === "soporte";
}

function toggleSupportTicketSection() {
    if (!supportTicketSection) return;

    const show = isSupportManagement();

    supportTicketSection.classList.toggle("hidden", !show);

    if (supportTicketInfo) {
        supportTicketInfo.textContent = show
            ? "Al registrar esta gestión se creará automáticamente un ticket de soporte para el cliente."
            : "";
    }

    if (show && supportTicketTitle && !supportTicketTitle.value.trim()) {
        const client = clients.find(item => item.id === gestionClient?.value);
        const clientName =
            client?.nombre ||
            client?.nombreWhatsapp ||
            "cliente";

        supportTicketTitle.value =
            `Solicitud de soporte - ${clientName}`;
    }

    if (show && supportTicketDescription && !supportTicketDescription.value.trim()) {
        const description = gestionDescription?.value?.trim() || "";
        if (description) {
            supportTicketDescription.value = description;
        }
    }
}

function getTimestampNumber(value) {
    if (!value) return 0;

    if (typeof value.toMillis === "function") {
        return value.toMillis();
    }

    const date = toDate(value);
    return date ? date.getTime() : 0;
}

async function findAvailableSupportUser() {

    const queueRef =
        doc(
            db,
            "configuracion",
            "soporte"
        );

    try {

        const queueSnapshot =
            await getDoc(
                queueRef
            );

        if (!queueSnapshot.exists()) {

            throw new Error(
                "No existe la configuración de la cola de soporte."
            );
        }

        const queueData =
            queueSnapshot.data() || {};

        const availableSupport =
            Array.isArray(queueData.soportes)
                ? queueData.soportes.filter(
                    support =>
                        support &&
                        typeof support.id === "string" &&
                        support.id.trim() !== ""
                )
                : [];

        if (!availableSupport.length) {

            throw new Error(
                "No hay asesores de soporte habilitados para recibir tickets."
            );
        }

        /*
         * Selección realmente aleatoria.
         * No actualizamos la cola ni el documento del soporte.
         * Esto evita permisos innecesarios y hace que Tickets y Gestiones
         * utilicen la misma fuente de datos para seleccionar soporte.
         */
        const randomIndex =
            Math.floor(
                Math.random() * availableSupport.length
            );

        const selectedSupport =
            availableSupport[randomIndex];

        return {
            id:
                selectedSupport.id,

            nombre:
                selectedSupport.nombre ||
                "Soporte",

            email:
                selectedSupport.email ||
                "",

            rol:
                "asesor_soporte",

            recibeTickets:
                true
        };

    } catch (error) {

        console.error(
            "Error obteniendo soporte para asignación aleatoria:",
            error
        );

        throw error;
    }
}

async function generateTicketNumberForGestion() {
    const counterRef = doc(
        db,
        "configuracion",
        "tickets"
    );

    const ticketNumber = await runTransaction(
        db,
        async transaction => {
            const snapshot = await transaction.get(counterRef);

            const currentNumber = snapshot.exists()
                ? Number(snapshot.data().ultimoNumero || 0)
                : 0;

            const nextNumber = currentNumber + 1;

            transaction.set(
                counterRef,
                {
                    ultimoNumero: nextNumber,
                    actualizadoEn: serverTimestamp()
                },
                { merge: true }
            );

            return nextNumber;
        }
    );

    return `TKT-${String(ticketNumber).padStart(6, "0")}`;
}

async function prepareSupportTicketForGestion({
    client,
    management,
    ticketTitle,
    ticketPriority,
    ticketDescription
}) {
    if (!currentUserProfile) {
        throw new Error("No se ha cargado el usuario actual.");
    }

    if (!hasPermissionForTicketCreation()) {
        throw new Error(
            "Tu usuario no tiene permiso para crear tickets de soporte."
        );
    }

    const supportResponsible =
        await findAvailableSupportUser();

    const ticketNumber =
        await generateTicketNumberForGestion();

    const ticketRef = doc(
        collection(db, "tickets")
    );

    const historyRef = doc(
        collection(
            db,
            "tickets",
            ticketRef.id,
            "historial"
        )
    );

    const initialStatus =
        supportResponsible
            ? "asignado"
            : "nuevo";

    const advisorName = getAdvisorName();

    const ticketData = {
        numero: ticketNumber,
        clienteId: client.id,
        clienteNombre:
            client.nombre ||
            client.nombreWhatsapp ||
            "Cliente",
        clienteEmpresa:
            client.empresa || "",

        creadoPorId:
            currentUserProfile.id,

        creadoPorNombre:
            advisorName,

        responsableComercialId:
            currentUserProfile.id,

        responsableComercialNombre:
            advisorName,

        responsableSoporteId:
            supportResponsible?.id || null,

        responsableSoporteNombre:
            supportResponsible
                ? (
                    supportResponsible.nombre ||
                    supportResponsible.email ||
                    "Soporte"
                )
                : "",

        categoria: "soporte",
        prioridad: ticketPriority,
        titulo: ticketTitle,
        descripcion: ticketDescription,
        estado: initialStatus,

        ultimaGestion:
            management.descripcion || "",

        ultimaGestionEn:
            management.fecha,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    const historyData = {
        tipo: "creacion",
        accion: "creacion",
        comentario:
            supportResponsible
                ? "Ticket creado automáticamente desde una gestión y asignado a soporte."
                : "Ticket creado automáticamente desde una gestión. Pendiente de asignación de soporte.",

        estadoNuevo: initialStatus,

        responsableComercialNuevo:
            currentUserProfile.id,

        responsableComercialNombreNuevo:
            advisorName,

        responsableSoporteNuevo:
            supportResponsible?.id || null,

        responsableSoporteNombreNuevo:
            supportResponsible
                ? (
                    supportResponsible.nombre ||
                    supportResponsible.email ||
                    "Soporte"
                )
                : "",

        usuarioId:
            currentUserProfile.id,

        usuarioNombre:
            advisorName,

        usuarioRol:
            currentUserProfile.rol || "",

        createdAt:
            serverTimestamp()
    };

    return {
        ticketRef,
        historyRef,
        ticketData,
        historyData,
        ticketNumber,
        supportResponsible
    };
}

async function finalizeSupportTicketAssignment(ticketInfo) {

    const supportResponsible =
        ticketInfo?.supportResponsible;

    if (!supportResponsible) {
        return;
    }

    try {

        await addDoc(
            collection(
                db,
                "notificaciones"
            ),
            {
                tipo:
                    "ticket_asignado",

                titulo:
                    `Nuevo ticket ${ticketInfo.ticketNumber}`,

                mensaje:
                    `Se te asignó el ticket ${ticketInfo.ticketNumber}.`,

                ticketId:
                    ticketInfo.ticketRef.id,

                ticketNumero:
                    ticketInfo.ticketNumber,

                usuarioDestinoId:
                    supportResponsible.id,

                leida:
                    false,

                createdAt:
                    serverTimestamp()
            }
        );

    } catch (error) {

        console.warn(
            "Ticket creado, pero no se pudo registrar la notificación.",
            error
        );

    }
}

function isAdmin() {
    return currentUserProfile?.rol === "administrador";
}

function canSelectClientManually() {
    return isAdmin();
}

function hasPermissionForTicketCreation() {
    return (
        currentUserProfile?.permisos?.tickets_crear === true ||
        currentUserProfile?.rol === "administrador" ||
        currentUserProfile?.rol === "jefe_ventas_marketing"
    );
}

// ============================================================
// CLIENTES
// ============================================================

async function loadClients() {

    if (!currentUserProfile) {
        return;
    }

    try {

        let clientsQuery;

                /*
         * Cualquier usuario con permiso para crear gestiones debe poder
         * cargar los clientes necesarios para registrar una gestión, aunque
         * el cliente haya sido creado por otro asesor.
         *
         * El selector manual sigue oculto para los no administradores; el
         * cliente se determina por el enlace Clientes -> Gestionar.
         */
        if (
            canSelectClientManually() ||
            currentUserProfile?.permisos?.gestiones_crear === true
        ) {
            clientsQuery = query(
                collection(db, "clientes")
            );
        } else if (currentUserProfile?.rol === "asesor_comercial") {
            clientsQuery = query(
                collection(db, "clientes"),
                where(
                    "asesorComercialId",
                    "==",
                    currentUserProfile.id
                )
            );
        } else if (currentUserProfile?.rol === "asesor_soporte") {
            clientsQuery = query(
                collection(db, "clientes"),
                where(
                    "asesorSoporteId",
                    "==",
                    currentUserProfile.id
                )
            );
        } else {
            clientsQuery = query(
                collection(db, "clientes")
            );
        }

        const snapshot = await getDocs(clientsQuery);

        clients = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        clients.sort((a, b) => {
            const aName = (a.nombre || a.nombreWhatsapp || "").toLowerCase();
            const bName = (b.nombre || b.nombreWhatsapp || "").toLowerCase();
            return aName.localeCompare(bName, "es");
        });

        renderClientOptions();

    } catch (error) {

        console.error(
            "Error cargando clientes para gestiones:",
            error
        );

        showPageMessage(
            `No se pudieron cargar los clientes: ${error.message}`,
            "error"
        );

    }

}


// ============================================================
// OPCIONES CLIENTE
// ============================================================

function renderClientOptions(
    selectedId = ""
) {

    if (!gestionClient) {
        return;
    }

    if (gestionClientSelector) {
        gestionClientSelector.classList.toggle(
            "hidden",
            !canSelectClientManually()
        );
    }

    gestionClient.innerHTML = `
        <option value="">
            Selecciona un cliente
        </option>
    `;


    clients.forEach(
        client => {

            const displayName =
                client.nombre ||
                client.nombreWhatsapp ||
                "Cliente sin nombre";

            const whatsapp =
                client.whatsapp
                    ? ` · ${client.whatsapp}`
                    : "";

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                client.id;

            option.textContent =
                `${displayName}${whatsapp}`;

            gestionClient.appendChild(
                option
            );

        }
    );


    if (selectedId) {

        gestionClient.value =
            selectedId;

        renderSelectedClientPreview();

    }

}


// ============================================================
// PREVIEW CLIENTE
// ============================================================

function renderSelectedClientPreview() {

    if (!selectedClientPreview) {
        return;
    }

    const selectedId =
        gestionClient?.value;

    if (!selectedId) {

        selectedClientPreview.classList.add(
            "hidden"
        );

        selectedClientPreview.innerHTML =
            "";

        return;

    }


    const client =
        clients.find(
            item => item.id === selectedId
        );

    if (!client) {

        selectedClientPreview.classList.add(
            "hidden"
        );

        return;

    }


    const name =
        client.nombre ||
        client.nombreWhatsapp ||
        "Cliente sin nombre";


    selectedClientPreview.innerHTML = `

        <div class="selected-client-title">
            Cliente seleccionado
        </div>

        <div class="selected-client-data">

            <div>
                <span>Nombre</span>
                <strong>
                    ${escapeHtml(name)}
                </strong>
            </div>

            <div>
                <span>WhatsApp</span>
                <strong>
                    ${escapeHtml(client.whatsapp || "—")}
                </strong>
            </div>

            <div>
                <span>Empresa</span>
                <strong>
                    ${escapeHtml(client.empresa || "—")}
                </strong>
            </div>

            <div>
                <span>Ciudad</span>
                <strong>
                    ${escapeHtml(client.ciudad || "—")}
                </strong>
            </div>

        </div>

        <div class="selected-client-advisor">

            Gestión registrada automáticamente por:
            <strong>
                ${escapeHtml(getAdvisorName())}
            </strong>

        </div>
    `;


    selectedClientPreview.classList.remove(
        "hidden"
    );

}


// ============================================================
// GESTIONES
// ============================================================

function listenGestiones() {

    if (!currentUserProfile) {
        return;
    }

    if (unsubscribeGestiones) {

        unsubscribeGestiones();

        unsubscribeGestiones = null;

    }


    let gestionesQuery;


    if (
        currentUserProfile.rol ===
            "administrador" ||

        currentUserProfile.rol ===
            "jefe_ventas_marketing"
    ) {

        gestionesQuery =
            query(
                collection(
                    db,
                    "gestiones"
                )
            );

    } else {

        gestionesQuery =
            query(
                collection(
                    db,
                    "gestiones"
                ),
                where(
                    "usuarioId",
                    "==",
                    currentUserProfile.id
                )
            );

    }


    unsubscribeGestiones =
        onSnapshot(

            gestionesQuery,

            snapshot => {

                gestiones =
                    snapshot.docs.map(
                        item => ({
                            id: item.id,
                            ...item.data()
                        })
                    );


                gestiones.sort(
                    (a, b) => {

                        const aTime =
                            toDate(
                                a.fecha
                            )?.getTime() || 0;

                        const bTime =
                            toDate(
                                b.fecha
                            )?.getTime() || 0;

                        return bTime - aTime;

                    }
                );


                renderGestiones();

            },

            error => {

                console.error(
                    "Error escuchando gestiones:",
                    error
                );

                showPageMessage(
                    `No se pudieron cargar las gestiones: ${error.message}`,
                    "error"
                );

            }

        );

}


// ============================================================
// RENDER GESTIONES
// ============================================================

function renderGestiones() {

    if (!gestionesTableBody) {
        return;
    }


    const search =
        String(
            searchGestion?.value || ""
        )
            .trim()
            .toLowerCase();


    const type =
        typeFilter?.value || "";


    const result =
        resultFilter?.value || "";


    const filtered =
        gestiones.filter(
            gestion => {

                const searchable = [

                    gestion.clienteNombre,

                    gestion.clienteEmpresa,

                    gestion.usuarioNombre,

                    gestion.descripcion,

                    gestion.tipo,

                    gestion.resultado

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchable.includes(
                        search
                    );


                const matchesType =
                    !type ||
                    String(gestion.tipo || "").toLowerCase() ===
                        String(type).toLowerCase();

                const matchesResult =
                    !result ||
                    String(gestion.resultado || "").toLowerCase().replaceAll(" ", "_") ===
                        String(result).toLowerCase().replaceAll(" ", "_");


                return (
                    matchesSearch &&
                    matchesType &&
                    matchesResult
                );

            }
        );


    if (gestionCounter) {

        gestionCounter.textContent =
            `Gestiones ${filtered.length}`;

    }


    if (totalGestiones) {

        totalGestiones.textContent =
            gestiones.length;

    }


    const today =
        gestiones.filter(
            item =>
                isToday(item.fecha)
        ).length;


    if (todayGestiones) {

        todayGestiones.textContent =
            today;

    }


    const withFollowup =
        gestiones.filter(
            item =>
                item.proximoSeguimiento
        );


    const pending =
        withFollowup.filter(
            item =>
                !isOverdue(
                    item.proximoSeguimiento
                )
        ).length;


    const overdue =
        withFollowup.filter(
            item =>
                isOverdue(
                    item.proximoSeguimiento
                )
        ).length;


    if (pendingFollowups) {

        pendingFollowups.textContent =
            pending;

    }


    if (overdueFollowups) {

        overdueFollowups.textContent =
            overdue;

    }


    if (!filtered.length) {

        gestionesTableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="table-empty"
                >
                    No hay gestiones para mostrar.
                </td>

            </tr>

        `;

        return;

    }


    gestionesTableBody.innerHTML =
        filtered
            .map(
                gestion => {

                    const nextDate =
                        gestion.proximoSeguimiento
                            ? formatDate(
                                gestion.proximoSeguimiento
                            )
                            : "—";


                    return `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    formatDate(
                                        gestion.fecha
                                    )
                                )}
                            </td>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        gestion.clienteNombre ||
                                        "Cliente"
                                    )}
                                </strong>

                                ${
                                    gestion.clienteEmpresa
                                        ? `
                                            <small style="display:block;">
                                                ${escapeHtml(
                                                    gestion.clienteEmpresa
                                                )}
                                            </small>
                                        `
                                        : ""
                                }
                            </td>

                            <td>
                                ${escapeHtml(
                                    gestion.usuarioNombre ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    gestion.tipo ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    gestion.resultado ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    gestion.descripcion ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    nextDate
                                )}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

    updatePerformancePanel();
}


// ============================================================
// FORMULARIO
// ============================================================

function getLocalDateTimeValue() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    const hours =
        String(
            now.getHours()
        ).padStart(2, "0");

    const minutes =
        String(
            now.getMinutes()
        ).padStart(2, "0");


    return `${year}-${month}-${day}T${hours}:${minutes}`;

}


function prepareForm(
    selectedClientId = ""
) {

    if (gestionForm) {
        gestionForm.reset();
    }

    hideFormMessage();

    if (gestionDate) {

        gestionDate.value =
            getLocalDateTimeValue();

    }

    if (gestionNextDate) {

        gestionNextDate.value =
            "";

    }

    renderClientOptions(
        selectedClientId
    );

}


function openGestionModal(
    selectedClientId = ""
) {

    prepareForm(
        selectedClientId
    );


    if (gestionModal) {

        gestionModal.classList.remove(
            "hidden"
        );

    }


    setTimeout(
        () => {

            if (selectedClientId) {

                renderSelectedClientPreview();

            } else if (canSelectClientManually() && gestionClient) {

                gestionClient.focus();

            } else if (!canSelectClientManually()) {

                showFormMessage(
                    "Para registrar una gestión como asesor, abre el cliente desde Clientes. El cliente se cargará automáticamente.",
                    "info"
                );

            }

        },
        100
    );

}


function closeGestionModalWindow() {

    if (gestionModal) {

        gestionModal.classList.add(
            "hidden"
        );

    }

    hideFormMessage();

}


// ============================================================
// GUARDAR GESTION
// ============================================================

async function saveGestion(event) {

    event.preventDefault();

    if (isSaving) {
        return;
    }


    hideFormMessage();


    if (!currentUserProfile) {

        showFormMessage(
            "No se ha cargado el usuario.",
            "error"
        );

        return;

    }


    const clientId =
        gestionClient?.value || "";


    const type =
        gestionType?.value || "";


    const result =
        gestionResult?.value || "";


    const dateValue =
        gestionDate?.value || "";


    const nextDateValue =
        gestionNextDate?.value || "";


    const reminder =
        gestionReminder?.value || "";


    const description =
        String(
            gestionDescription?.value || ""
        ).trim();

    const createsSupportTicket =
        String(type).toLowerCase() === "soporte";

    const ticketTitle =
        String(
            supportTicketTitle?.value || ""
        ).trim();

    const ticketPriority =
        supportTicketPriority?.value || "media";

    const ticketDescription =
        String(
            supportTicketDescription?.value || ""
        ).trim();


    if (!clientId) {

        showFormMessage(
            canSelectClientManually()
                ? "Selecciona un cliente."
                : "Abre primero el cliente desde Clientes para registrar la gestión.",
            "error"
        );

        return;

    }


    if (!type) {

        showFormMessage(
            "Selecciona el tipo de gestión.",
            "error"
        );

        return;

    }


    if (!result) {

        showFormMessage(
            "Selecciona el resultado.",
            "error"
        );

        return;

    }


    if (!dateValue) {

        showFormMessage(
            "Selecciona la fecha y hora.",
            "error"
        );

        return;

    }


    if (!description) {

        showFormMessage(
            "Escribe la descripción de la gestión.",
            "error"
        );

        return;

    }

    if (createsSupportTicket) {

        if (!hasPermissionForTicketCreation()) {
            showFormMessage(
                "Tu usuario no tiene permiso para crear tickets de soporte.",
                "error"
            );

            return;
        }

        if (ticketTitle.length < 3) {
            showFormMessage(
                "Escribe el título del ticket de soporte.",
                "error"
            );

            supportTicketTitle?.focus();

            return;
        }

        if (ticketDescription.length < 5) {
            showFormMessage(
                "Describe el problema que necesita atención de soporte.",
                "error"
            );

            supportTicketDescription?.focus();

            return;
        }
    }


    const client =
        clients.find(
            item =>
                item.id === clientId
        );


    if (!client) {

        showFormMessage(
            "No se encontró el cliente seleccionado.",
            "error"
        );

        return;

    }


    const gestionDateObject =
        new Date(dateValue);


    const nextDateObject =
        nextDateValue
            ? new Date(nextDateValue)
            : null;


    if (
        Number.isNaN(
            gestionDateObject.getTime()
        )
    ) {

        showFormMessage(
            "La fecha de gestión no es válida.",
            "error"
        );

        return;

    }


    if (
        nextDateObject &&
        Number.isNaN(
            nextDateObject.getTime()
        )
    ) {

        showFormMessage(
            "El próximo seguimiento no es válido.",
            "error"
        );

        return;

    }


    isSaving = true;


    if (saveGestionButton) {

        saveGestionButton.disabled =
            true;

        saveGestionButton.textContent =
            "Registrando...";

    }


    try {

        const advisorName =
            getAdvisorName();


        const gestionData = {

            clienteId:
                client.id,

            clienteNombre:
                client.nombre ||
                client.nombreWhatsapp ||
                "Cliente",

            clienteEmpresa:
                client.empresa ||
                "",

            usuarioId:
                currentUserProfile.id,

            usuarioNombre:
                advisorName,

            tipo:
                type,

            resultado:
                result,

            descripcion:
                description,

            fecha:
                gestionDateObject,

            proximoSeguimiento:
                nextDateObject,

            recordatorio:
                reminder,

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        };

        /*
         * Si la gestión es de soporte, preparamos
         * el ticket antes de ejecutar el batch.
         * Así gestión + ticket quedan registrados juntos.
         */
        let ticketInfo = null;

        if (createsSupportTicket) {
            ticketInfo =
                await prepareSupportTicketForGestion({
                    client,
                    management: gestionData,
                    ticketTitle,
                    ticketPriority,
                    ticketDescription
                });
        }

        const gestionRef =
            doc(collection(db, "gestiones"));

        const batch =
            writeBatch(db);

        batch.set(
            gestionRef,
            gestionData
        );

        if (ticketInfo) {
            batch.set(
                ticketInfo.ticketRef,
                ticketInfo.ticketData
            );

            batch.set(
                ticketInfo.historyRef,
                ticketInfo.historyData
            );
        }

        await batch.commit();

        // El resumen del cliente es complementario. Si las reglas actuales
        // no permiten actualizarlo al asesor, la gestión NO se revierte.
        try {
            await updateDoc(
                doc(db, "clientes", client.id),
                {
                    fechaUltimaGestion: serverTimestamp(),
                    ultimaGestionTipo: type,
                    ultimaGestionResultado: result,
                    ultimaGestionPorId: currentUserProfile.id,
                    ultimaGestionPorNombre: advisorName,
                    updatedAt: serverTimestamp()
                }
            );
        } catch (clientUpdateError) {
            console.warn(
                "Gestión guardada. No se pudo actualizar el resumen del cliente por las reglas actuales:",
                clientUpdateError
            );
        }

        if (ticketInfo) {
            await finalizeSupportTicketAssignment(
                ticketInfo
            );
        }

        closeGestionModalWindow();

        showPageMessage(
            ticketInfo
                ? `Gestión registrada y ticket ${ticketInfo.ticketNumber} creado correctamente.`
                : "Gestión registrada correctamente.",
            "success"
        );


        await loadClients();


    } catch (error) {

        console.error(
            "Error registrando gestión:",
            error
        );

        showFormMessage(
            `No se pudo registrar la gestión: ${error.message}`,
            "error"
        );

    } finally {

        isSaving = false;

        if (saveGestionButton) {

            saveGestionButton.disabled =
                false;

            saveGestionButton.textContent =
                "Registrar gestión";

        }

    }

}


// ============================================================
// URL
// ============================================================

function handleUrlClient() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const clientId =
        params.get(
            "clienteId"
        );


    const isNew =
        params.get(
            "nuevo"
        ) === "1";


    if (!clientId || !isNew) {
        return;
    }


    /*
     * El cliente ya fue cargado antes de llamar
     * esta función.
     */

    const clientExists =
        clients.some(
            item =>
                item.id === clientId
        );


    if (!clientExists) {

        showPageMessage(
            "El cliente indicado no está disponible para gestión.",
            "error"
        );

        return;

    }


    openGestionModal(
        clientId
    );


    // Limpiar la URL sin recargar

    const cleanUrl =
        window.location.pathname;

    window.history.replaceState(
        {},
        document.title,
        cleanUrl
    );

}


// ============================================================
// EVENTOS
// ============================================================

function setupEvents() {

    // Nueva gestión

    if (newGestionButton) {

        newGestionButton.addEventListener(
            "click",
            () => {

                if (!canSelectClientManually()) {
                    showPageMessage(
                        "Para registrar una gestión, abre primero el cliente desde Clientes y pulsa Gestionar.",
                        "info"
                    );
                    return;
                }

                openGestionModal();

            }
        );

    }


    // Actualizar

    if (refreshGestionesButton) {

        refreshGestionesButton.addEventListener(
            "click",
            async () => {

                hidePageMessage();

                await loadClients();

                renderGestiones();

            }
        );

    }


    // Cliente seleccionado

    if (gestionClient) {

        gestionClient.addEventListener(
            "change",
            () => {
                renderSelectedClientPreview();
                toggleSupportTicketSection();
            }
        );

    }

    if (gestionType) {
        gestionType.addEventListener(
            "change",
            () => {
                toggleSupportTicketSection();
            }
        );
    }

    if (gestionDescription) {
        gestionDescription.addEventListener(
            "input",
            () => {
                if (
                    isSupportManagement() &&
                    supportTicketDescription &&
                    !supportTicketDescription.value.trim()
                ) {
                    supportTicketDescription.value =
                        gestionDescription.value;
                }
            }
        );
    }


    // Formulario

    if (gestionForm) {

        gestionForm.addEventListener(
            "submit",
            saveGestion
        );

    }


    // Cerrar

    if (closeGestionModal) {

        closeGestionModal.addEventListener(
            "click",
            closeGestionModalWindow
        );

    }


    if (cancelGestionButton) {

        cancelGestionButton.addEventListener(
            "click",
            closeGestionModalWindow
        );

    }


    if (gestionModal) {

        gestionModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    gestionModal
                ) {

                    closeGestionModalWindow();

                }

            }
        );

    }


    // Filtros

    if (searchGestion) {

        searchGestion.addEventListener(
            "input",
            renderGestiones
        );

    }


    if (typeFilter) {

        typeFilter.addEventListener(
            "change",
            renderGestiones
        );

    }


    if (resultFilter) {

        resultFilter.addEventListener(
            "change",
            renderGestiones
        );

    }


    // Próximamente

    document
        .querySelectorAll(
            "[data-coming-soon]"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    showPageMessage(
                        `${item.dataset.comingSoon} estará disponible próximamente.`,
                        "info"
                    );

                }
            );

        });


    // Escape

    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {

                closeGestionModalWindow();

            }

        }
    );


    // Logout

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async () => {

                try {

                    await signOut(auth);

                    window.location.href =
                        "./login.html";

                } catch (error) {

                    console.error(
                        "Error cerrando sesión:",
                        error
                    );

                }

            }
        );

    }

}


// ============================================================
// INICIO
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "./login.html";

            return;

        }


        try {

            await loadCurrentUserProfile(
                user
            );

            if (
                currentUserProfile.estado &&
                currentUserProfile.estado !== "activo"
            ) {
                await signOut(auth);
                window.location.href = "./login.html";
                return;
            }

            renderCurrentUser();

            setupEvents();

            await loadClients();

            listenGestiones();

            /*
             * MUY IMPORTANTE:
             * Solo abrimos el modal después de haber
             * cargado los clientes.
             */

            handleUrlClient();


        } catch (error) {

            console.error(
                "Error inicializando Gestiones:",
                error
            );

            showPageMessage(
                `Error inicializando Gestiones: ${error.message}`,
                "error"
            );

        }

    }
);
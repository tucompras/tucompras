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
    runTransaction,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    auth,
    db,
    app
} from "./firebase-config.js";

/* ============================================================
   ESTADO GLOBAL
============================================================ */

let currentUserProfile = null;

let clients = [];
let users = [];
let tickets = [];

let selectedTicket = null;

let unsubscribeTickets = null;
let unsubscribeHistory = null;

let isSavingTicket = false;
let isSavingChanges = false;


/* ============================================================
   DOM
============================================================ */

const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const logoutButton = document.getElementById("logoutButton");

const usersMenuItem = document.getElementById("usersMenuItem");
const dashboardMenuItem = document.getElementById("dashboardMenuItem");
const clientsMenuItem = document.getElementById("clientsMenuItem");
const gestionesMenuItem = document.getElementById("gestionesMenuItem");
const ticketsMenuItem = document.getElementById("ticketsMenuItem");
const ventasMenuItem = document.getElementById("ventasMenuItem");
const seguimientosMenuItem = document.getElementById("seguimientosMenuItem");
const reportesMenuItem = document.getElementById("reportesMenuItem");
const chatMenuItem = document.getElementById("chatMenuItem");

const newTicketButton = document.getElementById("newTicketButton");
const refreshTicketsButton = document.getElementById("refreshTicketsButton");

const ticketPageMessage = document.getElementById("ticketPageMessage");

const ticketSearch = document.getElementById("ticketSearch");
const ticketStatusFilter = document.getElementById("ticketStatusFilter");
const ticketPriorityFilter = document.getElementById("ticketPriorityFilter");

const ticketsTableBody = document.getElementById("ticketsTableBody");
const ticketsCountLabel = document.getElementById("ticketsCountLabel");

const totalTickets = document.getElementById("totalTickets");
const newTickets = document.getElementById("newTickets");
const inProgressTickets = document.getElementById("inProgressTickets");
const resolvedTickets = document.getElementById("resolvedTickets");
const assignedClientsCount = document.getElementById("assignedClientsCount");
const returnedTicketsCount = document.getElementById("returnedTicketsCount");
const assignedClientsCard = document.querySelector(".assigned-clients-card");
const returnedTicketsCard = document.querySelector(".returned-tickets-card");


/* ============================================================
   MODAL CREAR
============================================================ */

const ticketModal = document.getElementById("ticketModal");
const ticketModalTitle = document.getElementById("ticketModalTitle");

const closeTicketModal = document.getElementById("closeTicketModal");
const cancelTicketButton = document.getElementById("cancelTicketButton");

const ticketForm = document.getElementById("ticketForm");
const ticketFormMessage = document.getElementById("ticketFormMessage");

const ticketClient = document.getElementById("ticketClient");
const ticketCommercialResponsible = document.getElementById(
    "ticketCommercialResponsible"
);
const ticketResponsible = document.getElementById("ticketResponsible");
const ticketCategory = document.getElementById("ticketCategory");
const ticketPriority = document.getElementById("ticketPriority");
const ticketTitle = document.getElementById("ticketTitle");
const ticketDescription = document.getElementById("ticketDescription");
const ticketRepairWarning = document.getElementById("ticketRepairWarning");
const ticketRepairWarningClose = document.getElementById("ticketRepairWarningClose");
const ticketRepairImeiGroup = document.getElementById("ticketRepairImeiGroup");
const ticketRepairImei = document.getElementById("ticketRepairImei");

const saveTicketButton = document.getElementById("saveTicketButton");


/* ============================================================
   MODAL DETALLE
============================================================ */

const ticketDetailModal = document.getElementById("ticketDetailModal");

const closeTicketDetailModal = document.getElementById(
    "closeTicketDetailModal"
);

const closeDetailButton = document.getElementById(
    "closeDetailButton"
);

const saveTicketChangesButton = document.getElementById(
    "saveTicketChangesButton"
);

const ticketDetailTitle = document.getElementById(
    "ticketDetailTitle"
);

const ticketDetailSubtitle = document.getElementById(
    "ticketDetailSubtitle"
);

const ticketDetailMessage = document.getElementById(
    "ticketDetailMessage"
);

const detailClient = document.getElementById("detailClient");
const detailCreatedAt = document.getElementById("detailCreatedAt");
const detailCreatedBy = document.getElementById("detailCreatedBy");
const detailCategory = document.getElementById("detailCategory");

const detailCommercialResponsible = document.getElementById(
    "detailCommercialResponsible"
);

const detailResponsible = document.getElementById(
    "detailResponsible"
);

const detailPriority = document.getElementById(
    "detailPriority"
);

const detailStatus = document.getElementById(
    "detailStatus"
);

const detailTicketTitle = document.getElementById(
    "detailTicketTitle"
);

const detailDescription = document.getElementById(
    "detailDescription"
);
const ticketRepairDetailSection = document.getElementById(
    "ticketRepairDetailSection"
);
const ticketRepairDetailImei = document.getElementById(
    "ticketRepairDetailImei"
);

const supportResolutionSection = document.getElementById(
    "supportResolutionSection"
);
const supportResolutionComment = document.getElementById(
    "supportResolutionComment"
);
const supportFormLink = document.getElementById(
    "supportFormLink"
);
const supportReadonlySection = document.getElementById(
    "supportReadonlySection"
);
const supportReadonlyResponse = document.getElementById(
    "supportReadonlyResponse"
);
const supportReadonlyFormLink = document.getElementById(
    "supportReadonlyFormLink"
);
const supportReadonlyStatus = document.getElementById(
    "supportReadonlyStatus"
);
const supportReadonlyImei = document.getElementById(
    "supportReadonlyImei"
);
const returnTicketSection = document.getElementById(
    "returnTicketSection"
);
const returnTicketComment = document.getElementById(
    "returnTicketComment"
);
const returnTicketButton = document.getElementById(
    "returnTicketButton"
);
const cancelReturnButton = document.getElementById(
    "cancelReturnButton"
);
const returnTicketOpenButton = document.getElementById(
    "returnTicketOpenButton"
);

const ticketHistory = document.getElementById(
    "ticketHistory"
);


/* ============================================================
   ROLES
============================================================ */

const roleNames = {
    administrador: "Administrador",
    jefe_ventas_marketing: "Jefe de ventas y marketing",
    asesor_comercial: "Asesor comercial",
    asesor_soporte: "Asesor de soporte",
    jefe_soporte: "Jefe de soporte"
};


/* ============================================================
   ESTADOS
============================================================ */

const statusNames = {
    nuevo: "Nuevo",
    asignado: "Asignado",
    en_proceso: "En proceso",
    esperando_cliente: "Esperando cliente",
    escalado: "Escalado",
    resuelto: "Resuelto",
    cerrado: "Cerrado",
    devuelto: "Devuelto"
};


/* ============================================================
   PRIORIDADES
============================================================ */

const priorityNames = {
    baja: "Baja",
    media: "Media",
    alta: "Alta",
    urgente: "Urgente"
};


/* ============================================================
   CATEGORÍAS
============================================================ */

const categoryNames = {
    soporte: "Soporte",
    reparacion: "Reparación",
    comercial: "Comercial",
    facturacion: "Facturación",
    pedido: "Pedido",
    garantia: "Garantía",
    queja: "Queja",
    otro: "Otro"
};


/* ============================================================
   HELPERS
============================================================ */

function isAdmin() {
    return currentUserProfile?.rol === "administrador";
}


function isSalesManager() {
    return currentUserProfile?.rol === "jefe_ventas_marketing";
}


function isCommercialAdvisor() {
    return currentUserProfile?.rol === "asesor_comercial";
}


function isSupportAdvisor() {
    return currentUserProfile?.rol === "asesor_soporte";
}


function isSupportManager() {
    return currentUserProfile?.rol === "jefe_soporte";
}


function canUseSupportActions() {
    return isSupportAdvisor() || isSupportManager();
}


function hasPermission(permission) {
    return currentUserProfile?.permisos?.[permission] === true;
}


function canManageTickets() {
    return (
        isAdmin() ||
        isSalesManager() ||
        hasPermission("tickets_editar")
    );
}


function canAssignTickets() {
    return (
        isAdmin() ||
        hasPermission("tickets_asignar")
    );
}


function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function getInitials(name) {

    if (!name) {
        return "US";
    }

    const words = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }

    return (
        words[0].charAt(0) +
        words[words.length - 1].charAt(0)
    ).toUpperCase();
}


function formatRole(role) {
    return roleNames[role] || role || "Usuario";
}


function formatStatus(status) {
    return statusNames[status] || status || "Sin estado";
}


function formatPriority(priority) {
    return priorityNames[priority] || priority || "Sin prioridad";
}


function formatCategory(category) {
    return categoryNames[category] || category || "Sin categoría";
}


function formatDate(timestamp) {

    if (!timestamp) {
        return "—";
    }

    let date;

    if (timestamp?.toDate) {
        date = timestamp.toDate();
    } else if (timestamp?.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "es-CO",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    ).format(date);
}


function getTimestampValue(timestamp) {

    if (!timestamp) {
        return 0;
    }

    if (timestamp.seconds) {
        return timestamp.seconds;
    }

    if (timestamp.toDate) {
        return timestamp.toDate().getTime();
    }

    if (timestamp instanceof Date) {
        return timestamp.getTime();
    }

    return 0;
}


/* ============================================================
   MENSAJES
============================================================ */

function showPageMessage(message, type = "info") {

    if (!ticketPageMessage) {
        return;
    }

    ticketPageMessage.className =
        `page-message ${type}`;

    ticketPageMessage.textContent = message;

    window.clearTimeout(
        showPageMessage.timeout
    );

    showPageMessage.timeout = window.setTimeout(() => {

        ticketPageMessage.className =
            "page-message hidden";

        ticketPageMessage.textContent = "";

    }, 5000);
}


function showFormMessage(element, message, type = "error") {

    if (!element) {
        return;
    }

    element.className =
        `form-message ${type}`;

    element.textContent = message;
}


function clearFormMessage(element) {

    if (!element) {
        return;
    }

    element.className =
        "form-message hidden";

    element.textContent = "";
}


/* ============================================================
   USUARIO ACTUAL
============================================================ */

async function getCurrentUserProfile(uid) {

    const userRef = doc(
        db,
        "usuarios",
        uid
    );

    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        throw new Error(
            "No existe el perfil del usuario en Firestore."
        );
    }

    return {
        id: snapshot.id,
        ...snapshot.data()
    };
}


/* ============================================================
   UI USUARIO
============================================================ */

function renderCurrentUser() {

    if (!currentUserProfile) {
        return;
    }

    if (userName) {
        userName.textContent =
            currentUserProfile.nombre ||
            currentUserProfile.email ||
            "Usuario";
    }

    if (userRole) {
        userRole.textContent =
            formatRole(currentUserProfile.rol);
    }

    if (userAvatar) {
        userAvatar.textContent =
            getInitials(
                currentUserProfile.nombre ||
                currentUserProfile.email
            );
    }

    if (usersMenuItem) {

        const canSeeUsers =
            isAdmin() ||
            isSalesManager() ||
            hasPermission("usuarios_gestionar");

        usersMenuItem.style.display =
            canSeeUsers ? "" : "none";
    }

    if (newTicketButton) {
        newTicketButton.style.display =
            canUseSupportActions() ? "none" : "";
    }

    // Contadores personales: asesor comercial, soporte y jefe de soporte.
    const showPersonalTicketCounters =
        isCommercialAdvisor() ||
        canUseSupportActions();

    if (assignedClientsCard) {
        assignedClientsCard.classList.toggle(
            "hidden",
            !showPersonalTicketCounters
        );
    }

    if (returnedTicketsCard) {
        returnedTicketsCard.classList.toggle(
            "hidden",
            !showPersonalTicketCounters
        );
    }

    // Soporte / jefe de soporte: solo Dashboard, Tickets y Chat.
    if (canUseSupportActions()) {
        [
            dashboardMenuItem,
            clientsMenuItem,
            gestionesMenuItem,
            ticketsMenuItem,
            ventasMenuItem,
            seguimientosMenuItem,
            reportesMenuItem,
            usersMenuItem,
            chatMenuItem
        ].forEach(item => {
            if (item) item.style.display = "none";
        });

        if (dashboardMenuItem) dashboardMenuItem.style.display = "";
        if (ticketsMenuItem) ticketsMenuItem.style.display = "";
        if (chatMenuItem) {
            chatMenuItem.style.display = "";
            chatMenuItem.removeAttribute("data-coming-soon");
        }
    }
}


/* ============================================================
   CERRAR SESIÓN
============================================================ */

async function logout() {

    try {

        if (unsubscribeTickets) {
            unsubscribeTickets();
            unsubscribeTickets = null;
        }

        if (unsubscribeHistory) {
            unsubscribeHistory();
            unsubscribeHistory = null;
        }

        await signOut(auth);

        window.location.href =
            "./login.html";

    } catch (error) {

        console.error(
            "Error cerrando sesión:",
            error
        );

        showPageMessage(
            "No fue posible cerrar sesión.",
            "error"
        );
    }
}


/* ============================================================
   CARGAR CLIENTES
============================================================ */

async function loadClients() {

    if (!ticketClient) {
        return;
    }

    ticketClient.innerHTML = `
        <option value="">
            Cargando clientes...
        </option>
    `;

    try {

        let clientsQuery;

        /*
         * ADMIN / JEFE
         * Ven todos los clientes.
         */

        if (
            isAdmin() ||
            isSalesManager()
        ) {

            clientsQuery = query(
                collection(db, "clientes")
            );
        }

        /*
         * ASESOR COMERCIAL
         * Solo clientes asignados a él.
         */

        else if (isCommercialAdvisor()) {

            clientsQuery = query(
                collection(db, "clientes"),
                where(
                    "asesorComercialId",
                    "==",
                    currentUserProfile.id
                )
            );
        }

        /*
         * SOPORTE
         * Solo clientes asignados a él.
         */

        else if (isSupportAdvisor() || isSupportManager()) {

            clientsQuery = query(
                collection(db, "clientes"),
                where(
                    "asesorSoporteId",
                    "==",
                    currentUserProfile.id
                )
            );
        }

        else {

            clients = [];

            renderClientOptions();

            return;
        }

        const snapshot =
            await getDocs(clientsQuery);

        clients =
            snapshot.docs.map(
                documentSnapshot => ({
                    id: documentSnapshot.id,
                    ...documentSnapshot.data()
                })
            );

        clients.sort(
            (a, b) =>
                String(
                    a.nombre ||
                    a.razonSocial ||
                    ""
                ).localeCompare(
                    String(
                        b.nombre ||
                        b.razonSocial ||
                        ""
                    ),
                    "es",
                    {
                        sensitivity: "base"
                    }
                )
        );

        renderClientOptions();

    } catch (error) {

        console.error(
            "Error cargando clientes:",
            error
        );

        clients = [];

        renderClientOptions();

        showPageMessage(
            "No fue posible cargar los clientes.",
            "error"
        );
    }
}


/* ============================================================
   CLIENTES EN SELECT
============================================================ */

function renderClientOptions() {

    if (!ticketClient) {
        return;
    }

    ticketClient.innerHTML = `
        <option value="">
            Seleccionar cliente
        </option>
    `;

    clients.forEach(client => {

        const option =
            document.createElement("option");

        option.value =
            client.id;

        const clientName =
            client.nombre ||
            client.razonSocial ||
            "Cliente sin nombre";

        const company =
            client.empresa
                ? ` — ${client.empresa}`
                : "";

        option.textContent =
            `${clientName}${company}`;

        ticketClient.appendChild(
            option
        );
    });
}


/* ============================================================
   CARGAR USUARIOS
============================================================ */

async function loadUsers() {

    try {

        /*
         * ADMINISTRADOR / JEFE
         * Cargan todos los usuarios activos.
         */

        if (
            isAdmin() ||
            isSalesManager()
        ) {

            const usersQuery =
                query(
                    collection(db, "usuarios")
                );

            const snapshot =
                await getDocs(usersQuery);

            users =
                snapshot.docs
                    .map(
                        documentSnapshot => ({
                            id: documentSnapshot.id,
                            ...documentSnapshot.data()
                        })
                    )
                    .filter(
                        user =>
                            user.estado !== "inactivo"
                    );
        }

        /*
         * ASESORES
         * Solo necesitan su propio perfil
         * para la creación del ticket.
         */

        else {

            users = [
                currentUserProfile
            ];
        }

        renderCommercialResponsibleOptions();
        renderSupportOptions();

    } catch (error) {

        console.error(
            "Error cargando usuarios:",
            error
        );

        users = [
            currentUserProfile
        ];

        renderCommercialResponsibleOptions();
        renderSupportOptions();

        showPageMessage(
            "No fue posible cargar la lista de usuarios.",
            "error"
        );
    }
}


/* ============================================================
   USUARIOS COMERCIALES
============================================================ */

function getCommercialUsers() {

    return users.filter(
        user =>
            user.estado !== "inactivo" &&
            (
                user.rol === "asesor_comercial" ||
                user.rol === "jefe_ventas_marketing" ||
                user.rol === "administrador"
            )
    );
}


/* ============================================================
   USUARIOS SOPORTE
============================================================ */

function getSupportUsers() {

    return users.filter(
        user =>
            user.estado !== "inactivo" &&
            user.rol === "asesor_soporte"
    );
}


/* ============================================================
   SELECT RESPONSABLE COMERCIAL
============================================================ */

function renderCommercialResponsibleOptions() {

    if (!ticketCommercialResponsible) {
        return;
    }

    ticketCommercialResponsible.innerHTML = "";

    let commercialUsers =
        getCommercialUsers();

    /*
     * Siempre garantizamos que el creador
     * aparezca como opción.
     */

    if (
        currentUserProfile &&
        !commercialUsers.some(
            user =>
                user.id === currentUserProfile.id
        )
    ) {

        commercialUsers = [
            currentUserProfile,
            ...commercialUsers
        ];
    }

    commercialUsers.forEach(user => {

        const option =
            document.createElement("option");

        option.value =
            user.id;

        option.textContent =
            `${user.nombre || "Usuario"} — ${
                formatRole(user.rol)
            }`;

        ticketCommercialResponsible.appendChild(
            option
        );
    });

    /*
     * El responsable inicial siempre
     * es quien crea el ticket.
     */

    if (currentUserProfile) {

        ticketCommercialResponsible.value =
            currentUserProfile.id;
    }

    ticketCommercialResponsible.disabled =
        true;
}


/* ============================================================
   SELECT SOPORTE
============================================================ */

function renderSupportOptions() {

    if (!ticketResponsible) {
        return;
    }

    ticketResponsible.innerHTML = `
        <option value="">
            Asignación automática
        </option>
    `;

    const supportUsers =
        getSupportUsers();

    supportUsers.forEach(user => {

        const option =
            document.createElement("option");

        option.value =
            user.id;

        const availability =
            user.recibeTickets !== false
                ? "Disponible"
                : "No disponible";

        option.textContent =
            `${user.nombre || "Soporte"} — ${availability}`;

        ticketResponsible.appendChild(
            option
        );
    });

    /*
     * Solo el administrador puede
     * escoger manualmente el soporte.
     */

    if (isAdmin()) {

        ticketResponsible.disabled =
            false;

    } else {

        ticketResponsible.disabled =
            true;

    }
}


/* ============================================================
   SELECT COMERCIAL DEL DETALLE
============================================================ */

function renderDetailCommercialResponsibleOptions() {

    if (!detailCommercialResponsible) {
        return;
    }

    detailCommercialResponsible.innerHTML = "";

    let commercialUsers =
        getCommercialUsers();

    /*
     * Para soporte, el usuario actual no necesariamente
     * tiene cargada la lista completa de comerciales.
     * Agregamos el responsable comercial real del ticket
     * como opción para conservar su valor y evitar que se
     * interprete como un cambio.
     */

    const currentCommercialId =
        selectedTicket?.responsableComercialId ||
        selectedTicket?.creadoPorId ||
        "";

    if (
        currentCommercialId &&
        !commercialUsers.some(
            user =>
                user.id === currentCommercialId
        )
    ) {

        commercialUsers = [
            {
                id:
                    currentCommercialId,

                nombre:
                    selectedTicket?.responsableComercialNombre ||
                    selectedTicket?.creadoPorNombre ||
                    "Responsable comercial",

                rol:
                    "asesor_comercial"
            },
            ...commercialUsers
        ];
    }

    commercialUsers.forEach(user => {

        const option =
            document.createElement("option");

        option.value =
            user.id;

        option.textContent =
            `${user.nombre || "Usuario"} — ${
                formatRole(user.rol)
            }`;

        detailCommercialResponsible.appendChild(
            option
        );
    });
}


/* ============================================================
   SELECT SOPORTE DEL DETALLE
============================================================ */

function renderDetailSupportOptions() {

    if (!detailResponsible) {
        return;
    }

    detailResponsible.innerHTML = "";

    const pendingOption =
        document.createElement("option");

    pendingOption.value = "";

    pendingOption.textContent =
        "Pendiente de asignación";

    detailResponsible.appendChild(
        pendingOption
    );

    const supportUsers =
        getSupportUsers();

    supportUsers.forEach(user => {

        const option =
            document.createElement("option");

        option.value =
            user.id;

        const availability =
            user.recibeTickets !== false
                ? "Disponible"
                : "No disponible";

        option.textContent =
            `${user.nombre || "Soporte"} — ${availability}`;

        detailResponsible.appendChild(
            option
        );
    });
}


/* ============================================================
   PREPARAR FORMULARIO
============================================================ */

function prepareCreationForm() {

    if (!currentUserProfile) {
        return;
    }

    ticketForm.reset();

    clearFormMessage(
        ticketFormMessage
    );

    renderCommercialResponsibleOptions();
    renderSupportOptions();

    /*
     * Responsable comercial inicial:
     * SIEMPRE el creador.
     */

    if (ticketCommercialResponsible) {

        ticketCommercialResponsible.value =
            currentUserProfile.id;

        ticketCommercialResponsible.disabled =
            true;
    }

    /*
     * Soporte:
     *
     * Admin puede elegir manualmente.
     * Los demás usan asignación automática.
     */

    if (ticketResponsible) {

        ticketResponsible.value = "";

        ticketResponsible.disabled =
            !isAdmin();
    }

    if (ticketPriority) {
        ticketPriority.value = "media";
    }

    if (ticketCategory) {
        ticketCategory.value = "";
    }

    if (ticketRepairImei) {
        ticketRepairImei.value = "";
    }

    hideRepairNotice();

    ticketModalTitle.textContent =
        "Nuevo ticket";

    saveTicketButton.disabled =
        false;

    saveTicketButton.textContent =
        "Crear ticket";
}


/* ============================================================
   ABRIR MODAL CREAR
============================================================ */

function openTicketModal() {

    prepareCreationForm();

    ticketModal.classList.remove(
        "hidden"
    );

    window.setTimeout(() => {

        ticketClient?.focus();

    }, 50);
}


/* ============================================================
   CERRAR MODAL CREAR
============================================================ */

function closeCreateTicketModal() {

    ticketModal.classList.add(
        "hidden"
    );

    ticketForm.reset();

    clearFormMessage(
        ticketFormMessage
    );

    hideRepairNotice();
}


/* ============================================================
   GENERAR NÚMERO DE TICKET
============================================================ */

async function generateTicketNumber() {

    const counterRef =
        doc(
            db,
            "configuracion",
            "tickets"
        );

    const ticketNumber =
        await runTransaction(
            db,
            async transaction => {

                const counterSnapshot =
                    await transaction.get(
                        counterRef
                    );

                let nextNumber = 1;

                if (
                    counterSnapshot.exists()
                ) {

                    const currentNumber =
                        Number(
                            counterSnapshot.data()
                                .ultimoNumero || 0
                        );

                    nextNumber =
                        currentNumber + 1;
                }

                transaction.set(
                    counterRef,
                    {
                        ultimoNumero:
                            nextNumber,

                        updatedAt:
                            serverTimestamp()
                    },
                    {
                        merge: true
                    }
                );

                return nextNumber;
            }
        );

    return (
        "TKT-" +
        String(ticketNumber)
            .padStart(6, "0")
    );
}


/* ============================================================
   BUSCAR SOPORTE AUTOMÁTICO
============================================================ */

async function assignSupportAutomatically() {

    /*
     * La lista privada configuracion/soporte es la fuente de verdad
     * de los asesores habilitados para recibir tickets.
     *
     * No modificamos la cola ni escribimos en usuarios.
     * Cada ticket selecciona aleatoriamente uno de los soportes
     * activos/habilitados que el administrador dejó en la cola.
     */

    const supportQueueRef =
        doc(
            db,
            "configuracion",
            "soporte"
        );

    try {

        const snapshot =
            await getDoc(
                supportQueueRef
            );

        if (!snapshot.exists()) {

            showFormMessage(
                ticketFormMessage,
                "No existe la configuración de la cola de soporte. Entra como administrador al módulo Usuarios para sincronizarla.",
                "error"
            );

            return null;
        }

        const data =
            snapshot.data() || {};

        const queue =
            Array.isArray(data.soportes)
                ? data.soportes.filter(
                    support =>
                        support &&
                        typeof support.id === "string" &&
                        support.id.trim() !== ""
                )
                : [];

        if (!queue.length) {

            showFormMessage(
                ticketFormMessage,
                "No hay asesores de soporte habilitados para recibir tickets.",
                "error"
            );

            return null;
        }

        const randomIndex =
            Math.floor(
                Math.random() * queue.length
            );

        const selectedSupport =
            queue[randomIndex];

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
            "Error en la selección aleatoria de soporte:",
            error
        );

        showFormMessage(
            ticketFormMessage,
            "No fue posible consultar la cola de soporte. Verifica que esté sincronizada.",
            "error"
        );

        return null;
    }
}


/* ============================================================
   OBTENER RESPONSABLE COMERCIAL INICIAL
============================================================ */

function getInitialCommercialResponsible() {

    if (!currentUserProfile) {
        return null;
    }

    return currentUserProfile;
}


/* ============================================================
   REPARACIÓN — AVISO + IMEI
============================================================ */

function isRepairCategory(category) {
    return String(category || "").trim().toLowerCase() === "reparacion";
}


function hideRepairNotice() {

    if (ticketRepairWarning) {
        ticketRepairWarning.classList.add("hidden");
    }

    if (ticketRepairImeiGroup) {
        ticketRepairImeiGroup.classList.add("hidden");
    }

    if (ticketRepairImei) {
        ticketRepairImei.required = false;
    }
}


function showRepairNotice() {

    if (ticketRepairWarning) {
        ticketRepairWarning.classList.remove("hidden");
    }

    if (ticketRepairImeiGroup) {
        ticketRepairImeiGroup.classList.remove("hidden");
    }

    if (ticketRepairImei) {
        ticketRepairImei.required = true;
    }
}


function updateRepairFields() {

    if (isRepairCategory(ticketCategory?.value)) {
        showRepairNotice();
    } else {
        hideRepairNotice();
    }
}


/* ============================================================
   CREAR TICKET
============================================================ */

async function createTicket() {

    if (isSavingTicket) {
        return;
    }

    clearFormMessage(
        ticketFormMessage
    );

    /*
     * Validación de permisos.
     */

    if (
        !hasPermission("tickets_crear")
    ) {

        showFormMessage(
            ticketFormMessage,
            "No tienes permisos para crear tickets.",
            "error"
        );

        return;
    }

    /*
     * Campos.
     */

    const clientId =
        ticketClient.value.trim();

    const category =
        ticketCategory.value.trim();

    const imei =
        ticketRepairImei?.value?.trim() || "";

    const priority =
        ticketPriority.value.trim();

    const title =
        ticketTitle.value.trim();

    const description =
        ticketDescription.value.trim();

    /*
     * Validación.
     */

    if (!clientId) {

        showFormMessage(
            ticketFormMessage,
            "Selecciona un cliente.",
            "error"
        );

        ticketClient.focus();

        return;
    }

    if (!category) {

        showFormMessage(
            ticketFormMessage,
            "Selecciona una categoría.",
            "error"
        );

        ticketCategory.focus();

        return;
    }

    if (!priority) {

        showFormMessage(
            ticketFormMessage,
            "Selecciona una prioridad.",
            "error"
        );

        ticketPriority.focus();

        return;
    }

    if (title.length < 3) {

        showFormMessage(
            ticketFormMessage,
            "El título debe tener al menos 3 caracteres.",
            "error"
        );

        ticketTitle.focus();

        return;
    }

    if (description.length < 5) {

        showFormMessage(
            ticketFormMessage,
            "La descripción debe tener al menos 5 caracteres.",
            "error"
        );

        ticketDescription.focus();

        return;
    }


    const client =
        clients.find(
            item =>
                item.id === clientId
        );

    if (!client) {

        showFormMessage(
            ticketFormMessage,
            "El cliente seleccionado no está disponible.",
            "error"
        );

        return;
    }


    const commercialResponsible =
        getInitialCommercialResponsible();

    if (!commercialResponsible) {

        showFormMessage(
            ticketFormMessage,
            "No fue posible determinar el usuario creador.",
            "error"
        );

        return;
    }


    isSavingTicket = true;

    saveTicketButton.disabled =
        true;

    saveTicketButton.textContent =
        "Creando ticket...";


    try {

        /*
         * =====================================================
         * SOPORTE
         * =====================================================
         */

        let supportResponsible = null;

        /*
         * Admin puede seleccionar manualmente.
         */

        if (
            isAdmin() &&
            ticketResponsible.value
        ) {

            supportResponsible =
                users.find(
                    user =>
                        user.id ===
                        ticketResponsible.value
                ) || null;

        }

        /*
         * Para todos los demás:
         * asignación automática.
         */

        else {

            supportResponsible =
                await assignSupportAutomatically();
        }


        /*
         * =====================================================
         * NÚMERO
         * =====================================================
         */

        const ticketNumber =
            await generateTicketNumber();


        /*
         * =====================================================
         * ESTADO
         * =====================================================
         */

        const initialStatus =
            supportResponsible
                ? "asignado"
                : "nuevo";


        /*
         * =====================================================
         * DATOS
         * =====================================================
         */

        const ticketData = {

            numero:
                ticketNumber,

            clienteId:
                client.id,

            clienteNombre:
                client.nombre ||
                client.razonSocial ||
                "Cliente",

            clienteEmpresa:
                client.empresa ||
                "",

            creadoPorId:
                auth.currentUser.uid,

            creadoPorNombre:
                currentUserProfile.nombre ||
                currentUserProfile.email ||
                "Usuario",

            responsableComercialId:
                commercialResponsible.id,

            responsableComercialNombre:
                commercialResponsible.nombre ||
                commercialResponsible.email ||
                "Usuario",

            responsableSoporteId:
                supportResponsible
                    ? supportResponsible.id
                    : null,

            responsableSoporteNombre:
                supportResponsible
                    ? (
                        supportResponsible.nombre ||
                        supportResponsible.email ||
                        "Soporte"
                    )
                    : "",

            categoria:
                category,

            imei:
                isRepairCategory(category)
                    ? imei
                    : "",

            prioridad:
                priority,

            titulo:
                title,

            descripcion:
                description,

            estado:
                initialStatus,

            ultimaGestion:
                "",

            ultimaGestionEn:
                null,

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()
        };


        /*
         * =====================================================
         * CREAR DOCUMENTO
         * =====================================================
         */

        const ticketRef =
            await addDoc(
                collection(
                    db,
                    "tickets"
                ),
                ticketData
            );


        /*
         * =====================================================
         * HISTORIAL INICIAL
         * =====================================================
         */

        const historyText =
            supportResponsible
                ? "Ticket creado y asignado automáticamente a soporte."
                : "Ticket creado. Pendiente de asignación de soporte.";


        await addDoc(
            collection(
                db,
                "tickets",
                ticketRef.id,
                "historial"
            ),
            {

                tipo:
                    "creacion",

                comentario:
                    historyText,

                estadoNuevo:
                    initialStatus,

                responsableComercialNuevo:
                    commercialResponsible.id,

                responsableComercialNombreNuevo:
                    commercialResponsible.nombre ||
                    commercialResponsible.email ||
                    "Usuario",

                responsableSoporteNuevo:
                    supportResponsible
                        ? supportResponsible.id
                        : null,

                responsableSoporteNombreNuevo:
                    supportResponsible
                        ? (
                            supportResponsible.nombre ||
                            supportResponsible.email ||
                            "Soporte"
                        )
                        : "",

                usuarioId:
                    auth.currentUser.uid,

                usuarioNombre:
                    currentUserProfile.nombre ||
                    currentUserProfile.email ||
                    "Usuario",

                createdAt:
                    serverTimestamp()
            }
        );


        /*
         * =====================================================
         * NOTIFICACIÓN
         * =====================================================
         */

        if (supportResponsible) {

            await addDoc(
                collection(
                    db,
                    "notificaciones"
                ),
                {

                    tipo:
                        "ticket_asignado",

                    titulo:
                        `Nuevo ticket ${ticketNumber}`,

                    mensaje:
                        `Se te asignó el ticket ${ticketNumber}.`,

                    ticketId:
                        ticketRef.id,

                    ticketNumero:
                        ticketNumber,

                    usuarioDestinoId:
                        supportResponsible.id,

                    leida:
                        false,

                    createdAt:
                        serverTimestamp()
                }
            );
        }


        /*
         * =====================================================
         * ÉXITO
         * =====================================================
         */

        closeCreateTicketModal();

        showPageMessage(
            supportResponsible
                ? `Ticket ${ticketNumber} creado y asignado correctamente.`
                : `Ticket ${ticketNumber} creado. Quedó pendiente de asignación de soporte.`,
            "success"
        );

    } catch (error) {

        console.error(
            "ERROR COMPLETO CREANDO TICKET:",
            error
        );

        let message =
            "No fue posible crear el ticket.";

        if (
            error?.code ===
            "permission-denied"
        ) {

            message =
                "Firebase rechazó la operación por permisos. Revisa las reglas de Firestore y los permisos del usuario.";
        }

        else if (
            error?.code ===
            "failed-precondition"
        ) {

            message =
                "Firestore requiere una configuración adicional para completar esta operación.";
        }

        else if (
            error?.message
        ) {

            message =
                error.message;
        }

        showFormMessage(
            ticketFormMessage,
            message,
            "error"
        );

    } finally {

        isSavingTicket = false;

        saveTicketButton.disabled =
            false;

        saveTicketButton.textContent =
            "Crear ticket";
    }
}


/* ============================================================
   ESCUCHAR TICKETS
============================================================ */

function listenTickets() {

    if (
        unsubscribeTickets
    ) {

        unsubscribeTickets();

        unsubscribeTickets =
            null;
    }


    try {

        let ticketsQuery;


        /*
         * ADMIN / JEFE
         *
         * No usamos orderBy().
         *
         * Esto evita el índice compuesto
         * que estaba causando el error.
         */

        if (
            isAdmin() ||
            isSalesManager()
        ) {

            ticketsQuery =
                query(
                    collection(
                        db,
                        "tickets"
                    )
                );
        }


        /*
         * COMERCIAL
         */

        else if (
            isCommercialAdvisor()
        ) {

            /*
             * PRIVACIDAD:
             * El asesor comercial solo puede consultar tickets
             * creados por él mismo.
             */
            ticketsQuery =
                query(
                    collection(
                        db,
                        "tickets"
                    ),
                    where(
                        "creadoPorId",
                        "==",
                        currentUserProfile.id
                    )
                );
        }


        /*
         * SOPORTE / JEFE DE SOPORTE
         */

        else if (
            isSupportAdvisor() ||
            isSupportManager()
        ) {

            ticketsQuery =
                query(
                    collection(
                        db,
                        "tickets"
                    ),
                    where(
                        "responsableSoporteId",
                        "==",
                        currentUserProfile.id
                    )
                );
        }


        else {

            tickets = [];

            renderTickets();

            return;
        }


        unsubscribeTickets =
            onSnapshot(
                ticketsQuery,

                snapshot => {

                    tickets =
                        snapshot.docs.map(
                            documentSnapshot => ({
                                id:
                                    documentSnapshot.id,

                                ...documentSnapshot.data()
                            })
                        );

                    /*
                     * Ordenamos en JavaScript.
                     *
                     * No usamos orderBy de Firestore.
                     */

                    tickets.sort(
                        (a, b) =>
                            getTimestampValue(
                                b.createdAt
                            ) -
                            getTimestampValue(
                                a.createdAt
                            )
                    );

                    renderTickets();
                },

                error => {

                    console.error(
                        "Error escuchando tickets:",
                        error
                    );

                    tickets = [];

                    renderTickets();

                    if (
                        error?.code ===
                        "permission-denied"
                    ) {

                        showPageMessage(
                            "No tienes permisos para consultar estos tickets.",
                            "error"
                        );

                    } else {

                        showPageMessage(
                            "No fue posible cargar los tickets.",
                            "error"
                        );
                    }
                }
            );

    } catch (error) {

        console.error(
            "Error preparando consulta de tickets:",
            error
        );

        showPageMessage(
            "No fue posible iniciar la consulta de tickets.",
            "error"
        );
    }
}


/* ============================================================
   FILTRAR TICKETS
============================================================ */

function getFilteredTickets() {

    const search =
        ticketSearch.value
            .trim()
            .toLowerCase();

    const status =
        ticketStatusFilter.value;

    const priority =
        ticketPriorityFilter.value;


    return tickets.filter(ticket => {

        if (ticket.eliminado === true) {
            return false;
        }

        if (
            status &&
            ticket.estado !== status
        ) {
            return false;
        }

        if (
            priority &&
            ticket.prioridad !== priority
        ) {
            return false;
        }


        if (!search) {
            return true;
        }


        const searchableText = [

            ticket.numero,

            ticket.clienteNombre,

            ticket.clienteEmpresa,

            ticket.titulo,

            ticket.descripcion,

            ticket.responsableComercialNombre,

            ticket.responsableSoporteNombre

        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


        return searchableText.includes(
            search
        );
    });
}


/* ============================================================
   RENDER TICKETS
============================================================ */

function renderTickets() {

    const filteredTickets =
        getFilteredTickets();


    /*
     * RESUMEN
     */

    const activeTickets =
        tickets.filter(ticket => ticket.eliminado !== true);

    if (totalTickets) {

        totalTickets.textContent =
            activeTickets.length;
    }

    if (newTickets) {

        newTickets.textContent =
            activeTickets.filter(
                ticket =>
                    ticket.estado === "nuevo"
            ).length;
    }

    if (inProgressTickets) {

        inProgressTickets.textContent =
            activeTickets.filter(
                ticket =>
                    ticket.estado === "en_proceso" ||
                    ticket.estado === "asignado"
            ).length;
    }

    if (resolvedTickets) {

        resolvedTickets.textContent =
            activeTickets.filter(
                ticket =>
                    ticket.estado === "resuelto" ||
                    ticket.estado === "cerrado"
            ).length;
    }

    /*
     * CONTADORES PERSONALES
     *
     * El contador "Clientes asignados" representa los tickets
     * que siguen pendientes de resolver para el usuario actual.
     * Los tickets devueltos tienen su propio contador y no se
     * mezclan con los pendientes activos.
     */
    if (isCommercialAdvisor() || isSupportAdvisor()) {

        const assignedPendingCount =
            activeTickets.filter(ticket =>
                ticket.estado !== "resuelto" &&
                ticket.estado !== "cerrado" &&
                ticket.estado !== "devuelto"
            ).length;

        const returnedCount =
            activeTickets.filter(
                ticket => ticket.estado === "devuelto"
            ).length;

        if (assignedClientsCount) {
            assignedClientsCount.textContent =
                assignedPendingCount;
        }

        if (returnedTicketsCount) {
            returnedTicketsCount.textContent =
                returnedCount;
        }
    } else {

        if (assignedClientsCount) {
            assignedClientsCount.textContent = "0";
        }

        if (returnedTicketsCount) {
            returnedTicketsCount.textContent = "0";
        }
    }


    /*
     * CONTADOR
     */

    if (ticketsCountLabel) {

        ticketsCountLabel.textContent =
            `${filteredTickets.length} ticket${
                filteredTickets.length === 1
                    ? ""
                    : "s"
            }`;
    }


    /*
     * TABLA VACÍA
     */

    if (
        filteredTickets.length === 0
    ) {

        ticketsTableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="table-empty"
                >
                    No hay tickets que coincidan con los filtros.
                </td>
            </tr>
        `;

        return;
    }


    /*
     * TABLA
     */

    ticketsTableBody.innerHTML =
        filteredTickets
            .map(ticket => {

                const statusClass =
                    getStatusClass(
                        ticket.estado
                    );

                const priorityClass =
                    getPriorityClass(
                        ticket.prioridad
                    );

                const supportName =
                    ticket.responsableSoporteNombre ||
                    "Pendiente de asignación";

                return `
                    <tr>

                        <td>
                            <button
                                type="button"
                                class="ticket-number-link"
                                data-ticket-id="${escapeHtml(ticket.id)}"
                            >
                                ${escapeHtml(ticket.numero || "—")}
                            </button>
                        </td>

                        <td>

                            <div class="table-primary">
                                ${escapeHtml(ticket.clienteNombre || "—")}
                            </div>

                            ${
                                ticket.clienteEmpresa
                                    ? `
                                        <div class="table-secondary">
                                            ${escapeHtml(ticket.clienteEmpresa)}
                                        </div>
                                    `
                                    : ""
                            }

                        </td>

                        <td>

                            <div class="table-primary">
                                ${escapeHtml(ticket.titulo || "—")}
                            </div>

                            <div class="table-secondary">
                                ${escapeHtml(formatCategory(ticket.categoria))}
                            </div>

                        </td>

                        <td>

                            <span
                                class="status-badge priority-${priorityClass}"
                            >
                                ${escapeHtml(formatPriority(ticket.prioridad))}
                            </span>

                        </td>

                        <td>

                            <span
                                class="status-badge status-${statusClass}"
                            >
                                ${escapeHtml(formatStatus(ticket.estado))}
                            </span>

                        </td>

                        <td>

                            <span class="person-cell">
                                ${escapeHtml(
                                    ticket.responsableComercialNombre ||
                                    ticket.creadoPorNombre ||
                                    "—"
                                )}
                            </span>

                        </td>

                        <td>

                            <span
                                class="${
                                    ticket.responsableSoporteId
                                        ? "person-cell"
                                        : "pending-support"
                                }"
                            >
                                ${escapeHtml(supportName)}
                            </span>

                        </td>

                        <td>
                            ${escapeHtml(formatDate(ticket.createdAt))}
                        </td>

                        <td>

                            <div class="ticket-actions-cell">

                                <button
                                    type="button"
                                    class="table-action-button"
                                    data-ticket-id="${escapeHtml(ticket.id)}"
                                    data-ticket-action="view"
                                >
                                    Ver
                                </button>

                                ${
                                    isAdmin()
                                        ? `
                                            <button
                                                type="button"
                                                class="table-action-button ticket-delete-button"
                                                data-ticket-id="${escapeHtml(ticket.id)}"
                                                data-ticket-action="delete"
                                                title="Eliminar ticket"
                                            >
                                                Eliminar
                                            </button>
                                        `
                                        : ""
                                }

                            </div>

                        </td>

                    </tr>
                `;
            })
            .join("");


    /*
     * EVENTOS
     */

    document
        .querySelectorAll(
            "[data-ticket-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    const ticketId =
                        button.dataset.ticketId;

                    if (
                        button.dataset.ticketAction ===
                        "delete"
                    ) {
                        deleteTicket(ticketId);
                        return;
                    }

                    openTicketDetail(
                        ticketId
                    );
                }
            );
        });
}


/* ============================================================
   ELIMINACIÓN ADMINISTRATIVA — ELIMINACIÓN LÓGICA
============================================================ */

async function deleteTicket(ticketId) {

    if (!isAdmin()) {
        showPageMessage(
            "Solo el administrador puede eliminar tickets.",
            "error"
        );
        return;
    }

    const ticket = tickets.find(item => item.id === ticketId);

    if (!ticket) {
        return;
    }

    const confirmed = window.confirm(
        `¿Eliminar el ticket ${ticket.numero}?\n\nEl ticket desaparecerá de la operación normal, pero su historial se conservará para auditoría.`
    );

    if (!confirmed) {
        return;
    }

    try {
        const ticketRef = doc(db, "tickets", ticketId);
        const historyRef = doc(
            collection(db, "tickets", ticketId, "historial")
        );
        const batch = writeBatch(db);

        batch.update(ticketRef, {
            eliminado: true,
            eliminadoEn: serverTimestamp(),
            eliminadoPorId: auth.currentUser.uid,
            eliminadoPorNombre:
                currentUserProfile.nombre ||
                currentUserProfile.email ||
                "Administrador",
            updatedAt: serverTimestamp()
        });

        batch.set(historyRef, {
            tipo: "eliminacion",
            accion: "eliminar",
            comentario:
                `Ticket ${ticket.numero} eliminado de la operación por el administrador.`,
            ticketNumero: ticket.numero,
            usuarioId: auth.currentUser.uid,
            usuarioNombre:
                currentUserProfile.nombre ||
                currentUserProfile.email ||
                "Administrador",
            usuarioRol: currentUserProfile.rol || "administrador",
            createdAt: serverTimestamp()
        });

        await batch.commit();

        if (selectedTicket?.id === ticketId) {
            closeTicketDetail();
        }

        showPageMessage(
            `El ticket ${ticket.numero} fue eliminado correctamente.`,
            "success"
        );
    } catch (error) {
        console.error("Error eliminando ticket:", error);
        showPageMessage(
            error?.code === "permission-denied"
                ? "Firebase rechazó la eliminación por permisos. Revisa las reglas de Firestore."
                : "No fue posible eliminar el ticket.",
            "error"
        );
    }
}


/* ============================================================
   CLASE ESTADO
============================================================ */

function getStatusClass(status) {

    switch (status) {

        case "nuevo":
            return "new";

        case "asignado":
            return "assigned";

        case "en_proceso":
            return "progress";

        case "esperando_cliente":
            return "waiting";

        case "escalado":
            return "escalated";

        case "resuelto":
            return "resolved";

        case "cerrado":
            return "closed";

        case "devuelto":
            return "returned";

        default:
            return "default";
    }
}


/* ============================================================
   CLASE PRIORIDAD
============================================================ */

function getPriorityClass(priority) {

    switch (priority) {

        case "baja":
            return "low";

        case "media":
            return "medium";

        case "alta":
            return "high";

        case "urgente":
            return "urgent";

        default:
            return "default";
    }
}


/* ============================================================
   SOPORTE — INFORMACIÓN VISIBLE PARA EL ASESOR
============================================================ */

function buildSafeHttpLink(value) {

    const raw = String(value || "").trim();

    if (!raw) {
        return "";
    }

    try {
        const url = new URL(raw);

        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return "";
        }

        return url.toString();
    } catch {
        return "";
    }
}


function renderSupportReadonlyInfo(ticket) {

    if (!supportReadonlySection) {
        return;
    }

    const shouldShow =
        !canUseSupportActions();

    supportReadonlySection.classList.toggle(
        "hidden",
        !shouldShow
    );

    if (!shouldShow) {
        return;
    }

    if (supportReadonlyResponse) {
        supportReadonlyResponse.textContent =
            String(ticket?.respuestaSoporte || "").trim()
                ? ticket.respuestaSoporte
                : "Soporte aún no ha registrado una respuesta.";
    }

    if (supportReadonlyStatus) {
        supportReadonlyStatus.textContent =
            formatStatus(ticket?.estado);
    }

    if (supportReadonlyImei) {
        supportReadonlyImei.textContent =
            String(ticket?.imei || "").trim()
                ? ticket.imei
                : "No aplica / no registrado";
    }

    if (supportReadonlyFormLink) {
        const safeLink =
            buildSafeHttpLink(
                ticket?.linkFormularioSoporte
            );

        if (safeLink) {
            supportReadonlyFormLink.innerHTML = `
                <a
                    href="${escapeHtml(safeLink)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="support-form-link"
                >
                    Abrir formulario
                </a>
            `;
        } else {
            supportReadonlyFormLink.textContent =
                "Soporte no ha agregado un formulario.";
        }
    }
}


function renderRepairDetail(ticket) {

    if (!ticketRepairDetailSection) {
        return;
    }

    const isRepair =
        isRepairCategory(ticket?.categoria);

    ticketRepairDetailSection.classList.toggle(
        "hidden",
        !isRepair
    );

    if (!isRepair) {
        return;
    }

    if (ticketRepairDetailImei) {
        ticketRepairDetailImei.textContent =
            String(ticket?.imei || "").trim()
                ? ticket.imei
                : "No registrado";
    }
}


/* ============================================================
   ABRIR DETALLE
============================================================ */

async function openTicketDetail(
    ticketId
) {

    selectedTicket =
        tickets.find(
            ticket =>
                ticket.id === ticketId
        );


    if (!selectedTicket) {

        showPageMessage(
            "No fue posible encontrar el ticket.",
            "error"
        );

        return;
    }


    clearFormMessage(
        ticketDetailMessage
    );


    /*
     * Información
     */

    ticketDetailTitle.textContent =
        selectedTicket.numero ||
        "Ticket";

    ticketDetailSubtitle.textContent =
        selectedTicket.titulo ||
        "Detalle del ticket";

    detailClient.textContent =
        selectedTicket.clienteNombre ||
        "—";

    detailCreatedAt.textContent =
        formatDate(
            selectedTicket.createdAt
        );

    detailCreatedBy.textContent =
        selectedTicket.creadoPorNombre ||
        "—";

    detailCategory.textContent =
        formatCategory(
            selectedTicket.categoria
        );

    detailTicketTitle.textContent =
        selectedTicket.titulo ||
        "—";

    detailDescription.textContent =
        selectedTicket.descripcion ||
        "—";


    /*
     * Selects
     */

    renderDetailCommercialResponsibleOptions();
    renderDetailSupportOptions();


    detailCommercialResponsible.value =
        selectedTicket.responsableComercialId ||
        selectedTicket.creadoPorId ||
        "";


    detailResponsible.value =
        selectedTicket.responsableSoporteId ||
        "";


    detailPriority.value =
        selectedTicket.prioridad ||
        "media";


    detailStatus.value =
        selectedTicket.estado ||
        "nuevo";

    if (supportResolutionSection) {
        supportResolutionSection.classList.toggle(
            "hidden",
            !canUseSupportActions()
        );
    }

    if (supportResolutionComment) {
        supportResolutionComment.value =
            selectedTicket.respuestaSoporte || "";
    }

    if (supportFormLink) {
        supportFormLink.value =
            selectedTicket.linkFormularioSoporte || "";
    }

    renderSupportReadonlyInfo(selectedTicket);
    renderRepairDetail(selectedTicket);

    if (returnTicketSection) {
        returnTicketSection.classList.add("hidden");
    }

    if (returnTicketComment) {
        returnTicketComment.value = "";
    }

    if (returnTicketOpenButton) {
        returnTicketOpenButton.style.display =
            canUseSupportActions() ? "inline-flex" : "none";
        returnTicketOpenButton.disabled =
            selectedTicket.estado === "devuelto";
    }

    if (returnTicketButton) {
        returnTicketButton.disabled =
            !canUseSupportActions();
    }


    /*
     * PERMISOS
     */

    const canEdit =
        canManageTickets();


    const canAssign =
        canAssignTickets();


    /*
     * Responsable comercial:
     *
     * Solo admin puede modificarlo.
     */

    detailCommercialResponsible.disabled =
        !isAdmin();


    /*
     * Soporte:
     *
     * Admin puede modificar.
     */

    detailResponsible.disabled =
        !canAssign;


    detailPriority.disabled =
        !canEdit;


    detailStatus.disabled =
        !canEdit;


    saveTicketChangesButton.disabled =
        !canEdit;


    /*
     * Historial
     */

    ticketHistory.innerHTML = `
        <div class="history-loading">
            Cargando historial...
        </div>
    `;


    ticketDetailModal.classList.remove(
        "hidden"
    );


    await loadTicketHistory(
        selectedTicket.id
    );
}


/* ============================================================
   CERRAR DETALLE
============================================================ */

function closeTicketDetail() {

    ticketDetailModal.classList.add(
        "hidden"
    );

    selectedTicket =
        null;

    if (unsubscribeHistory) {

        unsubscribeHistory();

        unsubscribeHistory =
            null;
    }

    ticketHistory.innerHTML = "";
}


/* ============================================================
   HISTORIAL
============================================================ */

async function loadTicketHistory(
    ticketId
) {

    if (unsubscribeHistory) {

        unsubscribeHistory();

        unsubscribeHistory =
            null;
    }


    try {

        const historyRef =
            collection(
                db,
                "tickets",
                ticketId,
                "historial"
            );


        /*
         * No usamos orderBy().
         *
         * Ordenamos en JS para evitar
         * índices adicionales.
         */

        unsubscribeHistory =
            onSnapshot(
                historyRef,

                snapshot => {

                    const history =
                        snapshot.docs
                            .map(
                                documentSnapshot => ({
                                    id:
                                        documentSnapshot.id,

                                    ...documentSnapshot.data()
                                })
                            )
                            .sort(
                                (a, b) =>
                                    getTimestampValue(
                                        b.createdAt
                                    ) -
                                    getTimestampValue(
                                        a.createdAt
                                    )
                            );


                    renderHistory(
                        history
                    );
                },

                error => {

                    console.error(
                        "Error cargando historial:",
                        error
                    );

                    ticketHistory.innerHTML = `
                        <div class="history-empty">
                            No fue posible cargar el historial.
                        </div>
                    `;
                }
            );

    } catch (error) {

        console.error(
            "Error preparando historial:",
            error
        );

        ticketHistory.innerHTML = `
            <div class="history-empty">
                No fue posible cargar el historial.
            </div>
        `;
    }
}


/* ============================================================
   RENDER HISTORIAL
============================================================ */

function renderHistory(
    history
) {

    if (!history.length) {

        ticketHistory.innerHTML = `
            <div class="history-empty">
                No hay movimientos registrados.
            </div>
        `;

        return;
    }


    ticketHistory.innerHTML =
        history
            .map(item => {

                return `
                    <div class="history-item">

                        <div class="history-dot"></div>

                        <div class="history-content">

                            <div class="history-top">

                                <strong>
                                    ${escapeHtml(
                                        item.usuarioNombre ||
                                        item.creadoPorNombre ||
                                        "Usuario"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        formatDate(
                                            item.createdAt
                                        )
                                    )}
                                </span>

                            </div>

                            <p>
                                ${escapeHtml(
                                    item.comentario ||
                                    "Movimiento registrado."
                                )}
                            </p>

                        </div>

                    </div>
                `;
            })
            .join("");
}


/* ============================================================
   DETECTAR CAMBIOS
============================================================ */

function buildChanges() {

    if (!selectedTicket) {
        return [];
    }


    const changes = [];


    /*
     * RESPONSABLE COMERCIAL
     */

    const oldCommercial =
        selectedTicket.responsableComercialId ||
        selectedTicket.creadoPorId ||
        "";

    const newCommercial =
        detailCommercialResponsible.value ||
        "";


    if (
        oldCommercial !==
        newCommercial
    ) {

        const oldUser =
            users.find(
                user =>
                    user.id === oldCommercial
            );

        const newUser =
            users.find(
                user =>
                    user.id === newCommercial
            );


        changes.push({

            field:
                "responsableComercialId",

            oldValue:
                oldCommercial,

            newValue:
                newCommercial,

            oldName:
                oldUser?.nombre ||
                selectedTicket.responsableComercialNombre ||
                selectedTicket.creadoPorNombre ||
                "Sin asignar",

            newName:
                newUser?.nombre ||
                "Sin asignar"
        });
    }


    /*
     * SOPORTE
     */

    const oldSupport =
        selectedTicket.responsableSoporteId ||
        "";

    const newSupport =
        detailResponsible.value ||
        "";


    if (
        oldSupport !==
        newSupport
    ) {

        const oldUser =
            users.find(
                user =>
                    user.id === oldSupport
            );

        const newUser =
            users.find(
                user =>
                    user.id === newSupport
            );


        changes.push({

            field:
                "responsableSoporteId",

            oldValue:
                oldSupport,

            newValue:
                newSupport,

            oldName:
                oldUser?.nombre ||
                selectedTicket.responsableSoporteNombre ||
                "Pendiente de asignación",

            newName:
                newUser?.nombre ||
                "Pendiente de asignación"
        });
    }


    /*
     * PRIORIDAD
     */

    if (
        selectedTicket.prioridad !==
        detailPriority.value
    ) {

        changes.push({

            field:
                "prioridad",

            oldValue:
                selectedTicket.prioridad ||
                "",

            newValue:
                detailPriority.value,

            oldName:
                formatPriority(
                    selectedTicket.prioridad
                ),

            newName:
                formatPriority(
                    detailPriority.value
                )
        });
    }


    /*
     * ESTADO
     */

    if (
        selectedTicket.estado !==
        detailStatus.value
    ) {

        changes.push({

            field:
                "estado",

            oldValue:
                selectedTicket.estado ||
                "",

            newValue:
                detailStatus.value,

            oldName:
                formatStatus(
                    selectedTicket.estado
                ),

            newName:
                formatStatus(
                    detailStatus.value
                )
        });
    }


    return changes;
}


function getSupportResolutionChange() {
    if (!canUseSupportActions() || !supportResolutionComment) {
        return null;
    }

    const newComment =
        supportResolutionComment.value.trim();
    const oldComment =
        String(selectedTicket?.respuestaSoporte || "").trim();

    if (!newComment || newComment === oldComment) {
        return null;
    }

    return {
        oldValue: oldComment,
        newValue: newComment
    };
}


function getSupportFormLinkChange() {

    if (!canUseSupportActions() || !supportFormLink) {
        return null;
    }

    const newLink =
        supportFormLink.value.trim();

    const oldLink =
        String(
            selectedTicket?.linkFormularioSoporte || ""
        ).trim();

    if (newLink === oldLink) {
        return null;
    }

    if (newLink && !buildSafeHttpLink(newLink)) {
        throw new Error(
            "El Link de formulario debe ser una URL válida que empiece por http:// o https://."
        );
    }

    return {
        oldValue: oldLink,
        newValue: newLink
    };
}


/* ============================================================
   ACTUALIZAR TICKET
============================================================ */

async function updateTicketChanges() {

    if (
        !selectedTicket ||
        isSavingChanges
    ) {
        return;
    }


    if (!canManageTickets()) {

        showFormMessage(
            ticketDetailMessage,
            "No tienes permisos para modificar este ticket.",
            "error"
        );

        return;
    }


    const changes =
        buildChanges();

    const supportResolutionChange =
        getSupportResolutionChange();

    let supportFormLinkChange = null;

    try {
        supportFormLinkChange =
            getSupportFormLinkChange();
    } catch (linkError) {
        showFormMessage(
            ticketDetailMessage,
            linkError.message,
            "error"
        );
        return;
    }


    if (
        !changes.length &&
        !supportResolutionChange &&
        !supportFormLinkChange
    ) {

        showFormMessage(
            ticketDetailMessage,
            "No hay cambios para guardar.",
            "info"
        );

        return;
    }


    /*
     * Seguridad adicional en interfaz:
     *
     * Solo admin cambia responsable comercial.
     */

    const commercialChange =
        changes.find(
            change =>
                change.field ===
                "responsableComercialId"
        );


    if (
        commercialChange &&
        !isAdmin()
    ) {

        showFormMessage(
            ticketDetailMessage,
            "Solo el administrador puede cambiar el responsable comercial.",
            "error"
        );

        return;
    }


    /*
     * Solo usuarios con asignación
     * pueden cambiar soporte.
     */

    const supportChange =
        changes.find(
            change =>
                change.field ===
                "responsableSoporteId"
        );


    if (
        supportChange &&
        !canAssignTickets()
    ) {

        showFormMessage(
            ticketDetailMessage,
            "No tienes permisos para cambiar el responsable de soporte.",
            "error"
        );

        return;
    }


    isSavingChanges = true;

    saveTicketChangesButton.disabled =
        true;

    saveTicketChangesButton.textContent =
        "Guardando...";


    clearFormMessage(
        ticketDetailMessage
    );


    try {

        const ticketRef =
            doc(
                db,
                "tickets",
                selectedTicket.id
            );


        /*
         * =====================================================
         * ACTUALIZAR + HISTORIAL ATÓMICO
         * =====================================================
         */

        const updateData = {
            prioridad: detailPriority.value,
            estado: detailStatus.value,
            updatedAt: serverTimestamp()
        };

        if (supportResolutionChange) {
            updateData.respuestaSoporte =
                supportResolutionChange.newValue;
            updateData.respuestaSoportePorId =
                auth.currentUser.uid;
            updateData.respuestaSoportePorNombre =
                currentUserProfile.nombre ||
                currentUserProfile.email ||
                "Soporte";
            updateData.respuestaSoporteEn =
                serverTimestamp();
        }

        if (supportFormLinkChange) {
            updateData.linkFormularioSoporte =
                supportFormLinkChange.newValue;
            updateData.linkFormularioSoportePorId =
                auth.currentUser.uid;
            updateData.linkFormularioSoportePorNombre =
                currentUserProfile.nombre ||
                currentUserProfile.email ||
                "Soporte";
            updateData.linkFormularioSoporteEn =
                serverTimestamp();
        }

        if (commercialChange) {
            const newUser = users.find(
                user => user.id === commercialChange.newValue
            );

            updateData.responsableComercialId =
                commercialChange.newValue;

            updateData.responsableComercialNombre =
                newUser?.nombre || newUser?.email || "";
        }

        if (supportChange) {
            const newUser = users.find(
                user => user.id === supportChange.newValue
            );

            updateData.responsableSoporteId =
                supportChange.newValue || null;

            updateData.responsableSoporteNombre =
                newUser?.nombre || newUser?.email || "";

            if (
                supportChange.newValue &&
                selectedTicket.estado === "nuevo" &&
                detailStatus.value === "nuevo"
            ) {
                updateData.estado = "asignado";
            }
        }

        const batch = writeBatch(db);

        batch.update(ticketRef, updateData);

        for (const change of changes) {
            let comment = "Cambio registrado en el ticket.";

            if (change.field === "responsableComercialId") {
                comment = `Responsable comercial cambiado de "${change.oldName}" a "${change.newName}".`;
            } else if (change.field === "responsableSoporteId") {
                comment = `Responsable de soporte cambiado de "${change.oldName}" a "${change.newName}".`;
            } else if (change.field === "prioridad") {
                comment = `Prioridad cambiada de "${change.oldName}" a "${change.newName}".`;
            } else if (change.field === "estado") {
                comment = `Estado cambiado de "${change.oldName}" a "${change.newName}".`;
            }

            const historyRef = doc(
                collection(db, "tickets", selectedTicket.id, "historial")
            );

            batch.set(historyRef, {
                tipo: "actualizacion",
                accion: "cambio",
                campo: change.field,
                valorAnterior: change.oldValue,
                valorNuevo: change.newValue,
                comentario: comment,
                usuarioId: auth.currentUser.uid,
                usuarioNombre:
                    currentUserProfile.nombre ||
                    currentUserProfile.email ||
                    "Usuario",
                usuarioRol: currentUserProfile.rol || "usuario",
                createdAt: serverTimestamp()
            });
        }

        if (supportResolutionChange) {
            const historyRef = doc(
                collection(db, "tickets", selectedTicket.id, "historial")
            );

            batch.set(historyRef, {
                tipo: "respuesta_soporte",
                accion: "comentario",
                campo: "respuestaSoporte",
                valorAnterior: supportResolutionChange.oldValue,
                valorNuevo: supportResolutionChange.newValue,
                comentario:
                    `Respuesta de soporte: ${supportResolutionChange.newValue}`,
                usuarioId: auth.currentUser.uid,
                usuarioNombre:
                    currentUserProfile.nombre ||
                    currentUserProfile.email ||
                    "Soporte",
                usuarioRol: currentUserProfile.rol || "asesor_soporte",
                createdAt: serverTimestamp()
            });
        }

        if (supportFormLinkChange) {
            const historyRef = doc(
                collection(db, "tickets", selectedTicket.id, "historial")
            );

            batch.set(historyRef, {
                tipo: "link_formulario_soporte",
                accion: "comentario",
                campo: "linkFormularioSoporte",
                valorAnterior: supportFormLinkChange.oldValue,
                valorNuevo: supportFormLinkChange.newValue,
                comentario:
                    supportFormLinkChange.newValue
                        ? "Soporte agregó un Link de formulario."
                        : "Soporte eliminó el Link de formulario.",
                usuarioId: auth.currentUser.uid,
                usuarioNombre:
                    currentUserProfile.nombre ||
                    currentUserProfile.email ||
                    "Soporte",
                usuarioRol: currentUserProfile.rol || "asesor_soporte",
                createdAt: serverTimestamp()
            });
        }

        await batch.commit();

        /*
         * =====================================================
         * NOTIFICACIÓN SOPORTE
         * ===================================================== */

        if (
            supportChange &&
            supportChange.newValue
        ) {

            await addDoc(
                collection(
                    db,
                    "notificaciones"
                ),
                {

                    tipo:
                        "ticket_asignado",

                    titulo:
                        `Ticket ${selectedTicket.numero} asignado`,

                    mensaje:
                        `Se te asignó el ticket ${selectedTicket.numero}.`,

                    ticketId:
                        selectedTicket.id,

                    ticketNumero:
                        selectedTicket.numero,

                    usuarioDestinoId:
                        supportChange.newValue,

                    leida:
                        false,

                    createdAt:
                        serverTimestamp()
                }
            );
        }


        /*
         * ÉXITO
         */

        showFormMessage(
            ticketDetailMessage,
            "Cambios guardados correctamente.",
            "success"
        );


        /*
         * Actualizamos el objeto local
         * para que la próxima operación
         * parta de los datos nuevos.
         */

        selectedTicket = {
            ...selectedTicket,
            prioridad: detailPriority.value,
            estado: updateData.estado || detailStatus.value,
            updatedAt: new Date(),
            ...(supportResolutionChange
                ? {
                    respuestaSoporte: supportResolutionChange.newValue,
                    respuestaSoportePorId: auth.currentUser.uid,
                    respuestaSoportePorNombre:
                        currentUserProfile.nombre ||
                        currentUserProfile.email ||
                        "Soporte",
                    respuestaSoporteEn: new Date()
                }
                : {}),
            ...(supportFormLinkChange
                ? {
                    linkFormularioSoporte:
                        supportFormLinkChange.newValue,
                    linkFormularioSoportePorId:
                        auth.currentUser.uid,
                    linkFormularioSoportePorNombre:
                        currentUserProfile.nombre ||
                        currentUserProfile.email ||
                        "Soporte",
                    linkFormularioSoporteEn:
                        new Date()
                }
                : {}),
            ...(commercialChange
                ? {
                    responsableComercialId: commercialChange.newValue,
                    responsableComercialNombre: commercialChange.newName
                }
                : {}),
            ...(supportChange
                ? {
                    responsableSoporteId: supportChange.newValue || null,
                    responsableSoporteNombre: supportChange.newName || ""
                }
                : {})
        };


        window.setTimeout(
            () => {

                clearFormMessage(
                    ticketDetailMessage
                );

            },
            2500
        );


    } catch (error) {

        console.error(
            "ERROR ACTUALIZANDO TICKET:",
            error
        );


        let message =
            "No fue posible guardar los cambios.";


        if (
            error?.code ===
            "permission-denied"
        ) {

            message =
                "Firebase rechazó la modificación por permisos.";
        }

        else if (
            error?.message
        ) {

            message =
                error.message;
        }


        showFormMessage(
            ticketDetailMessage,
            message,
            "error"
        );

    } finally {

        isSavingChanges = false;

        saveTicketChangesButton.disabled =
            !canManageTickets();

        saveTicketChangesButton.textContent =
            "Guardar cambios";
    }
}


/* ============================================================
   DEVOLUCIÓN DE TICKET
============================================================ */

function openReturnTicketSection() {
    if (!canUseSupportActions() || !selectedTicket) {
        return;
    }

    returnTicketSection?.classList.remove("hidden");
    returnTicketComment?.focus();
}


function closeReturnTicketSection() {
    returnTicketSection?.classList.add("hidden");
    if (returnTicketComment) {
        returnTicketComment.value = "";
    }
}


async function returnTicket() {
    if (!canUseSupportActions() || !selectedTicket || isSavingChanges) {
        return;
    }

    const comment =
        returnTicketComment?.value?.trim() || "";

    if (!comment) {
        showFormMessage(
            ticketDetailMessage,
            "Es obligatorio indicar por qué se devuelve el ticket.",
            "error"
        );
        return;
    }

    isSavingChanges = true;

    if (returnTicketButton) {
        returnTicketButton.disabled = true;
        returnTicketButton.textContent = "Devolviendo...";
    }

    try {
        const ticketRef = doc(db, "tickets", selectedTicket.id);
        const historyRef = doc(
            collection(db, "tickets", selectedTicket.id, "historial")
        );
        const batch = writeBatch(db);

        batch.update(ticketRef, {
            estado: "devuelto",
            devolucionComentario: comment,
            devueltoPorId: auth.currentUser.uid,
            devueltoPorNombre:
                currentUserProfile.nombre ||
                currentUserProfile.email ||
                "Soporte",
            devueltoEn: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        batch.set(historyRef, {
            tipo: "devolucion",
            accion: "devolver",
            campo: "estado",
            valorAnterior: selectedTicket.estado || "",
            valorNuevo: "devuelto",
            comentario:
                `Ticket devuelto por falta de información o datos suficientes: ${comment}`,
            motivoDevolucion: comment,
            usuarioId: auth.currentUser.uid,
            usuarioNombre:
                currentUserProfile.nombre ||
                currentUserProfile.email ||
                "Soporte",
            usuarioRol: currentUserProfile.rol || "asesor_soporte",
            createdAt: serverTimestamp()
        });

        await batch.commit();

        selectedTicket = {
            ...selectedTicket,
            estado: "devuelto",
            devolucionComentario: comment,
            devueltoPorId: auth.currentUser.uid,
            devueltoPorNombre:
                currentUserProfile.nombre ||
                currentUserProfile.email ||
                "Soporte",
            devueltoEn: new Date(),
            updatedAt: new Date()
        };

        detailStatus.value = "devuelto";
        if (returnTicketOpenButton) {
            returnTicketOpenButton.disabled = true;
        }
        closeReturnTicketSection();

        showFormMessage(
            ticketDetailMessage,
            "Ticket devuelto correctamente.",
            "success"
        );
    } catch (error) {
        console.error("ERROR DEVOLVIENDO TICKET:", error);
        showFormMessage(
            ticketDetailMessage,
            error?.message || "No fue posible devolver el ticket.",
            "error"
        );
    } finally {
        isSavingChanges = false;
        if (returnTicketButton) {
            returnTicketButton.disabled = !canUseSupportActions();
            returnTicketButton.textContent = "Devolver ticket";
        }
    }
}


/* ============================================================
   REFRESCAR
============================================================ */

async function refreshData() {

    try {

        refreshTicketsButton.disabled =
            true;

        refreshTicketsButton.textContent =
            "Actualizando...";


        await loadClients();
        await loadUsers();


        showPageMessage(
            "Información actualizada.",
            "success"
        );

    } catch (error) {

        console.error(
            "Error actualizando información:",
            error
        );

    } finally {

        refreshTicketsButton.disabled =
            false;

        refreshTicketsButton.textContent =
            "↻ Actualizar";
    }
}


/* ============================================================
   EVENTOS
============================================================ */

newTicketButton?.addEventListener(
    "click",
    openTicketModal
);


closeTicketModal?.addEventListener(
    "click",
    closeCreateTicketModal
);


cancelTicketButton?.addEventListener(
    "click",
    closeCreateTicketModal
);


closeTicketDetailModal?.addEventListener(
    "click",
    closeTicketDetail
);


closeDetailButton?.addEventListener(
    "click",
    closeTicketDetail
);


saveTicketChangesButton?.addEventListener(
    "click",
    updateTicketChanges
);


returnTicketOpenButton?.addEventListener(
    "click",
    openReturnTicketSection
);


returnTicketButton?.addEventListener(
    "click",
    returnTicket
);


cancelReturnButton?.addEventListener(
    "click",
    closeReturnTicketSection
);


refreshTicketsButton?.addEventListener(
    "click",
    refreshData
);


logoutButton?.addEventListener(
    "click",
    logout
);


ticketForm?.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        createTicket();
    }
);


/*
 * FILTROS
 */

ticketSearch?.addEventListener(
    "input",
    renderTickets
);


ticketStatusFilter?.addEventListener(
    "change",
    renderTickets
);


ticketPriorityFilter?.addEventListener(
    "change",
    renderTickets
);


/*
 * Cerrar modal haciendo clic
 * fuera del contenido.
 */

ticketModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            ticketModal
        ) {

            closeCreateTicketModal();
        }
    }
);


ticketDetailModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            ticketDetailModal
        ) {

            closeTicketDetail();
        }
    }
);


/*
 * ESC
 */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !== "Escape"
        ) {
            return;
        }

        if (
            !ticketModal.classList.contains(
                "hidden"
            )
        ) {

            closeCreateTicketModal();
        }

        if (
            !ticketDetailModal.classList.contains(
                "hidden"
            )
        ) {

            closeTicketDetail();
        }
    }
);


/* ============================================================
   INICIALIZACIÓN
============================================================ */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "./login.html";

            return;
        }


        try {

            currentUserProfile =
                await getCurrentUserProfile(
                    user.uid
                );


            /*
             * Validación básica.
             */

            if (
                currentUserProfile.estado &&
                currentUserProfile.estado !== "activo"
            ) {

                await signOut(auth);

                window.location.href =
                    "./login.html";

                return;
            }


            /*
             * Permiso de entrada.
             */

            if (
                !hasPermission("tickets_ver")
            ) {

                showPageMessage(
                    "Tu usuario no tiene permisos para consultar tickets.",
                    "error"
                );

                ticketsTableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="9"
                            class="table-empty"
                        >
                            No tienes permisos para consultar tickets.
                        </td>
                    </tr>
                `;

                return;
            }


            /*
             * UI
             */

            renderCurrentUser();


            /*
             * Carga inicial
             */

            await loadClients();

            await loadUsers();


            /*
             * Escuchar tickets
             */

            listenTickets();

        } catch (error) {

            console.error(
                "Error inicializando tickets:",
                error
            );

            showPageMessage(
                error?.message ||
                "No fue posible inicializar el módulo de tickets.",
                "error"
            );
        }
    }
);
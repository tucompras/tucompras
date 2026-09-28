import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";


import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    getCountFromServer
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


import {
    auth,
    db
} from "./firebase-config.js";



/* =========================================================
   ELEMENTOS
========================================================= */

const userName =
    document.getElementById("userName");

const userRole =
    document.getElementById("userRole");

const userAvatar =
    document.getElementById("userAvatar");

const welcomeMessage =
    document.getElementById("welcomeMessage");

const welcomeDescription =
    document.getElementById("welcomeDescription");

const logoutButton =
    document.getElementById("logoutButton");

const usersMenuItem =
    document.getElementById("usersMenuItem");

const dashboardMenuItem =
    document.getElementById("dashboardMenuItem");

const clientsMenuItem =
    document.getElementById("clientsMenuItem");

const gestionesMenuItem =
    document.getElementById("gestionesMenuItem");

const ticketsMenuItem =
    document.getElementById("ticketsMenuItem");

const ventasMenuItem =
    document.getElementById("ventasMenuItem");

const seguimientosMenuItem =
    document.getElementById("seguimientosMenuItem");

const reportesMenuItem =
    document.getElementById("reportesMenuItem");

const chatMenuItem =
    document.getElementById("chatMenuItem");


const stat1Label =
    document.getElementById("stat1Label");

const stat1Value =
    document.getElementById("stat1Value");

const stat1Description =
    document.getElementById("stat1Description");


const stat2Label =
    document.getElementById("stat2Label");

const stat2Value =
    document.getElementById("stat2Value");

const stat2Description =
    document.getElementById("stat2Description");


const stat3Label =
    document.getElementById("stat3Label");

const stat3Value =
    document.getElementById("stat3Value");

const stat3Description =
    document.getElementById("stat3Description");


const stat4Label =
    document.getElementById("stat4Label");

const stat4Value =
    document.getElementById("stat4Value");

const stat4Description =
    document.getElementById("stat4Description");


const greenCount =
    document.getElementById("greenCount");

const yellowCount =
    document.getElementById("yellowCount");

const redCount =
    document.getElementById("redCount");

const trafficLightEmpty =
    document.getElementById("trafficLightEmpty");

const clientTrafficLight =
    document.getElementById("clientTrafficLight");


const newClientsCount =
    document.getElementById("newClientsCount");

const activeClientsCount =
    document.getElementById("activeClientsCount");

const openTicketsCount =
    document.getElementById("openTicketsCount");

const todayGestionesCount =
    document.getElementById("todayGestionesCount");



/* =========================================================
   ROLES
========================================================= */

function formatRole(role) {

    const roles = {

        administrador:
            "Administrador",

        jefe_ventas_marketing:
            "Jefe de ventas y marketing",

        jefe_ventas:
            "Jefe de ventas y marketing",

        asesor_comercial:
            "Asesor comercial",

        asesor_soporte:
            "Asesor de soporte",

        jefe_soporte:
            "Jefe de soporte"

    };

    return roles[role] || "Usuario";

}



/* =========================================================
   INICIALES
========================================================= */

function getInitials(name) {

    if (!name) {

        return "U";

    }


    const parts =
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2);


    return parts
        .map(
            part =>
                part
                    .charAt(0)
                    .toUpperCase()
        )
        .join("");

}



/* =========================================================
   PERFIL
========================================================= */

async function getUserProfile(uid) {

    const userRef =
        doc(
            db,
            "usuarios",
            uid
        );


    const snapshot =
        await getDoc(userRef);


    if (!snapshot.exists()) {

        return null;

    }


    return {

        id: snapshot.id,

        ...snapshot.data()

    };

}



/* =========================================================
   MOSTRAR USUARIO
========================================================= */

function showUser(profile, user) {

    const name =
        profile?.nombre ||
        user.displayName ||
        user.email ||
        "Usuario";


    const role =
        profile?.rol ||
        "usuario";


    if (userName) {

        userName.textContent =
            name;

    }


    if (userRole) {

        userRole.textContent =
            formatRole(role);

    }


    if (userAvatar) {

        userAvatar.textContent =
            getInitials(name);

    }


    if (welcomeMessage) {

        welcomeMessage.textContent =
            `Hola, ${name}`;

    }

}



/* =========================================================
   MENÚ USUARIOS
   SOLO ADMINISTRADOR
========================================================= */

function configureUsersMenu(profile) {

    if (!usersMenuItem) {

        return;

    }


    if (profile?.rol !== "administrador") {

        usersMenuItem.remove();

    }

}



/* =========================================================
   MENÚ SOPORTE
   SOLO ASESOR DE SOPORTE / JEFE DE SOPORTE
========================================================= */

function configureSupportMenu(profile) {

    const isSupportUser =
        profile?.rol === "asesor_soporte" ||
        profile?.rol === "jefe_soporte";


    if (!isSupportUser) {

        return;

    }


    /*
     * Misma lógica visual del módulo Tickets:
     * Soporte solo necesita Dashboard, Tickets y Chat.
     * El resto de roles conserva su menú actual.
     */

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

        if (item) {
            item.style.display = "none";
        }

    });


    if (dashboardMenuItem) {
        dashboardMenuItem.style.display = "";
    }


    if (ticketsMenuItem) {
        ticketsMenuItem.style.display = "";
    }


    if (chatMenuItem) {
        chatMenuItem.style.display = "";
        chatMenuItem.removeAttribute("data-coming-soon");
    }

}



/* =========================================================
   COMING SOON
========================================================= */

function configureComingSoon() {

    document
        .querySelectorAll(
            "[data-coming-soon]"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        const module =
                            item.dataset.comingSoon;


                        alert(
                            `${module} será habilitado en la siguiente fase.`
                        );

                    }
                );

            }
        );

}



/* =========================================================
   HELPERS FIRESTORE
========================================================= */

async function countQuery(
    collectionName,
    constraints = []
) {

    try {

        const reference =
            collection(
                db,
                collectionName
            );


        const q =
            constraints.length
                ? query(
                    reference,
                    ...constraints
                )
                : query(reference);


        const snapshot =
            await getCountFromServer(q);


        return snapshot
            .data()
            .count || 0;

    } catch (error) {

        console.error(
            `Error contando ${collectionName}:`,
            error
        );


        return 0;

    }

}



async function getDocuments(
    collectionName,
    constraints = []
) {

    try {

        const reference =
            collection(
                db,
                collectionName
            );


        const q =
            constraints.length
                ? query(
                    reference,
                    ...constraints
                )
                : query(reference);


        const snapshot =
            await getDocs(q);


        return snapshot.docs.map(
            document => ({
                id: document.id,
                ...document.data()
            })
        );

    } catch (error) {

        console.error(
            `Error leyendo ${collectionName}:`,
            error
        );


        return [];

    }

}



/* =========================================================
   FECHAS
========================================================= */

function toDate(value) {

    if (!value) {

        return null;

    }


    if (
        value instanceof Date
    ) {

        return value;

    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate();

    }


    if (
        typeof value === "string" ||
        typeof value === "number"
    ) {

        const date =
            new Date(value);


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date;

        }

    }


    return null;

}



/* =========================================================
   INICIO DEL DÍA
========================================================= */

function startOfToday() {

    const date =
        new Date();


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;

}



/* =========================================================
   SEMÁFORO DE CLIENTES
=========================================================

   VERDE:
   última gestión <= 7 días

   AMARILLO:
   entre 8 y 15 días

   ROJO:
   más de 15 días o nunca gestionado
========================================================= */

function calculateTrafficLight(
    clients
) {

    let green = 0;

    let yellow = 0;

    let red = 0;


    const now =
        new Date();


    clients.forEach(
        client => {

            const lastManagement =
                toDate(
                    client.fechaUltimaGestion
                );


            if (!lastManagement) {

                red++;

                return;

            }


            const difference =
                now.getTime() -
                lastManagement.getTime();


            const days =
                difference /
                (
                    1000 *
                    60 *
                    60 *
                    24
                );


            if (days <= 7) {

                green++;

            } else if (days <= 15) {

                yellow++;

            } else {

                red++;

            }

        }
    );


    return {

        green,
        yellow,
        red

    };

}



/* =========================================================
   MOSTRAR SEMÁFORO
========================================================= */

function renderTrafficLight(
    clients
) {

    if (!clients.length) {

        clientTrafficLight
            ?.classList
            .add("hidden");

        trafficLightEmpty
            ?.classList
            .remove("hidden");

        return;

    }


    clientTrafficLight
        ?.classList
        .remove("hidden");


    trafficLightEmpty
        ?.classList
        .add("hidden");


    const traffic =
        calculateTrafficLight(
            clients
        );


    if (greenCount) {

        greenCount.textContent =
            traffic.green;

    }


    if (yellowCount) {

        yellowCount.textContent =
            traffic.yellow;

    }


    if (redCount) {

        redCount.textContent =
            traffic.red;

    }

}



/* =========================================================
   CLIENTES DEL USUARIO
========================================================= */

async function loadClients(
    profile
) {

    const role =
        profile.rol;


    /*
     * ADMINISTRADOR / JEFE
     */

    if (
        role ===
            "administrador" ||
        role ===
            "jefe_ventas_marketing" ||
        role ===
            "jefe_ventas"
    ) {

        return getDocuments(
            "clientes"
        );

    }



    /*
     * ASESOR COMERCIAL
     */

    if (
        role ===
        "asesor_comercial"
    ) {

        const assigned =
            await getDocuments(
                "clientes",
                [
                    where(
                        "asesorComercialId",
                        "==",
                        profile.id
                    )
                ]
            );


        const created =
            await getDocuments(
                "clientes",
                [
                    where(
                        "createdBy",
                        "==",
                        profile.id
                    )
                ]
            );


        const map =
            new Map();


        [
            ...assigned,
            ...created
        ]
        .forEach(
            client => {

                map.set(
                    client.id,
                    client
                );

            }
        );


        return Array.from(
            map.values()
        );

    }



    /*
     * SOPORTE
     */

    if (
        role ===
        "asesor_soporte"
    ) {

        return getDocuments(
            "clientes",
            [
                where(
                    "asesorSoporteId",
                    "==",
                    profile.id
                )
            ]
        );

    }


    return [];

}



/* =========================================================
   GESTIONES
========================================================= */

async function loadGestiones(
    profile
) {

    if (
        profile.rol ===
            "administrador" ||
        profile.rol ===
            "jefe_ventas_marketing" ||
        profile.rol ===
            "jefe_ventas"
    ) {

        return getDocuments(
            "gestiones"
        );

    }


    return getDocuments(
        "gestiones",
        [
            where(
                "usuarioId",
                "==",
                profile.id
            )
        ]
    );

}



/* =========================================================
   TICKETS
========================================================= */

async function loadTickets(
    profile
) {

    const role =
        profile.rol;


    /*
     * ADMIN / JEFE
     */

    if (
        role ===
            "administrador" ||
        role ===
            "jefe_ventas_marketing" ||
        role ===
            "jefe_ventas"
    ) {

        return getDocuments(
            "tickets"
        );

    }



    /*
     * COMERCIAL
     */

    if (
        role ===
        "asesor_comercial"
    ) {

        const responsible =
            await getDocuments(
                "tickets",
                [
                    where(
                        "responsableComercialId",
                        "==",
                        profile.id
                    )
                ]
            );


        return uniqueDocuments(
            responsible
        );

    }



    /*
     * SOPORTE
     */

    if (
        role ===
        "asesor_soporte"
    ) {

        const assigned =
            await getDocuments(
                "tickets",
                [
                    where(
                        "responsableSoporteId",
                        "==",
                        profile.id
                    )
                ]
            );


        const created =
            await getDocuments(
                "tickets",
                [
                    where(
                        "creadoPorId",
                        "==",
                        profile.id
                    )
                ]
            );


        return uniqueDocuments(
            [
                ...assigned,
                ...created
            ]
        );

    }


    return [];

}



/* =========================================================
   UNIFICAR DOCUMENTOS
========================================================= */

function uniqueDocuments(
    documents
) {

    const map =
        new Map();


    documents.forEach(
        document => {

            map.set(
                document.id,
                document
            );

        }
    );


    return Array.from(
        map.values()
    );

}



/* =========================================================
   ESTADO TICKET
========================================================= */

function isOpenTicket(
    ticket
) {

    const closedStates = [
        "resuelto",
        "cerrado"
    ];


    return !closedStates.includes(
        ticket.estado
    );

}



/* =========================================================
   CONFIGURAR DASHBOARD
========================================================= */

async function buildDashboard(
    profile
) {

    const role =
        profile.rol;


    const clients =
        await loadClients(
            profile
        );


    const gestiones =
        await loadGestiones(
            profile
        );


    const tickets =
        await loadTickets(
            profile
        );



    /*
     * SEMÁFORO
     */

    renderTrafficLight(
        clients
    );



    /*
     * DATOS GENERALES
     */

    const today =
        startOfToday();


    const todayGestiones =
        gestiones.filter(
            gestion => {

                const date =
                    toDate(
                        gestion.fechaGestion
                    );


                return (
                    date &&
                    date >= today
                );

            }
        );


    const newClients =
        clients.filter(
            client =>
                client.estado ===
                "nuevo"
        );


    const activeClients =
        clients.filter(
            client =>
                client.estado ===
                    "activo" ||
                client.estado ===
                    "active"
        );


    const openTickets =
        tickets.filter(
            ticket =>
                isOpenTicket(
                    ticket
                )
        );



    /* =====================================================
       ADMINISTRADOR
    ===================================================== */

    if (
        role ===
        "administrador"
    ) {

        stat1Label.textContent =
            "Clientes";

        stat1Value.textContent =
            clients.length;

        stat1Description.textContent =
            "Total de clientes";


        stat2Label.textContent =
            "Gestiones";

        stat2Value.textContent =
            gestiones.length;

        stat2Description.textContent =
            "Gestiones registradas";


        stat3Label.textContent =
            "Tickets abiertos";

        stat3Value.textContent =
            openTickets.length;

        stat3Description.textContent =
            "Pendientes de cierre";


        stat4Label.textContent =
            "Gestiones hoy";

        stat4Value.textContent =
            todayGestiones.length;

        stat4Description.textContent =
            "Actividad del día";



        welcomeDescription.textContent =
            "Aquí puedes controlar toda la operación comercial y de soporte de la empresa.";

    }



    /* =====================================================
       JEFE
    ===================================================== */

    else if (
        role ===
            "jefe_ventas_marketing" ||
        role ===
            "jefe_ventas"
    ) {

        stat1Label.textContent =
            "Clientes";

        stat1Value.textContent =
            clients.length;

        stat1Description.textContent =
            "Clientes de la operación";


        stat2Label.textContent =
            "Gestiones";

        stat2Value.textContent =
            gestiones.length;

        stat2Description.textContent =
            "Gestiones registradas";


        stat3Label.textContent =
            "Tickets abiertos";

        stat3Value.textContent =
            openTickets.length;

        stat3Description.textContent =
            "Pendientes de cierre";


        stat4Label.textContent =
            "Gestiones hoy";

        stat4Value.textContent =
            todayGestiones.length;

        stat4Description.textContent =
            "Actividad del día";


        welcomeDescription.textContent =
            "Aquí puedes controlar la operación comercial y el seguimiento del equipo.";

    }



    /* =====================================================
       ASESOR COMERCIAL
    ===================================================== */

    else if (
        role ===
        "asesor_comercial"
    ) {

        stat1Label.textContent =
            "Mis clientes";

        stat1Value.textContent =
            clients.length;

        stat1Description.textContent =
            "Clientes creados o gestionados";


        stat2Label.textContent =
            "Mis gestiones";

        stat2Value.textContent =
            gestiones.length;

        stat2Description.textContent =
            "Gestiones realizadas por mí";


        stat3Label.textContent =
            "Mis tickets";

        stat3Value.textContent =
            tickets.length;

        stat3Description.textContent =
            "Tickets bajo mi responsabilidad";


        stat4Label.textContent =
            "Gestiones hoy";

        stat4Value.textContent =
            todayGestiones.length;

        stat4Description.textContent =
            "Realizadas hoy";


        welcomeDescription.textContent =
            "Aquí puedes controlar tus clientes, gestiones y tickets.";

    }



    /* =====================================================
       SOPORTE
    ===================================================== */

    else if (
        role ===
        "asesor_soporte"
    ) {

        const createdTickets =
            tickets.filter(
                ticket =>
                    ticket.creadoPorId ===
                    profile.id
            );


        const assignedTickets =
            tickets.filter(
                ticket =>
                    ticket.responsableSoporteId ===
                    profile.id
            );


        const unresolvedTickets =
            assignedTickets.filter(
                ticket =>
                    isOpenTicket(
                        ticket
                    )
            );


        const urgentTickets =
            assignedTickets.filter(
                ticket =>
                    ticket.prioridad ===
                    "urgente"
            );


        stat1Label.textContent =
            "Tickets creados";

        stat1Value.textContent =
            createdTickets.length;

        stat1Description.textContent =
            "Tickets creados por mí";


        stat2Label.textContent =
            "Por resolver";

        stat2Value.textContent =
            unresolvedTickets.length;

        stat2Description.textContent =
            "Tickets asignados a mí";


        stat3Label.textContent =
            "Por asignar";

        stat3Value.textContent =
            tickets.filter(
                ticket =>
                    !ticket.responsableSoporteId
            ).length;

        stat3Description.textContent =
            "Tickets sin soporte asignado";


        stat4Label.textContent =
            "Urgentes";

        stat4Value.textContent =
            urgentTickets.length;

        stat4Description.textContent =
            "Tickets urgentes asignados";


        welcomeDescription.textContent =
            "Aquí puedes controlar tus tickets creados, tickets asignados y la cola pendiente de soporte.";

    }



    /* =====================================================
       PANEL DERECHO
    ===================================================== */

    if (newClientsCount) {

        newClientsCount.textContent =
            newClients.length;

    }


    if (activeClientsCount) {

        activeClientsCount.textContent =
            activeClients.length;

    }


    if (openTicketsCount) {

        openTicketsCount.textContent =
            openTickets.length;

    }


    if (todayGestionesCount) {

        todayGestionesCount.textContent =
            todayGestiones.length;

    }

}



/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        await signOut(
            auth
        );


        window.location.href =
            "./login.html";

    } catch (error) {

        console.error(
            "Error cerrando sesión:",
            error
        );


        alert(
            "No fue posible cerrar la sesión."
        );

    }

}



/* =========================================================
   EVENTOS
========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        logout
    );

}



/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "./login.html";

            return;

        }


        try {

            const profile =
                await getUserProfile(
                    user.uid
                );


            if (!profile) {

                await signOut(
                    auth
                );


                window.location.href =
                    "./login.html";

                return;

            }


            if (
                profile.estado &&
                profile.estado !==
                    "activo"
            ) {

                await signOut(
                    auth
                );


                window.location.href =
                    "./login.html";

                return;

            }


            showUser(
                profile,
                user
            );


            configureUsersMenu(
                profile
            );

            configureSupportMenu(
                profile
            );


            /*
             * Los módulos en desarrollo conservan su comportamiento
             * "próximamente" para los roles que todavía los ven.
             * En soporte, Chat ya fue liberado visualmente y por eso
             * su atributo data-coming-soon fue retirado antes de aquí.
             */
            configureComingSoon();


            await buildDashboard(
                profile
            );


        } catch (error) {

            console.error(
                "Error cargando dashboard:",
                error
            );


            alert(
                "No fue posible cargar toda la información del dashboard."
            );

        }

    }
);
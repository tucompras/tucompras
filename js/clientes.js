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
    serverTimestamp
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
let editingClientId = "";
let duplicateClientId = "";
let isSaving = false;


// ============================================================
// ELEMENTOS
// ============================================================

const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const userAvatar = document.getElementById("userAvatar");

const usersMenuItem = document.getElementById("usersMenuItem");

const logoutButton = document.getElementById("logoutButton");

const newClientButton = document.getElementById("newClientButton");
const refreshClientsButton = document.getElementById("refreshClientsButton");

const searchClient = document.getElementById("searchClient");

const clientCounter = document.getElementById("clientCounter");
const clientsTableBody = document.getElementById("clientsTableBody");

const clientMessage = document.getElementById("clientMessage");


// ============================================================
// MODAL CLIENTE
// ============================================================

const clientModal = document.getElementById("clientModal");
const closeClientModal = document.getElementById("closeClientModal");
const cancelClientButton = document.getElementById("cancelClientButton");

const clientModalTitle = document.getElementById("clientModalTitle");

const clientForm = document.getElementById("clientForm");

const clientId = document.getElementById("clientId");

const whatsapp = document.getElementById("whatsapp");
const nombreWhatsapp = document.getElementById("nombreWhatsapp");

const nombre = document.getElementById("nombre");
const empresa = document.getElementById("empresa");

const tipoIdentificacion = document.getElementById(
    "tipoIdentificacion"
);

const identificacion = document.getElementById("identificacion");

const telefono = document.getElementById("telefono");

const email = document.getElementById("email");

const ciudad = document.getElementById("ciudad");

const direccion = document.getElementById("direccion");

const saveClientButton = document.getElementById(
    "saveClientButton"
);

const formMessage = document.getElementById(
    "formMessage"
);


// ============================================================
// MODAL DUPLICADO
// ============================================================

const duplicateClientModal = document.getElementById(
    "duplicateClientModal"
);

const closeDuplicateModal = document.getElementById(
    "closeDuplicateModal"
);

const closeDuplicateButton = document.getElementById(
    "closeDuplicateButton"
);

const manageDuplicateButton = document.getElementById(
    "manageDuplicateButton"
);

const duplicateClientName = document.getElementById(
    "duplicateClientName"
);

const duplicateClientWhatsapp = document.getElementById(
    "duplicateClientWhatsapp"
);

const duplicateClientCompany = document.getElementById(
    "duplicateClientCompany"
);

const duplicateClientAdvisor = document.getElementById(
    "duplicateClientAdvisor"
);


// ============================================================
// UTILIDADES
// ============================================================

function normalizeWhatsapp(value) {

    return String(value || "")
        .replace(/\D/g, "")
        .trim();

}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function getClientDisplayName(client) {

    return (
        client.nombre ||
        client.nombreWhatsapp ||
        "Cliente sin nombre"
    );

}


function getAdvisorName(profile) {

    return (
        profile?.nombre ||
        profile?.email ||
        "Usuario"
    );

}


function getInitials(value) {

    const text = String(value || "U")
        .trim();

    if (!text) {
        return "U";
    }

    const parts = text
        .split(/\s+/)
        .filter(Boolean);

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


function showPageMessage(message, type = "info") {

    if (!clientMessage) {
        return;
    }

    clientMessage.textContent = message;

    clientMessage.className =
        `page-message ${type}`;

}


function hidePageMessage() {

    if (!clientMessage) {
        return;
    }

    clientMessage.textContent = "";

    clientMessage.className =
        "page-message hidden";

}


function showFormMessage(message, type = "error") {

    if (!formMessage) {
        return;
    }

    formMessage.textContent = message;

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


function setSavingState(saving) {

    isSaving = saving;

    if (!saveClientButton) {
        return;
    }

    saveClientButton.disabled = saving;

    if (editingClientId) {

        saveClientButton.textContent =
            saving
                ? "Guardando..."
                : "Guardar cambios";

    } else {

        saveClientButton.textContent =
            saving
                ? "Creando..."
                : "Crear cliente";

    }

}


// ============================================================
// PERMISOS
// ============================================================

function isAdmin() {

    return currentUserProfile?.rol === "administrador";

}


function isSalesManager() {

    return (
        currentUserProfile?.rol ===
        "jefe_ventas_marketing"
    );

}


function isCommercialAdvisor() {

    return (
        currentUserProfile?.rol ===
        "asesor_comercial"
    );

}


function canCreateClients() {

    return (
        isAdmin() ||
        isSalesManager() ||
        isCommercialAdvisor()
    );

}


function canEditClient(client) {

    if (!currentUserProfile) {
        return false;
    }

    if (isAdmin() || isSalesManager()) {
        return true;
    }

    return (
        currentUserProfile.id ===
        client.asesorComercialId
    );

}


// ============================================================
// USUARIO ACTUAL
// ============================================================

async function loadCurrentUserProfile(user) {

    const userRef = doc(
        db,
        "usuarios",
        user.uid
    );

    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {

        throw new Error(
            "No existe el perfil del usuario en Firestore."
        );

    }

    currentUserProfile = {
        id: snapshot.id,
        ...snapshot.data()
    };

}


// ============================================================
// UI USUARIO
// ============================================================

function renderCurrentUser() {

    const displayName =
        getAdvisorName(currentUserProfile);

    if (userName) {
        userName.textContent = displayName;
    }

    if (userRole) {

        userRole.textContent =
            formatRole(currentUserProfile?.rol);

    }

    if (userAvatar) {

        userAvatar.textContent =
            getInitials(displayName);

    }

    // Usuarios solamente para administrador.
    if (usersMenuItem) {

        usersMenuItem.style.display =
            isAdmin()
                ? ""
                : "none";

    }

}


// ============================================================
// CARGAR CLIENTES
// ============================================================

async function loadClients() {

    if (!currentUserProfile) {
        return;
    }

    clients = [];

    if (clientsTableBody) {

        clientsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">
                    Cargando clientes...
                </td>
            </tr>
        `;

    }

    try {

        let clientsQuery;

        // ADMINISTRADOR / JEFE
        if (
            isAdmin() ||
            isSalesManager()
        ) {

            clientsQuery = query(
                collection(db, "clientes")
            );

        }

        // ASESOR COMERCIAL
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

        // SOPORTE
        else {

            clientsQuery = query(
                collection(db, "clientes"),
                where(
                    "asesorSoporteId",
                    "==",
                    currentUserProfile.id
                )
            );

        }

        const snapshot =
            await getDocs(clientsQuery);

        clients = snapshot.docs.map(
            item => ({
                id: item.id,
                ...item.data()
            })
        );

        clients.sort((a, b) => {

            const aTime =
                a.createdAt?.toMillis?.() || 0;

            const bTime =
                b.createdAt?.toMillis?.() || 0;

            return bTime - aTime;

        });

        renderClients();

    } catch (error) {

        console.error(
            "Error cargando clientes:",
            error
        );

        if (clientsTableBody) {

            clientsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">
                        No se pudieron cargar los clientes.
                    </td>
                </tr>
            `;

        }

        showPageMessage(
            `No se pudieron cargar los clientes: ${error.message}`,
            "error"
        );

    }

}


// ============================================================
// RENDER CLIENTES
// ============================================================

function renderClients() {

    if (!clientsTableBody) {
        return;
    }

    const search =
        String(searchClient?.value || "")
            .trim()
            .toLowerCase();

    const filteredClients =
        clients.filter(client => {

            const searchable = [

                client.nombre,

                client.nombreWhatsapp,

                client.whatsapp,

                client.empresa,

                client.ciudad,

                client.email,

                client.telefono,

                client.asesorComercialNombre

            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchable.includes(search);

        });


    if (clientCounter) {

        clientCounter.textContent =
            `Clientes encontrados: ${filteredClients.length}`;

    }


    if (!filteredClients.length) {

        clientsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">
                    No hay clientes para mostrar.
                </td>
            </tr>
        `;

        return;

    }


    clientsTableBody.innerHTML =
        filteredClients
            .map(client => {

                const displayName =
                    getClientDisplayName(client);

                const advisor =
                    client.asesorComercialNombre ||
                    "—";

                const actions = canEditClient(client)
                    ? `
                        <button
                            type="button"
                            class="btn btn-secondary"
                            data-edit-client="${escapeHtml(client.id)}"
                        >
                            Editar
                        </button>
                    `
                    : `
                        <span>—</span>
                    `;


                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHtml(displayName)}
                            </strong>

                            ${
                                client.nombre &&
                                client.nombreWhatsapp &&
                                client.nombre !== client.nombreWhatsapp
                                    ? `
                                        <small style="display:block;">
                                            ${escapeHtml(client.nombreWhatsapp)}
                                        </small>
                                    `
                                    : ""
                            }
                        </td>

                        <td>
                            ${escapeHtml(client.whatsapp || "—")}
                        </td>

                        <td>
                            ${escapeHtml(client.empresa || "—")}
                        </td>

                        <td>
                            ${escapeHtml(client.ciudad || "—")}
                        </td>

                        <td>
                            ${escapeHtml(advisor)}
                        </td>

                        <td>
                            ${actions}
                        </td>

                    </tr>
                `;

            })
            .join("");

}


// ============================================================
// MODAL CLIENTE
// ============================================================

function resetClientForm() {

    editingClientId = "";

    if (clientForm) {
        clientForm.reset();
    }

    if (clientId) {
        clientId.value = "";
    }

    if (tipoIdentificacion) {
        tipoIdentificacion.value = "";
    }

    if (clientModalTitle) {

        clientModalTitle.textContent =
            "Crear cliente";

    }

    hideFormMessage();

    if (saveClientButton) {

        saveClientButton.disabled = false;

        saveClientButton.textContent =
            "Crear cliente";

    }

}


function openClientModal(client = null) {

    hidePageMessage();

    resetClientForm();

    if (client) {

        editingClientId =
            client.id;

        if (clientModalTitle) {

            clientModalTitle.textContent =
                "Editar cliente";

        }

        if (clientId) {
            clientId.value =
                client.id;
        }

        if (whatsapp) {
            whatsapp.value =
                client.whatsapp || "";
        }

        if (nombreWhatsapp) {
            nombreWhatsapp.value =
                client.nombreWhatsapp || "";
        }

        if (nombre) {
            nombre.value =
                client.nombre || "";
        }

        if (empresa) {
            empresa.value =
                client.empresa || "";
        }

        if (tipoIdentificacion) {

            tipoIdentificacion.value =
                client.tipoIdentificacion || "";

        }

        if (identificacion) {

            identificacion.value =
                client.identificacion || "";

        }

        if (telefono) {

            telefono.value =
                client.telefono || "";

        }

        if (email) {

            email.value =
                client.email || "";

        }

        if (ciudad) {

            ciudad.value =
                client.ciudad || "";

        }

        if (direccion) {

            direccion.value =
                client.direccion || "";

        }

        if (saveClientButton) {

            saveClientButton.textContent =
                "Guardar cambios";

        }

    }

    if (clientModal) {

        clientModal.classList.remove(
            "hidden"
        );

    }

    setTimeout(() => {

        if (whatsapp) {
            whatsapp.focus();
        }

    }, 100);

}


function closeClientModalWindow() {

    if (clientModal) {

        clientModal.classList.add(
            "hidden"
        );

    }

    resetClientForm();

}


// ============================================================
// BUSCAR DUPLICADO
// ============================================================

async function findExistingClient(
    normalizedWhatsapp,
    whatsappName,
    currentId = ""
) {

    const searches = [];

    if (normalizedWhatsapp) {
        searches.push({
            field: "whatsapp",
            value: normalizedWhatsapp
        });
    }

    if (whatsappName) {
        searches.push({
            field: "nombreWhatsapp",
            value: whatsappName
        });
    }

    for (const search of searches) {

        const clientsQuery = query(
            collection(db, "clientes"),
            where(
                search.field,
                "==",
                search.value
            )
        );

        const snapshot =
            await getDocs(clientsQuery);

        for (const item of snapshot.docs) {

            if (item.id === currentId) {
                continue;
            }

            return {
                id: item.id,
                ...item.data()
            };

        }

    }

    return null;

}


// ============================================================
// MODAL DUPLICADO
// ============================================================

function openDuplicateClientModal(client) {

    duplicateClientId =
        client.id;

    const displayName =
        getClientDisplayName(client);

    if (duplicateClientName) {

        duplicateClientName.textContent =
            displayName;

    }

    if (duplicateClientWhatsapp) {

        duplicateClientWhatsapp.textContent =
            client.whatsapp || "—";

    }

    if (duplicateClientCompany) {

        duplicateClientCompany.textContent =
            client.empresa || "Sin empresa";

    }

    if (duplicateClientAdvisor) {

        duplicateClientAdvisor.textContent =
            client.asesorComercialNombre ||
            "—";

    }

    if (duplicateClientModal) {

        duplicateClientModal.classList.remove(
            "hidden"
        );

    }

}


function closeDuplicateClientModalWindow() {

    duplicateClientId = "";

    if (duplicateClientModal) {

        duplicateClientModal.classList.add(
            "hidden"
        );

    }

}


// ============================================================
// IR A GESTIONES
// ============================================================

function goToManagement(clientIdToManage) {

    if (!clientIdToManage) {
        return;
    }

    const url =
        `./gestiones.html?clienteId=${encodeURIComponent(clientIdToManage)}&nuevo=1`;

    window.location.href = url;

}


// ============================================================
// GUARDAR CLIENTE
// ============================================================

async function saveClient(event) {

    event.preventDefault();

    if (isSaving) {
        return;
    }

    hideFormMessage();

    if (!currentUserProfile) {

        showFormMessage(
            "No se ha cargado el usuario actual.",
            "error"
        );

        return;

    }


    if (!canCreateClients() && !editingClientId) {

        showFormMessage(
            "No tienes permiso para crear clientes.",
            "error"
        );

        return;

    }


    const normalizedWhatsapp =
        normalizeWhatsapp(
            whatsapp?.value
        );

    const whatsappName =
        String(
            nombreWhatsapp?.value || ""
        ).trim();


    // --------------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------------
    // Para crear o editar, basta con tener UNO de los dos
    // identificadores de WhatsApp. Si ambos están disponibles,
    // se utilizan ambos para evitar duplicados.

    if (!normalizedWhatsapp && !whatsappName) {

        showFormMessage(
            "Debes ingresar el número de WhatsApp o el usuario / nombre de WhatsApp.",
            "error"
        );

        whatsapp?.focus();

        return;

    }


    if (normalizedWhatsapp && normalizedWhatsapp.length < 7) {

        showFormMessage(
            "El número de WhatsApp no parece válido.",
            "error"
        );

        whatsapp?.focus();

        return;

    }


    setSavingState(true);


    try {

        // ----------------------------------------------------
        // BUSCAR DUPLICADO
        // ----------------------------------------------------

        const existingClient =
            await findExistingClient(
                normalizedWhatsapp,
                whatsappName,
                editingClientId
            );


        if (existingClient) {

            setSavingState(false);

            closeClientModalWindow();

            openDuplicateClientModal(
                existingClient
            );

            return;

        }


        const commonData = {

            nombre:
                String(
                    nombre?.value || ""
                ).trim(),

            empresa:
                String(
                    empresa?.value || ""
                ).trim(),

            tipoIdentificacion:
                String(
                    tipoIdentificacion?.value || ""
                ).trim(),

            identificacion:
                String(
                    identificacion?.value || ""
                ).trim(),

            telefono:
                String(
                    telefono?.value || ""
                ).trim(),

            whatsapp:
                normalizedWhatsapp,

            nombreWhatsapp:
                whatsappName,

            email:
                String(
                    email?.value || ""
                ).trim(),

            ciudad:
                String(
                    ciudad?.value || ""
                ).trim(),

            direccion:
                String(
                    direccion?.value || ""
                ).trim()

        };


        // ====================================================
        // EDITAR
        // ====================================================

        if (editingClientId) {

            await updateDoc(
                doc(
                    db,
                    "clientes",
                    editingClientId
                ),
                {
                    ...commonData,
                    updatedAt:
                        serverTimestamp()
                }
            );


            showPageMessage(
                "Cliente actualizado correctamente.",
                "success"
            );

            closeClientModalWindow();

            await loadClients();

            return;

        }


        // ====================================================
        // CREAR
        // ====================================================

        const advisorName =
            getAdvisorName(
                currentUserProfile
            );


        const newClientData = {

            ...commonData,

            asesorComercialId:
                currentUserProfile.id,

            asesorComercialNombre:
                advisorName,

            createdBy:
                currentUserProfile.id,

            createdByNombre:
                advisorName,

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        };


        const newClientRef =
            await addDoc(
                collection(
                    db,
                    "clientes"
                ),
                newClientData
            );


        // ----------------------------------------------------
        // CLIENTE CREADO
        // ----------------------------------------------------

        window.location.href =
            `./gestiones.html?clienteId=${encodeURIComponent(newClientRef.id)}&nuevo=1`;

    } catch (error) {

        console.error(
            "Error guardando cliente:",
            error
        );

        showFormMessage(
            `No se pudo guardar el cliente: ${error.message}`,
            "error"
        );

        setSavingState(false);

    }

}


// ============================================================
// EVENTOS
// ============================================================

function setupEvents() {

    // Crear cliente

    if (newClientButton) {

        newClientButton.addEventListener(
            "click",
            () => {

                if (!canCreateClients()) {

                    showPageMessage(
                        "No tienes permiso para crear clientes.",
                        "error"
                    );

                    return;

                }

                openClientModal();

            }
        );

    }


    // Actualizar

    if (refreshClientsButton) {

        refreshClientsButton.addEventListener(
            "click",
            async () => {

                hidePageMessage();

                await loadClients();

            }
        );

    }


    // Buscar

    if (searchClient) {

        searchClient.addEventListener(
            "input",
            renderClients
        );

    }


    // Formulario

    if (clientForm) {

        clientForm.addEventListener(
            "submit",
            saveClient
        );

    }


    // Cerrar modal

    if (closeClientModal) {

        closeClientModal.addEventListener(
            "click",
            closeClientModalWindow
        );

    }


    if (cancelClientButton) {

        cancelClientButton.addEventListener(
            "click",
            closeClientModalWindow
        );

    }


    // Cerrar al hacer clic fuera

    if (clientModal) {

        clientModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    clientModal
                ) {

                    closeClientModalWindow();

                }

            }
        );

    }


    // Tabla - editar

    if (clientsTableBody) {

        clientsTableBody.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-edit-client]"
                    );

                if (!button) {
                    return;
                }

                const id =
                    button.dataset.editClient;

                const client =
                    clients.find(
                        item => item.id === id
                    );

                if (!client) {
                    return;
                }

                openClientModal(client);

            }
        );

    }


    // Modal duplicado

    if (closeDuplicateModal) {

        closeDuplicateModal.addEventListener(
            "click",
            closeDuplicateClientModalWindow
        );

    }


    if (closeDuplicateButton) {

        closeDuplicateButton.addEventListener(
            "click",
            closeDuplicateClientModalWindow
        );

    }


    if (manageDuplicateButton) {

        manageDuplicateButton.addEventListener(
            "click",
            () => {

                goToManagement(
                    duplicateClientId
                );

            }
        );

    }


    if (duplicateClientModal) {

        duplicateClientModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    duplicateClientModal
                ) {

                    closeDuplicateClientModalWindow();

                }

            }
        );

    }


    // Navegación "próximamente"

    document
        .querySelectorAll(
            "[data-coming-soon]"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const moduleName =
                        item.dataset.comingSoon ||
                        "Este módulo";

                    showPageMessage(
                        `${moduleName} estará disponible próximamente.`,
                        "info"
                    );

                }
            );

        });


    // Escape para cerrar modales

    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape") {
                return;
            }

            closeClientModalWindow();
            closeDuplicateClientModalWindow();

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
// INICIALIZACIÓN
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

            renderCurrentUser();

            setupEvents();

            if (!canCreateClients()) {

                if (newClientButton) {

                    newClientButton.style.display =
                        "none";

                }

            }

            await loadClients();

        } catch (error) {

            console.error(
                "Error inicializando clientes:",
                error
            );

            showPageMessage(
                `Error inicializando la página: ${error.message}`,
                "error"
            );

            if (clientsTableBody) {

                clientsTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="table-empty">
                            Error al cargar clientes.
                        </td>
                    </tr>
                `;

            }

        }

    }
);
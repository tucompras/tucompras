// ============================================================
// USUARIOS - CRM
// Gestión de usuarios, roles, permisos y soporte
// ============================================================

import {
    initializeApp,
    getApps
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
    getFunctions,
    httpsCallable
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-functions.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    app,
    auth,
    db,
    firebaseConfig
} from "./firebase-config.js";

const functions = getFunctions(
    app,
    "us-central1"
);

const adminDeleteUser = httpsCallable(
    functions,
    "adminDeleteUser"
);


// ============================================================
// CONFIGURACIÓN
// ============================================================

const USERS_COLLECTION = "usuarios";


// ============================================================
// PERMISOS DISPONIBLES
// ============================================================

const PERMISSIONS = {

    clientes_ver: "Ver clientes",
    clientes_crear: "Crear clientes",
    clientes_editar: "Editar clientes",
    clientes_eliminar: "Eliminar clientes",

    gestiones_ver: "Ver gestiones",
    gestiones_crear: "Crear gestiones",

    tickets_ver: "Ver tickets",
    tickets_crear: "Crear tickets",
    tickets_editar: "Editar tickets",
    tickets_asignar: "Asignar tickets",

    ventas_ver: "Ver ventas",
    ventas_crear: "Crear ventas",
    ventas_editar: "Editar ventas",

    seguimientos_ver: "Ver seguimientos",
    seguimientos_crear: "Crear seguimientos",

    reportes_ver: "Ver reportes",

    chat_ver: "Usar chat",
    chat_soporte: "Chat de soporte",

    usuarios_gestionar: "Gestionar usuarios"
};


// ============================================================
// PERMISOS POR ROL
// ============================================================

const DEFAULT_PERMISSIONS = {

    administrador: {

        clientes_ver: true,
        clientes_crear: true,
        clientes_editar: true,
        clientes_eliminar: true,

        gestiones_ver: true,
        gestiones_crear: true,

        tickets_ver: true,
        tickets_crear: true,
        tickets_editar: true,
        tickets_asignar: true,

        ventas_ver: true,
        ventas_crear: true,
        ventas_editar: true,

        seguimientos_ver: true,
        seguimientos_crear: true,

        reportes_ver: true,

        chat_ver: true,
        chat_soporte: true,

        usuarios_gestionar: true
    },


    jefe_ventas_marketing: {

        clientes_ver: true,
        clientes_crear: true,
        clientes_editar: true,
        clientes_eliminar: false,

        gestiones_ver: true,
        gestiones_crear: true,

        tickets_ver: true,
        tickets_crear: true,
        tickets_editar: true,
        tickets_asignar: true,

        ventas_ver: true,
        ventas_crear: true,
        ventas_editar: true,

        seguimientos_ver: true,
        seguimientos_crear: true,

        reportes_ver: true,

        chat_ver: true,
        chat_soporte: true,

        usuarios_gestionar: true
    },


    asesor_comercial: {

        clientes_ver: true,
        clientes_crear: true,
        clientes_editar: true,
        clientes_eliminar: false,

        gestiones_ver: true,
        gestiones_crear: true,

        tickets_ver: true,
        tickets_crear: true,
        tickets_editar: false,
        tickets_asignar: false,

        ventas_ver: true,
        ventas_crear: true,
        ventas_editar: false,

        seguimientos_ver: true,
        seguimientos_crear: true,

        reportes_ver: false,

        chat_ver: true,
        chat_soporte: false,

        usuarios_gestionar: false
    },


    asesor_soporte: {

        clientes_ver: true,
        clientes_crear: false,
        clientes_editar: false,
        clientes_eliminar: false,

        gestiones_ver: true,
        gestiones_crear: true,

        tickets_ver: true,
        tickets_crear: false,
        tickets_editar: true,
        tickets_asignar: false,

        ventas_ver: false,
        ventas_crear: false,
        ventas_editar: false,

        seguimientos_ver: true,
        seguimientos_crear: true,

        reportes_ver: false,

        chat_ver: true,
        chat_soporte: true,

        usuarios_gestionar: false
    }

};


// ============================================================
// ESTADO
// ============================================================

let currentUserProfile = null;
let users = [];
let editingUserId = null;
let pendingDeleteUser = null;


// ============================================================
// FIREBASE AUTH SECUNDARIO
//
// Se utiliza para crear nuevos usuarios sin cerrar la sesión
// del administrador actual.
// ============================================================

let secondaryApp = null;
let secondaryAuth = null;


function initializeSecondaryAuth() {

    try {

        const existingApp = getApps().find(
            app => app.name === "admin-user-creator"
        );

        if (existingApp) {

            secondaryApp = existingApp;

        } else {

            secondaryApp = initializeApp(
                firebaseConfig,
                "admin-user-creator"
            );

        }

        secondaryAuth = getAuth(secondaryApp);

    } catch (error) {

        console.error(
            "Error inicializando autenticación secundaria:",
            error
        );

    }
}


// ============================================================
// ELEMENTOS DEL DOM
// ============================================================

const elements = {

    logoutButton:
        document.getElementById("logoutButton"),

    userAvatar:
        document.getElementById("userAvatar"),

    userName:
        document.getElementById("userName"),

    userRole:
        document.getElementById("userRole"),

    newUserButton:
        document.getElementById("newUserButton"),

    userSearch:
        document.getElementById("userSearch"),

    usersCount:
        document.getElementById("usersCount"),

    usersTableBody:
        document.getElementById("usersTableBody"),

    pageMessage:
        document.getElementById("pageMessage"),

    userModal:
        document.getElementById("userModal"),

    closeModalButton:
        document.getElementById("closeModalButton"),

    cancelUserButton:
        document.getElementById("cancelUserButton"),

    userForm:
        document.getElementById("userForm"),

    modalTitle:
        document.getElementById("modalTitle"),

    editingUserId:
        document.getElementById("editingUserId"),

    userNameInput:
        document.getElementById("userNameInput"),

    userEmailInput:
        document.getElementById("userEmailInput"),

    userRoleInput:
        document.getElementById("userRoleInput"),

    userStatusInput:
        document.getElementById("userStatusInput"),

    userPasswordInput:
        document.getElementById("userPasswordInput"),

    generatePasswordButton:
        document.getElementById("generatePasswordButton"),

    togglePasswordButton:
        document.getElementById("togglePasswordButton"),

    temporaryPasswordBox:
        document.getElementById("temporaryPasswordBox"),

    temporaryPassword:
        document.getElementById("temporaryPassword"),

    copyPasswordButton:
        document.getElementById("copyPasswordButton"),

    permissionsContainer:
        document.getElementById("permissionsContainer"),

    selectAllPermissions:
        document.getElementById("selectAllPermissions"),

    clearPermissions:
        document.getElementById("clearPermissions"),

    formMessage:
        document.getElementById("formMessage"),

    saveUserButton:
        document.getElementById("saveUserButton"),

    passwordSection:
        document.getElementById("passwordSection"),

    supportConfigSection:
        document.getElementById("supportConfigSection"),

    supportAvailableInput:
        document.getElementById("supportAvailableInput"),

    supportQueuePosition:
        document.getElementById("supportQueuePosition"),

    deleteUserModal:
        document.getElementById("deleteUserModal"),

    closeDeleteUserButton:
        document.getElementById("closeDeleteUserButton"),

    cancelDeleteUserButton:
        document.getElementById("cancelDeleteUserButton"),

    confirmDeleteUserButton:
        document.getElementById("confirmDeleteUserButton"),

    deleteUserName:
        document.getElementById("deleteUserName"),

    deleteUserEmail:
        document.getElementById("deleteUserEmail"),

    deleteUserMessage:
        document.getElementById("deleteUserMessage")
};


// ============================================================
// INICIO
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    initializeSecondaryAuth();

    bindEvents();

    renderPermissions();

    watchAuthentication();

});


// ============================================================
// EVENTOS
// ============================================================

function bindEvents() {

    elements.logoutButton?.addEventListener(
        "click",
        handleLogout
    );


    elements.newUserButton?.addEventListener(
        "click",
        openCreateModal
    );


    elements.closeModalButton?.addEventListener(
        "click",
        closeUserModal
    );


    elements.cancelUserButton?.addEventListener(
        "click",
        closeUserModal
    );


    elements.userForm?.addEventListener(
        "submit",
        handleUserSubmit
    );


    elements.userSearch?.addEventListener(
        "input",
        handleSearch
    );


    elements.userRoleInput?.addEventListener(
        "change",
        handleRoleChange
    );


    elements.generatePasswordButton?.addEventListener(
        "click",
        generatePassword
    );


    elements.togglePasswordButton?.addEventListener(
        "click",
        togglePasswordVisibility
    );


    elements.copyPasswordButton?.addEventListener(
        "click",
        copyTemporaryPassword
    );


    elements.selectAllPermissions?.addEventListener(
        "click",
        () => setAllPermissions(true)
    );


    elements.clearPermissions?.addEventListener(
        "click",
        () => setAllPermissions(false)
    );


    elements.supportAvailableInput?.addEventListener(
        "change",
        updateSupportAvailabilityVisual
    );


    elements.closeDeleteUserButton?.addEventListener(
        "click",
        closeDeleteUserModal
    );


    elements.cancelDeleteUserButton?.addEventListener(
        "click",
        closeDeleteUserModal
    );


    elements.confirmDeleteUserButton?.addEventListener(
        "click",
        confirmDeleteUser
    );


    elements.deleteUserModal?.addEventListener(
        "click",
        event => {

            if (event.target === elements.deleteUserModal) {
                closeDeleteUserModal();
            }

        }
    );


    elements.userModal?.addEventListener(
        "click",
        event => {

            if (event.target === elements.userModal) {

                closeUserModal();

            }

        }
    );

}


// ============================================================
// AUTENTICACIÓN
// ============================================================

function watchAuthentication() {

    onAuthStateChanged(
        auth,
        async user => {

            if (!user) {

                window.location.href = "./login.html";

                return;

            }

            try {

                const userRef = doc(
                    db,
                    USERS_COLLECTION,
                    user.uid
                );

                const userSnapshot = await getDoc(userRef);


                if (!userSnapshot.exists()) {

                    await auth.signOut();

                    window.location.href =
                        "./login.html";

                    return;

                }


                currentUserProfile =
                    userSnapshot.data();


                if (
                    currentUserProfile.estado !==
                    "activo"
                ) {

                    await auth.signOut();

                    window.location.href =
                        "./login.html";

                    return;

                }


                if (
                    currentUserProfile.rol !==
                        "administrador" &&
                    currentUserProfile.rol !==
                        "jefe_ventas_marketing"
                ) {

                    showPageMessage(
                        "No tienes permisos para administrar usuarios.",
                        "error"
                    );

                    elements.newUserButton.disabled = true;

                    return;

                }


                renderCurrentUser();

                await loadUsers();

            } catch (error) {

                console.error(
                    "Error verificando usuario:",
                    error
                );

                showPageMessage(
                    "No fue posible verificar los permisos del usuario.",
                    "error"
                );

            }

        }
    );

}


// ============================================================
// USUARIO ACTUAL
// ============================================================

function renderCurrentUser() {

    const name =
        currentUserProfile?.nombre ||
        "Usuario";


    elements.userName.textContent =
        name;


    elements.userRole.textContent =
        formatRole(
            currentUserProfile?.rol
        );


    elements.userAvatar.textContent =
        getInitials(name);

}


// ============================================================
// CARGAR USUARIOS
// ============================================================

async function loadUsers() {

    try {

        const usersRef =
            collection(
                db,
                USERS_COLLECTION
            );


        const snapshot =
            await getDocs(usersRef);


        users = snapshot.docs.map(
            document => ({

                id: document.id,

                ...document.data()

            })
        );


        users.sort(
            (a, b) =>
                String(a.nombre || "")
                    .localeCompare(
                        String(b.nombre || ""),
                        "es",
                        {
                            sensitivity: "base"
                        }
                    )
        );


        renderUsers(users);

        await syncSupportQueueConfig();

    } catch (error) {

        console.error(
            "Error cargando usuarios:",
            error
        );

        showPageMessage(
            getFriendlyFirestoreError(error),
            "error"
        );

    }

}


// ============================================================
// RENDER USUARIOS
// ============================================================

function renderUsers(list) {

    elements.usersTableBody.innerHTML = "";


    elements.usersCount.textContent =
        list.length;


    if (!list.length) {

        elements.usersTableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="empty-state"
                >

                    No hay usuarios registrados.

                </td>

            </tr>

        `;

        return;

    }


    list.forEach(user => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>

                <div class="table-user">

                    <div class="table-user-avatar">

                        ${escapeHtml(
                            getInitials(
                                user.nombre
                            )
                        )}

                    </div>

                    <div>

                        <strong>
                            ${escapeHtml(
                                user.nombre ||
                                "Sin nombre"
                            )}
                        </strong>

                    </div>

                </div>

            </td>


            <td>

                ${escapeHtml(
                    user.email || "-"
                )}

            </td>


            <td>

                <span class="role-badge">

                    ${escapeHtml(
                        formatRole(
                            user.rol
                        )
                    )}

                </span>

            </td>


            <td>

                <span class="status-badge ${
                    user.estado === "activo"
                        ? "active"
                        : "inactive"
                }">

                    ${
                        user.estado === "activo"
                            ? "● Activo"
                            : "● Inactivo"
                    }

                </span>

            </td>


            <td>

                ${renderSupportStatus(user)}

            </td>


            <td>

                <span class="permission-summary">

                    ${countPermissions(
                        user.permisos
                    )} permisos

                </span>

            </td>


            <td>

                <div class="users-table-actions">

                        <button
                            type="button"
                            class="btn btn-small btn-secondary"
                            data-action="edit"
                            data-user-id="${user.id}"
                        >
                            Editar
                        </button>

                        ${
                            user.id !== auth.currentUser?.uid
                                ? `
                                    <button
                                        type="button"
                                        class="btn btn-small btn-danger"
                                        data-action="delete"
                                        data-user-id="${user.id}"
                                    >
                                        Eliminar
                                    </button>
                                `
                                : ""
                        }

                    </div>

            </td>

        `;


        const editButton =
            row.querySelector(
                '[data-action="edit"]'
            );


        editButton?.addEventListener(
            "click",
            () => openEditModal(user.id)
        );


        const deleteButton =
            row.querySelector(
                '[data-action="delete"]'
            );

        deleteButton?.addEventListener(
            "click",
            () => openDeleteUserModal(user)
        );


        elements.usersTableBody.appendChild(
            row
        );

    });

}


// ============================================================
// ESTADO SOPORTE EN TABLA
// ============================================================

function renderSupportStatus(user) {

    if (
        user.rol !==
        "asesor_soporte"
    ) {

        return `

            <span class="support-status not-applicable">

                —

            </span>

        `;

    }


    if (
        user.estado !==
        "activo"
    ) {

        return `

            <span class="support-status unavailable">

                🔴 Inactivo

            </span>

        `;

    }


    if (
        user.recibeTickets === false
    ) {

        return `

            <span class="support-status unavailable">

                🔴 No recibe

            </span>

        `;

    }


    return `

        <span class="support-status available">

            🟢 Disponible

        </span>

    `;

}


// ============================================================
// ABRIR MODAL CREAR
// ============================================================

function openCreateModal() {

    editingUserId = null;


    elements.modalTitle.textContent =
        "Nuevo usuario";


    elements.saveUserButton.textContent =
        "Crear usuario";


    elements.userForm.reset();


    elements.editingUserId.value = "";


    elements.userStatusInput.value =
        "activo";


    elements.userRoleInput.value =
        "asesor_comercial";


    elements.userEmailInput.readOnly =
        false;


    elements.userPasswordInput.required =
        true;


    elements.passwordSection.classList.remove(
        "hidden"
    );


    elements.temporaryPasswordBox.classList.add(
        "hidden"
    );


    elements.supportAvailableInput.checked =
        true;


    handleRoleChange();


    applyRolePermissions(
        "asesor_comercial"
    );


    clearFormMessage();


    elements.userModal.classList.remove(
        "hidden"
    );


    elements.userNameInput.focus();

}


// ============================================================
// ABRIR MODAL EDITAR
// ============================================================

async function openEditModal(userId) {

    const user =
        users.find(
            item => item.id === userId
        );


    if (!user) {

        showPageMessage(
            "No se encontró el usuario.",
            "error"
        );

        return;

    }


    editingUserId = userId;


    elements.modalTitle.textContent =
        "Editar usuario";


    elements.saveUserButton.textContent =
        "Guardar cambios";


    elements.editingUserId.value =
        userId;


    elements.userNameInput.value =
        user.nombre || "";


    elements.userEmailInput.value =
        user.email || "";


    /*
     * No permitimos cambiar el correo desde
     * esta pantalla porque el correo pertenece
     * a Firebase Authentication.
     */
    elements.userEmailInput.readOnly =
        true;


    elements.userRoleInput.value =
        user.rol || "asesor_comercial";


    elements.userStatusInput.value =
        user.estado || "activo";


    elements.userPasswordInput.value =
        "";


    elements.userPasswordInput.required =
        false;


    elements.passwordSection.classList.add(
        "hidden"
    );


    elements.temporaryPasswordBox.classList.add(
        "hidden"
    );


    elements.supportAvailableInput.checked =
        user.recibeTickets !== false;


    applyExistingPermissions(
        user.permisos,
        user.rol
    );


    handleRoleChange();


    if (
        user.rol ===
        "asesor_soporte"
    ) {

        elements.supportAvailableInput.checked =
            user.recibeTickets !== false;

        elements.supportQueuePosition.textContent =
            user.ordenCola
                ? `#${user.ordenCola}`
                : "Automática";

    }


    clearFormMessage();


    elements.userModal.classList.remove(
        "hidden"
    );

}


// ============================================================
// CERRAR MODAL
// ============================================================

function closeUserModal() {

    elements.userModal.classList.add(
        "hidden"
    );

    editingUserId = null;

    clearFormMessage();

}


// ============================================================
// CAMBIO DE ROL
// ============================================================

function handleRoleChange() {

    const role =
        elements.userRoleInput.value;


    const isSupport =
        role === "asesor_soporte";


    if (isSupport) {

        elements.supportConfigSection.classList.remove(
            "hidden"
        );


        const currentUser =
            users.find(
                user =>
                    user.id ===
                    editingUserId
            );


        if (
            currentUser &&
            currentUser.ordenCola
        ) {

            elements.supportQueuePosition.textContent =
                `#${currentUser.ordenCola}`;

        } else {

            elements.supportQueuePosition.textContent =
                "Automática";

        }


        elements.supportAvailableInput.checked =
            currentUser
                ? currentUser.recibeTickets !== false
                : true;

    } else {

        elements.supportConfigSection.classList.add(
            "hidden"
        );

    }


    /*
     * Al cambiar de rol mostramos automáticamente
     * los permisos recomendados para ese rol.
     */
    if (!editingUserId) {

        applyRolePermissions(role);

    }

}


// ============================================================
// PERMISOS - RENDER
// ============================================================

function renderPermissions() {

    elements.permissionsContainer.innerHTML =
        "";


    Object.entries(PERMISSIONS)
        .forEach(
            ([key, label]) => {

                const wrapper =
                    document.createElement("label");


                wrapper.className =
                    "permission-item";


                wrapper.innerHTML = `

                    <input
                        type="checkbox"
                        value="${key}"
                        data-permission="${key}"
                    >

                    <span>
                        ${escapeHtml(label)}
                    </span>

                `;


                elements.permissionsContainer.appendChild(
                    wrapper
                );

            }
        );

}


// ============================================================
// APLICAR PERMISOS POR ROL
// ============================================================

function applyRolePermissions(role) {

    const permissions =
        DEFAULT_PERMISSIONS[role] ||
        {};


    document
        .querySelectorAll(
            "#permissionsContainer input[type='checkbox']"
        )
        .forEach(
            checkbox => {

                const permission =
                    checkbox.dataset.permission;


                checkbox.checked =
                    permissions[permission] === true;

            }
        );

}


// ============================================================
// APLICAR PERMISOS EXISTENTES
// ============================================================

function applyExistingPermissions(
    permissions,
    role
) {

    const finalPermissions =
        permissions &&
        typeof permissions === "object"
            ? permissions
            : DEFAULT_PERMISSIONS[role] || {};


    document
        .querySelectorAll(
            "#permissionsContainer input[type='checkbox']"
        )
        .forEach(
            checkbox => {

                const permission =
                    checkbox.dataset.permission;


                checkbox.checked =
                    finalPermissions[permission] === true;

            }
        );

}


// ============================================================
// TODOS / NINGUNO
// ============================================================

function setAllPermissions(value) {

    document
        .querySelectorAll(
            "#permissionsContainer input[type='checkbox']"
        )
        .forEach(
            checkbox => {

                checkbox.checked =
                    value;

            }
        );

}


// ============================================================
// OBTENER PERMISOS
// ============================================================

function getSelectedPermissions() {

    const permissions = {};


    Object.keys(PERMISSIONS)
        .forEach(
            key => {

                const checkbox =
                    document.querySelector(
                        `[data-permission="${key}"]`
                    );


                permissions[key] =
                    checkbox?.checked === true;

            }
        );


    return permissions;

}


// ============================================================
// CREAR / EDITAR USUARIO
// ============================================================

async function handleUserSubmit(event) {

    event.preventDefault();


    clearFormMessage();


    const name =
        elements.userNameInput.value.trim();


    const email =
        elements.userEmailInput.value.trim()
            .toLowerCase();


    const role =
        elements.userRoleInput.value;


    const status =
        elements.userStatusInput.value;


    const password =
        elements.userPasswordInput.value;


    if (!name) {

        showFormMessage(
            "Escribe el nombre del usuario.",
            "error"
        );

        return;

    }


    if (!email) {

        showFormMessage(
            "Escribe el correo electrónico.",
            "error"
        );

        return;

    }


    if (!role) {

        showFormMessage(
            "Selecciona un rol.",
            "error"
        );

        return;

    }


    /*
     * El jefe de ventas no puede crear
     * administradores.
     */
    if (
        currentUserProfile?.rol ===
            "jefe_ventas_marketing" &&
        role ===
            "administrador"
    ) {

        showFormMessage(
            "El jefe de ventas no puede crear administradores.",
            "error"
        );

        return;

    }


    setSavingState(true);


    try {

        if (editingUserId) {

            await updateExistingUser({
                name,
                role,
                status
            });

        } else {

            if (password.length < 6) {

                showFormMessage(
                    "La contraseña debe tener mínimo 6 caracteres.",
                    "error"
                );

                setSavingState(false);

                return;

            }


            await createNewUser({
                name,
                email,
                role,
                status,
                password
            });

        }


        await loadUsers();


        closeUserModal();


        showPageMessage(
            editingUserId
                ? "Usuario actualizado correctamente."
                : "Usuario creado correctamente.",
            "success"
        );


    } catch (error) {

        console.error(
            "ERROR GUARDANDO USUARIO:",
            error
        );


        showFormMessage(
            getFriendlyAuthError(error),
            "error"
        );

    } finally {

        setSavingState(false);

    }

}


// ============================================================
// CREAR NUEVO USUARIO
// ============================================================

async function createNewUser({
    name,
    email,
    role,
    status,
    password
}) {

    if (!secondaryAuth) {

        throw new Error(
            "No fue posible inicializar la autenticación secundaria."
        );

    }


    /*
     * Calculamos la posición de cola únicamente
     * para asesores de soporte.
     */
    let supportData = {};


    if (
        role ===
        "asesor_soporte"
    ) {

        const nextQueuePosition =
            calculateNextSupportQueuePosition();


        supportData = {

            recibeTickets:
                elements.supportAvailableInput.checked,

            ordenCola:
                nextQueuePosition

        };

    }


    /*
     * Creamos el usuario en Firebase Authentication
     * utilizando la aplicación secundaria.
     */
    const credential =
        await createUserWithEmailAndPassword(
            secondaryAuth,
            email,
            password
        );


    const uid =
        credential.user.uid;


    const permissions =
        getSelectedPermissions();


    const userData = {

        id: uid,

        nombre: name,

        email: email,

        rol: role,

        estado: status,

        permisos: permissions,

        creadoPorId:
            auth.currentUser.uid,

        creadoEn:
            serverTimestamp(),

        actualizadoEn:
            serverTimestamp(),

        ...supportData

    };


    try {

        await setDoc(
            doc(
                db,
                USERS_COLLECTION,
                uid
            ),
            userData
        );


    } catch (firestoreError) {

        /*
         * Si Firestore falla después de crear Auth,
         * intentamos cerrar la sesión secundaria.
         *
         * No borramos el usuario de Authentication
         * desde el navegador porque Firebase Web no
         * permite eliminar arbitrariamente otra cuenta.
         */
        try {

            await signOut(
                secondaryAuth
            );

        } catch (signOutError) {

            console.error(
                "Error cerrando Auth secundario:",
                signOutError
            );

        }


        throw firestoreError;

    }


    await signOut(
        secondaryAuth
    );

}


// ============================================================
// ACTUALIZAR USUARIO
// ============================================================

async function updateExistingUser({
    name,
    role,
    status
}) {

    const userRef =
        doc(
            db,
            USERS_COLLECTION,
            editingUserId
        );


    const existingSnapshot =
        await getDoc(userRef);


    if (!existingSnapshot.exists()) {

        throw new Error(
            "El usuario ya no existe."
        );

    }


    const existingUser =
        existingSnapshot.data();


    /*
     * Un jefe no puede modificar un administrador.
     */
    if (
        currentUserProfile?.rol ===
            "jefe_ventas_marketing" &&
        existingUser.rol ===
            "administrador"
    ) {

        throw new Error(
            "No tienes permiso para modificar un administrador."
        );

    }


    /*
     * Un jefe no puede convertir a alguien
     * en administrador.
     */
    if (
        currentUserProfile?.rol ===
            "jefe_ventas_marketing" &&
        role ===
            "administrador"
    ) {

        throw new Error(
            "No tienes permiso para asignar el rol administrador."
        );

    }


    const permissions =
        getSelectedPermissions();


    const updateData = {

        nombre: name,

        rol: role,

        estado: status,

        permisos: permissions,

        actualizadoEn:
            serverTimestamp()

    };


    /*
     * Si continúa siendo soporte:
     *
     * conservamos su posición de cola.
     */
    if (
        role ===
        "asesor_soporte"
    ) {

        updateData.recibeTickets =
            elements.supportAvailableInput.checked;


        updateData.ordenCola =
            existingUser.ordenCola ||
            calculateNextSupportQueuePosition();

    } else {

        /*
         * Ya no es soporte.
         */
        updateData.recibeTickets =
            false;

        updateData.ordenCola =
            null;

    }


    await updateDoc(
        userRef,
        updateData
    );

}


// ============================================================
// SINCRONIZAR COLA DE SOPORTE
// ============================================================

async function syncSupportQueueConfig() {

    /*
     * Solo el administrador actualiza la composición de la cola.
     * Los asesores comerciales únicamente consumen el siguiente
     * turno desde configuracion/soporte.
     */

    if (
        currentUserProfile?.rol !==
        "administrador"
    ) {
        return;
    }

    try {

        const supportUsers =
            users
                .filter(
                    user =>
                        user.rol === "asesor_soporte" &&
                        user.estado === "activo" &&
                        user.recibeTickets !== false
                )
                .sort(
                    (a, b) => {

                        const orderA =
                            Number(a.ordenCola || 0);

                        const orderB =
                            Number(b.ordenCola || 0);

                        if (orderA !== orderB) {
                            return orderA - orderB;
                        }

                        return String(
                            a.nombre || ""
                        ).localeCompare(
                            String(
                                b.nombre || ""
                            ),
                            "es",
                            {
                                sensitivity: "base"
                            }
                        );
                    }
                );

        const queue =
            supportUsers.map(
                user => ({
                    id:
                        user.id,

                    nombre:
                        user.nombre ||
                        "Soporte",

                    email:
                        user.email ||
                        "",

                    orden:
                        Number(user.ordenCola || 0)
                })
            );

        const queueRef =
            doc(
                db,
                "configuracion",
                "soporte"
            );

        const snapshot =
            await getDoc(queueRef);

        const previousIndex =
            snapshot.exists()
                ? Number(
                    snapshot.data()?.ultimoIndice || 0
                )
                : 0;

        const safeIndex =
            queue.length
                ? (
                    Number.isFinite(previousIndex)
                        ? Math.abs(
                            Math.trunc(previousIndex)
                        ) % queue.length
                        : 0
                )
                : 0;

        await setDoc(
            queueRef,
            {
                soportes:
                    queue,

                ultimoIndice:
                    safeIndex,

                actualizadoEn:
                    serverTimestamp()
            },
            {
                merge:
                    true
            }
        );

    } catch (error) {

        console.error(
            "Error sincronizando la cola de soporte:",
            error
        );
    }
}


// ============================================================
// POSICIÓN DE COLA
// ============================================================

function calculateNextSupportQueuePosition() {

    const supportUsers =
        users.filter(
            user =>
                user.rol ===
                "asesor_soporte"
        );


    if (!supportUsers.length) {

        return 1;

    }


    let maxPosition = 0;


    supportUsers.forEach(
        user => {

            const position =
                Number(
                    user.ordenCola || 0
                );


            if (
                position >
                maxPosition
            ) {

                maxPosition =
                    position;

            }

        }
    );


    return maxPosition + 1;

}


// ============================================================
// GENERAR CONTRASEÑA
// ============================================================

function generatePassword() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";


    let password = "";


    for (
        let index = 0;
        index < 10;
        index++
    ) {

        password +=
            chars.charAt(
                Math.floor(
                    Math.random() *
                    chars.length
                )
            );

    }


    elements.userPasswordInput.value =
        password;


    elements.userPasswordInput.type =
        "text";


    elements.togglePasswordButton.textContent =
        "Ocultar";


    elements.temporaryPassword.textContent =
        password;


    elements.temporaryPasswordBox.classList.remove(
        "hidden"
    );

}


// ============================================================
// MOSTRAR / OCULTAR PASSWORD
// ============================================================

function togglePasswordVisibility() {

    const input =
        elements.userPasswordInput;


    if (
        input.type ===
        "password"
    ) {

        input.type =
            "text";

        elements.togglePasswordButton.textContent =
            "Ocultar";

    } else {

        input.type =
            "password";

        elements.togglePasswordButton.textContent =
            "Mostrar";

    }

}


// ============================================================
// COPIAR PASSWORD
// ============================================================

async function copyTemporaryPassword() {

    const password =
        elements.temporaryPassword.textContent;


    if (!password) {

        return;

    }


    try {

        await navigator.clipboard.writeText(
            password
        );


        elements.copyPasswordButton.textContent =
            "Copiado";


        setTimeout(
            () => {

                elements.copyPasswordButton.textContent =
                    "Copiar";

            },
            1500
        );


    } catch (error) {

        console.error(
            "No fue posible copiar:",
            error
        );

    }

}


// ============================================================
// DISPONIBILIDAD SOPORTE
// ============================================================

function updateSupportAvailabilityVisual() {

    if (
        elements.userRoleInput.value !==
        "asesor_soporte"
    ) {

        return;

    }


    /*
     * Por ahora solamente actualizamos
     * el estado visual.
     *
     * El guardado real se realiza al pulsar
     * "Guardar cambios".
     */
    if (
        elements.supportAvailableInput.checked
    ) {

        elements.supportQueuePosition.title =
            "Participará en la cola de tickets";

    } else {

        elements.supportQueuePosition.title =
            "No recibirá tickets mientras esté desactivado";

    }

}


// ============================================================
// ELIMINAR USUARIO
// ============================================================

function openDeleteUserModal(user) {

    if (!user) {
        return;
    }

    if (user.id === auth.currentUser?.uid) {
        showPageMessage(
            "No puedes eliminar la cuenta con la que estás administrando el CRM.",
            "error"
        );
        return;
    }

    pendingDeleteUser = user;

    if (elements.deleteUserName) {
        elements.deleteUserName.textContent =
            user.nombre || "Sin nombre";
    }

    if (elements.deleteUserEmail) {
        elements.deleteUserEmail.textContent =
            user.email || "Sin correo";
    }

    clearDeleteUserMessage();

    if (elements.confirmDeleteUserButton) {
        elements.confirmDeleteUserButton.disabled = false;
        elements.confirmDeleteUserButton.textContent =
            "Eliminar usuario";
    }

    elements.deleteUserModal?.classList.remove("hidden");
}


function closeDeleteUserModal() {

    pendingDeleteUser = null;

    clearDeleteUserMessage();

    elements.deleteUserModal?.classList.add("hidden");
}


function showDeleteUserMessage(message) {

    if (!elements.deleteUserMessage) {
        return;
    }

    elements.deleteUserMessage.textContent = message;
    elements.deleteUserMessage.className =
        "delete-user-message error";
}


function clearDeleteUserMessage() {

    if (!elements.deleteUserMessage) {
        return;
    }

    elements.deleteUserMessage.textContent = "";
    elements.deleteUserMessage.className =
        "delete-user-message";
}


async function confirmDeleteUser() {

    if (!pendingDeleteUser) {
        return;
    }

    if (pendingDeleteUser.id === auth.currentUser?.uid) {
        showDeleteUserMessage(
            "No puedes eliminar la cuenta actualmente conectada."
        );
        return;
    }

    const targetUser = pendingDeleteUser;
    const button = elements.confirmDeleteUserButton;

    if (button) {
        button.disabled = true;
        button.textContent = "Eliminando...";
    }

    clearDeleteUserMessage();

    try {

        await adminDeleteUser({
            targetUid: targetUser.id
        });

        closeDeleteUserModal();

        showPageMessage(
            `El usuario ${targetUser.nombre || targetUser.email || "seleccionado"} fue eliminado correctamente.`,
            "success"
        );

        await loadUsers();

    } catch (error) {

        console.error(
            "Error eliminando usuario:",
            error
        );

        showDeleteUserMessage(
            getFriendlyDeleteUserError(error)
        );

        if (button) {
            button.disabled = false;
            button.textContent = "Eliminar usuario";
        }

    }

}


function getFriendlyDeleteUserError(error) {

    const code = error?.code || "";

    if (code.includes("permission-denied")) {
        return "Firebase rechazó la operación. Solo un administrador activo puede eliminar usuarios.";
    }

    if (code.includes("failed-precondition")) {
        return error.message || "No se puede eliminar este usuario desde esta sesión.";
    }

    if (code.includes("not-found")) {
        return "El usuario ya no existe o fue eliminado anteriormente.";
    }

    if (code.includes("unavailable")) {
        return "El servicio de administración no está disponible. Verifica que la función esté desplegada.";
    }

    return error?.message ||
        "No fue posible eliminar el usuario.";
}


// ============================================================
// BÚSQUEDA
// ============================================================

function handleSearch() {

    const search =
        elements.userSearch.value
            .trim()
            .toLowerCase();


    if (!search) {

        renderUsers(users);

        return;

    }


    const filtered =
        users.filter(
            user => {

                const name =
                    String(
                        user.nombre || ""
                    ).toLowerCase();


                const email =
                    String(
                        user.email || ""
                    ).toLowerCase();


                const role =
                    String(
                        user.rol || ""
                    ).toLowerCase();


                return (
                    name.includes(search) ||
                    email.includes(search) ||
                    role.includes(search)
                );

            }
        );


    renderUsers(filtered);

}


// ============================================================
// LOGOUT
// ============================================================

async function handleLogout() {

    try {

        await auth.signOut();

        window.location.href =
            "./login.html";

    } catch (error) {

        console.error(
            "Error cerrando sesión:",
            error
        );

    }

}


// ============================================================
// ESTADO DE GUARDADO
// ============================================================

function setSavingState(isSaving) {

    elements.saveUserButton.disabled =
        isSaving;


    if (isSaving) {

        elements.saveUserButton.textContent =
            "Guardando...";

    } else {

        elements.saveUserButton.textContent =
            editingUserId
                ? "Guardar cambios"
                : "Crear usuario";

    }

}


// ============================================================
// MENSAJES
// ============================================================

function showPageMessage(
    message,
    type = "info"
) {

    elements.pageMessage.textContent =
        message;


    elements.pageMessage.className =
        `page-message ${type}`;

}


function showFormMessage(
    message,
    type = "error"
) {

    elements.formMessage.textContent =
        message;


    elements.formMessage.className =
        `form-message ${type}`;

}


function clearFormMessage() {

    elements.formMessage.textContent =
        "";

    elements.formMessage.className =
        "form-message";

}


// ============================================================
// UTILIDADES
// ============================================================

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


    return (
        roles[role] ||
        role ||
        "Sin rol"
    );

}


function getInitials(name) {

    if (!name) {

        return "US";

    }


    const parts =
        String(name)
            .trim()
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


function countPermissions(
    permissions
) {

    if (
        !permissions ||
        typeof permissions !== "object"
    ) {

        return 0;

    }


    return Object.values(
        permissions
    ).filter(
        value => value === true
    ).length;

}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ============================================================
// ERRORES FIREBASE
// ============================================================

function getFriendlyAuthError(error) {

    if (!error) {

        return "Ocurrió un error inesperado.";

    }


    const code =
        error.code || "";


    const messages = {

        "auth/email-already-in-use":
            "Ese correo ya está registrado en Firebase Authentication.",

        "auth/invalid-email":
            "El correo electrónico no es válido.",

        "auth/weak-password":
            "La contraseña es demasiado débil.",

        "auth/network-request-failed":
            "No hay conexión con Firebase.",

        "auth/operation-not-allowed":
            "El acceso por correo y contraseña no está habilitado en Firebase.",

        "permission-denied":
            "Firebase rechazó la operación por permisos de seguridad."

    };


    return (
        messages[code] ||
        error.message ||
        "No fue posible guardar el usuario."
    );

}


function getFriendlyFirestoreError(error) {

    if (!error) {

        return "No fue posible cargar los usuarios.";

    }


    if (
        error.code ===
        "permission-denied"
    ) {

        return (
            "Firebase rechazó la consulta. " +
            "Revisa las reglas de Firestore y los permisos del usuario."
        );

    }


    if (
        error.code ===
        "unavailable"
    ) {

        return (
            "Firebase no está disponible temporalmente. " +
            "Revisa tu conexión."
        );

    }


    return (
        error.message ||
        "No fue posible cargar los usuarios."
    );

}
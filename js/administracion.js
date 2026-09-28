import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-functions.js";
import { auth, db, app } from "./firebase-config.js";

const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const userAvatar = document.getElementById("userAvatar");
const logoutButton = document.getElementById("logoutButton");
const pageMessage = document.getElementById("pageMessage");
const refreshDataButton = document.getElementById("refreshDataButton");
const adminSearch = document.getElementById("adminSearch");
const tableHint = document.getElementById("tableHint");
const adminTableHead = document.getElementById("adminTableHead");
const adminTableBody = document.getElementById("adminTableBody");
const passwordUsersBody = document.getElementById("passwordUsersBody");
const clientsCount = document.getElementById("clientsCount");
const ticketsCount = document.getElementById("ticketsCount");
const gestionesCount = document.getElementById("gestionesCount");
const usersCount = document.getElementById("usersCount");
const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmText = document.getElementById("confirmText");
const confirmActionButton = document.getElementById("confirmActionButton");
const passwordModal = document.getElementById("passwordModal");
const passwordTargetText = document.getElementById("passwordTargetText");
const passwordForm = document.getElementById("passwordForm");
const newPasswordInput = document.getElementById("newPasswordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");
const passwordFormMessage = document.getElementById("passwordFormMessage");
const savePasswordButton = document.getElementById("savePasswordButton");
const toggleNewPassword = document.getElementById("toggleNewPassword");

let currentUserProfile = null;
let currentTab = "clientes";
let datasets = { clientes: [], tickets: [], gestiones: [], usuarios: [] };
let pendingDelete = null;
let passwordTarget = null;

const functions = getFunctions(app, "us-central1");
const adminSetUserPassword = httpsCallable(functions, "adminSetUserPassword");

function esc(value = "") {
    return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[c]));
}

function showPageMessage(message, type = "error") {
    pageMessage.textContent = message;
    pageMessage.className = `page-message show ${type}`;
    clearTimeout(showPageMessage.timer);
    showPageMessage.timer = setTimeout(() => pageMessage.classList.remove("show"), 5000);
}

function showPasswordMessage(message, type = "error") {
    passwordFormMessage.textContent = message;
    passwordFormMessage.className = `form-message show ${type}`;
}

function clearPasswordMessage() {
    passwordFormMessage.textContent = "";
    passwordFormMessage.className = "form-message";
}

function initials(name = "AD") {
    return name.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "AD";
}

function formatRole(role = "") {
    return ({
        administrador: "Administrador",
        jefe_ventas_marketing: "Jefe de ventas y marketing",
        asesor_comercial: "Asesor comercial",
        asesor_soporte: "Asesor de soporte"
    })[role] || role || "Sin rol";
}

function formatDate(value) {
    if (!value) return "—";
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(date);
}

async function requireAdmin(user) {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (!snap.exists()) throw new Error("No existe el perfil del usuario.");
    const profile = { id: snap.id, ...snap.data() };
    if (profile.rol !== "administrador") throw new Error("Esta sección es exclusiva del administrador.");
    if (profile.estado && profile.estado !== "activo") throw new Error("El usuario administrador está inactivo.");
    return profile;
}

function renderHeader() {
    userName.textContent = currentUserProfile.nombre || currentUserProfile.email || "Administrador";
    userRole.textContent = formatRole(currentUserProfile.rol);
    userAvatar.textContent = initials(currentUserProfile.nombre || currentUserProfile.email);
}

async function loadDatasets() {
    const [clientesSnap, ticketsSnap, gestionesSnap, usuariosSnap] = await Promise.all([
        getDocs(collection(db, "clientes")),
        getDocs(collection(db, "tickets")),
        getDocs(collection(db, "gestiones")),
        getDocs(collection(db, "usuarios"))
    ]);

    datasets.clientes = clientesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    datasets.tickets = ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    datasets.gestiones = gestionesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    datasets.usuarios = usuariosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    clientsCount.textContent = datasets.clientes.length;
    ticketsCount.textContent = datasets.tickets.filter(x => x.eliminado !== true).length;
    gestionesCount.textContent = datasets.gestiones.length;
    usersCount.textContent = datasets.usuarios.length;

    renderCurrentTab();
    renderPasswordUsers();
}

function setTableHead(columns) {
    adminTableHead.innerHTML = `<tr>${columns.map(x => `<th>${x}</th>`).join("")}<th class="actions-column">Acción</th></tr>`;
}

function renderCurrentTab() {
    const term = adminSearch.value.trim().toLowerCase();
    tableHint.textContent = `Mostrando ${currentTab}`;

    if (currentTab === "clientes") renderClientes(term);
    if (currentTab === "tickets") renderTickets(term);
    if (currentTab === "gestiones") renderGestiones(term);
    if (currentTab === "usuarios") renderUsuarios(term);
}

function filterText(text, term) { return !term || text.toLowerCase().includes(term); }

function renderClientes(term) {
    setTableHead(["Cliente", "WhatsApp", "Empresa", "Ciudad", "Asesor creador"]);
    const rows = datasets.clientes.filter(c => filterText(`${c.nombre || ""} ${c.nombreWhatsapp || ""} ${c.whatsapp || ""} ${c.empresa || ""} ${c.ciudad || ""}`, term));
    if (!rows.length) return emptyTable("No hay clientes para mostrar.");
    adminTableBody.innerHTML = rows.map(c => `
        <tr>
            <td><span class="table-primary">${esc(c.nombre || c.nombreWhatsapp || "Sin nombre")}</span><span class="table-secondary">ID: ${esc(c.id)}</span></td>
            <td>${esc(c.whatsapp || "—")}</td>
            <td>${esc(c.empresa || "—")}</td>
            <td>${esc(c.ciudad || "—")}</td>
            <td>${esc(c.asesorComercialNombre || c.createdByNombre || "—")}</td>
            <td><div class="action-group"><button class="btn-small danger" data-delete-type="clientes" data-id="${esc(c.id)}">Eliminar</button></div></td>
        </tr>`).join("");
}

function renderTickets(term) {
    setTableHead(["Ticket", "Cliente", "Título", "Prioridad", "Estado", "Creado por"]);
    const rows = datasets.tickets.filter(t => t.eliminado !== true && filterText(`${t.numero || ""} ${t.clienteNombre || ""} ${t.titulo || ""} ${t.prioridad || ""} ${t.estado || ""}`, term));
    if (!rows.length) return emptyTable("No hay tickets para mostrar.");
    adminTableBody.innerHTML = rows.map(t => `
        <tr>
            <td><span class="table-primary">${esc(t.numero || t.id)}</span><span class="table-secondary">${esc(formatDate(t.createdAt))}</span></td>
            <td>${esc(t.clienteNombre || "—")}</td>
            <td>${esc(t.titulo || "—")}</td>
            <td><span class="role-pill">${esc(t.prioridad || "—")}</span></td>
            <td><span class="status-pill ${t.estado === "cerrado" ? "inactive" : "active"}">${esc(t.estado || "—")}</span></td>
            <td>${esc(t.creadoPorNombre || "—")}</td>
            <td><div class="action-group"><button class="btn-small danger" data-delete-type="tickets" data-id="${esc(t.id)}">Eliminar</button></div></td>
        </tr>`).join("");
}

function renderGestiones(term) {
    setTableHead(["Fecha", "Cliente", "Asesor", "Tipo", "Resultado", "Descripción"]);
    const rows = datasets.gestiones.filter(g => filterText(`${g.clienteNombre || ""} ${g.usuarioNombre || ""} ${g.tipo || ""} ${g.resultado || ""} ${g.descripcion || ""}`, term));
    if (!rows.length) return emptyTable("No hay gestiones para mostrar.");
    rows.sort((a,b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    adminTableBody.innerHTML = rows.map(g => `
        <tr>
            <td>${esc(formatDate(g.fecha))}</td>
            <td><span class="table-primary">${esc(g.clienteNombre || "—")}</span><span class="table-secondary">${esc(g.clienteEmpresa || "")}</span></td>
            <td>${esc(g.usuarioNombre || "—")}</td>
            <td><span class="role-pill">${esc(g.tipo || "—")}</span></td>
            <td><span class="status-pill active">${esc(g.resultado || "—")}</span></td>
            <td>${esc(g.descripcion || "—")}</td>
            <td><div class="action-group"><button class="btn-small danger" data-delete-type="gestiones" data-id="${esc(g.id)}">Eliminar</button></div></td>
        </tr>`).join("");
}

function renderUsuarios(term) {
    setTableHead(["Usuario", "Correo", "Rol", "Estado", "Creado"]);
    const rows = datasets.usuarios.filter(u => filterText(`${u.nombre || ""} ${u.email || ""} ${u.rol || ""}`, term));
    if (!rows.length) return emptyTable("No hay usuarios para mostrar.");
    adminTableBody.innerHTML = rows.map(u => `
        <tr>
            <td><span class="table-primary">${esc(u.nombre || "Sin nombre")}</span><span class="table-secondary">${esc(u.id)}</span></td>
            <td>${esc(u.email || "—")}</td>
            <td><span class="role-pill">${esc(formatRole(u.rol))}</span></td>
            <td><span class="status-pill ${u.estado === "activo" ? "active" : "inactive"}">${esc(u.estado || "—")}</span></td>
            <td>${esc(formatDate(u.creadoEn))}</td>
            <td><div class="action-group"><button class="btn-small password" data-password-id="${esc(u.id)}">Cambiar contraseña</button></div></td>
        </tr>`).join("");
}

function emptyTable(message) {
    adminTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">${esc(message)}</td></tr>`;
}

function renderPasswordUsers() {
    const rows = datasets.usuarios;
    if (!rows.length) {
        passwordUsersBody.innerHTML = `<tr><td colspan="5" class="table-empty">No hay usuarios.</td></tr>`;
        return;
    }
    passwordUsersBody.innerHTML = rows.map(u => `
        <tr>
            <td><span class="table-primary">${esc(u.nombre || "Sin nombre")}</span></td>
            <td>${esc(u.email || "—")}</td>
            <td><span class="role-pill">${esc(formatRole(u.rol))}</span></td>
            <td><span class="status-pill ${u.estado === "activo" ? "active" : "inactive"}">${esc(u.estado || "—")}</span></td>
            <td><div class="action-group"><button class="btn-small password" data-password-id="${esc(u.id)}">Nueva contraseña</button></div></td>
        </tr>`).join("");
}

function openConfirm(type, id) {
    const record = datasets[type].find(x => x.id === id);
    if (!record) return;
    pendingDelete = { type, id };
    const labels = { clientes: "cliente", tickets: "ticket", gestiones: "gestión" };
    const label = labels[type] || "registro";
    const name = record.numero || record.nombre || record.nombreWhatsapp || record.clienteNombre || record.titulo || id;
    confirmTitle.textContent = `Eliminar ${label}`;
    confirmText.textContent = `Vas a eliminar ${label} "${name}". Esta acción no se puede deshacer desde el CRM.`;
    confirmActionButton.textContent = "Eliminar";
    confirmModal.classList.remove("hidden");
}

async function deleteRecord() {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    confirmActionButton.disabled = true;
    confirmActionButton.textContent = "Eliminando...";
    try {
        if (type === "tickets") {
            // El borrado del historial de tickets se hace desde el backend administrativo.
            const deleteTicket = httpsCallable(functions, "adminDeleteTicket");
            await deleteTicket({ ticketId: id });
        } else {
            await deleteDoc(doc(db, type, id));
        }
        confirmModal.classList.add("hidden");
        pendingDelete = null;
        showPageMessage("Registro eliminado correctamente.", "success");
        await loadDatasets();
    } catch (error) {
        console.error("Error eliminando registro:", error);
        showPageMessage(`No fue posible eliminar el registro: ${error.message || "error desconocido"}`);
    } finally {
        confirmActionButton.disabled = false;
        confirmActionButton.textContent = "Eliminar";
    }
}

function openPasswordModal(user) {
    passwordTarget = user;
    passwordTargetText.textContent = `${user.nombre || "Usuario"} · ${user.email || "Sin correo"}`;
    newPasswordInput.value = "";
    confirmPasswordInput.value = "";
    clearPasswordMessage();
    passwordModal.classList.remove("hidden");
    newPasswordInput.focus();
}

async function changePassword(event) {
    event.preventDefault();
    if (!passwordTarget) return;
    const password = newPasswordInput.value;
    const confirmation = confirmPasswordInput.value;
    if (password.length < 8) return showPasswordMessage("La contraseña debe tener mínimo 8 caracteres.");
    if (password !== confirmation) return showPasswordMessage("Las contraseñas no coinciden.");

    savePasswordButton.disabled = true;
    savePasswordButton.textContent = "Guardando...";
    try {
        await adminSetUserPassword({ targetUid: passwordTarget.id, newPassword: password });
        showPasswordMessage("Contraseña cambiada correctamente.", "success");
        showPageMessage(`Contraseña de ${passwordTarget.nombre || passwordTarget.email} actualizada.`, "success");
        setTimeout(() => passwordModal.classList.add("hidden"), 900);
    } catch (error) {
        console.error("Error cambiando contraseña:", error);
        const message = error?.message || "No fue posible cambiar la contraseña.";
        showPasswordMessage(message);
    } finally {
        savePasswordButton.disabled = false;
        savePasswordButton.textContent = "Cambiar contraseña";
    }
}

function setupEvents() {
    refreshDataButton.addEventListener("click", loadDatasets);
    adminSearch.addEventListener("input", renderCurrentTab);
    confirmActionButton.addEventListener("click", deleteRecord);
    passwordForm.addEventListener("submit", changePassword);
    toggleNewPassword.addEventListener("click", () => {
        const show = newPasswordInput.type === "password";
        newPasswordInput.type = show ? "text" : "password";
        toggleNewPassword.textContent = show ? "Ocultar" : "Mostrar";
    });

    document.querySelectorAll(".admin-tab").forEach(button => {
        button.addEventListener("click", () => {
            currentTab = button.dataset.tab;
            document.querySelectorAll(".admin-tab").forEach(x => x.classList.remove("active"));
            button.classList.add("active");
            adminSearch.value = "";
            renderCurrentTab();
        });
    });

    document.addEventListener("click", event => {
        const deleteButton = event.target.closest("[data-delete-type]");
        if (deleteButton) openConfirm(deleteButton.dataset.deleteType, deleteButton.dataset.id);
        const passwordButton = event.target.closest("[data-password-id]");
        if (passwordButton) {
            const user = datasets.usuarios.find(x => x.id === passwordButton.dataset.passwordId);
            if (user) openPasswordModal(user);
        }
        const closeButton = event.target.closest("[data-close-modal]");
        if (closeButton) document.getElementById(closeButton.dataset.closeModal)?.classList.add("hidden");
    });

    [confirmModal, passwordModal].forEach(modal => modal.addEventListener("click", event => {
        if (event.target === modal) modal.classList.add("hidden");
    }));

    logoutButton.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "./login.html";
    });
}

onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "./login.html";
        return;
    }
    try {
        currentUserProfile = await requireAdmin(user);
        renderHeader();
        setupEvents();
        await loadDatasets();
    } catch (error) {
        console.error(error);
        document.body.innerHTML = `<div style="padding:40px;font-family:Arial"><h2>Acceso denegado</h2><p>${esc(error.message)}</p><a href="./dashboard.html">Volver al CRM</a></div>`;
    }
});

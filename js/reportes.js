import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

let currentUserProfile = null;
let advisors = [];
let gestiones = [];
let filteredGestiones = [];
let charts = {};

const $ = id => document.getElementById(id);
const pageMessage = $("pageMessage");
const userName = $("userName");
const userRole = $("userRole");
const userAvatar = $("userAvatar");
const userNameTop = $("userNameTop");
const userRoleTop = $("userRoleTop");
const userAvatarTop = $("userAvatarTop");
const advisorFilter = $("advisorFilter");
const typeFilter = $("typeFilter");
const resultFilter = $("resultFilter");
const dateFrom = $("dateFrom");
const dateTo = $("dateTo");
const searchFilter = $("searchFilter");
const reportTableBody = $("reportTableBody");
const advisorCards = $("advisorCards");
const advisorChartHint = $("advisorChartHint");

const ROLE_LABELS = {
    asesor_comercial: "Asesor comercial",
    asesor_soporte: "Asesor de soporte"
};

function roleLabel(role) {
    return ROLE_LABELS[role] || role || "Usuario";
}

function initials(value = "U") {
    const parts = String(value || "U").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    return parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : (parts[0][0] + parts.at(-1)[0]).toUpperCase();
}

function escapeHtml(value = "") {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function toDate(value) {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    if (value instanceof Date) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function localYmd(value) {
    const d = toDate(value);
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatDate(value) {
    const d = toDate(value);
    if (!d) return "—";
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function formatDateOnly(value) {
    const d = toDate(value);
    if (!d) return "—";
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "short" }).format(d);
}

function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase();
}

function compareNames(a, b) {
    const aName = advisorName(a);
    const bName = advisorName(b);
    return aName.localeCompare(bName, "es", { sensitivity: "base" });
}

function advisorName(advisor) {
    return advisor?.nombre || advisor?.email || "Asesor sin nombre";
}

function isAdvisorProfile(profile) {
    return profile?.rol === "asesor_comercial" || profile?.rol === "asesor_soporte";
}

function showMessage(message, type = "error") {
    pageMessage.textContent = message;
    pageMessage.className = `page-message ${type}`;
}

function hideMessage() {
    pageMessage.textContent = "";
    pageMessage.className = "page-message hidden";
}

function localDateInputNow() {
    return localYmd(new Date());
}

function daysAgoInput(days) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - days);
    return localYmd(d);
}

function firstDayOfMonthInput() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return localYmd(d);
}

async function requireAdmin(user) {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (!snap.exists()) throw new Error("No existe el perfil del usuario.");

    const profile = { id: snap.id, ...snap.data() };

    if (profile.rol !== "administrador") {
        throw new Error("Esta sección es exclusiva del administrador.");
    }

    if (profile.estado && profile.estado !== "activo") {
        throw new Error("El usuario administrador está inactivo.");
    }

    return profile;
}

function renderCurrentUser() {
    const name = currentUserProfile?.nombre || currentUserProfile?.email || "Administrador";
    const role = "Administrador";
    const avatar = initials(name);

    [userName, userNameTop].forEach(el => {
        if (el) el.textContent = name;
    });

    [userRole, userRoleTop].forEach(el => {
        if (el) el.textContent = role;
    });

    [userAvatar, userAvatarTop].forEach(el => {
        if (el) el.textContent = avatar;
    });
}

async function loadData() {
    hideMessage();

    const [usersSnap, gestionesSnap] = await Promise.all([
        getDocs(collection(db, "usuarios")),
        getDocs(collection(db, "gestiones"))
    ]);

    advisors = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(isAdvisorProfile)
        .sort(compareNames);

    gestiones = gestionesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    populateFilters();
    applyFilters();
}

function uniqueSorted(values) {
    const map = new Map();
    values.forEach(value => {
        const text = String(value ?? "").trim();
        if (text) map.set(text, text);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

function populateFilters() {
    const currentAdvisor = advisorFilter.value;
    const currentType = typeFilter.value;
    const currentResult = resultFilter.value;

    advisorFilter.innerHTML =
        `<option value="">Todos los asesores</option>` +
        advisors.map(advisor =>
            `<option value="${escapeHtml(advisor.id)}">${escapeHtml(advisorName(advisor))} · ${escapeHtml(roleLabel(advisor.rol))}</option>`
        ).join("");

    if (advisors.some(advisor => advisor.id === currentAdvisor)) {
        advisorFilter.value = currentAdvisor;
    }

    const types = uniqueSorted(gestiones.map(g => g.tipo));
    const results = uniqueSorted(gestiones.map(g => g.resultado));

    typeFilter.innerHTML = `<option value="">Todos los tipos</option>` +
        types.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");

    resultFilter.innerHTML = `<option value="">Todos los resultados</option>` +
        results.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");

    if (types.includes(currentType)) typeFilter.value = currentType;
    if (results.includes(currentResult)) resultFilter.value = currentResult;
}

function applyFilters() {
    const from = dateFrom.value;
    const to = dateTo.value;
    const selectedAdvisor = advisorFilter.value;
    const selectedType = typeFilter.value;
    const selectedResult = resultFilter.value;
    const search = normalizeText(searchFilter.value);

    filteredGestiones = gestiones.filter(gestion => {
        const date = toDate(gestion.fecha || gestion.createdAt);
        const day = localYmd(date);

        if (from && (!day || day < from)) return false;
        if (to && (!day || day > to)) return false;
        if (selectedAdvisor && gestion.usuarioId !== selectedAdvisor) return false;
        if (selectedType && gestion.tipo !== selectedType) return false;
        if (selectedResult && gestion.resultado !== selectedResult) return false;

        if (search) {
            const haystack = [
                gestion.clienteNombre,
                gestion.clienteEmpresa,
                gestion.usuarioNombre,
                gestion.tipo,
                gestion.resultado,
                gestion.descripcion,
                gestion.recordatorio
            ].filter(Boolean).join(" ").toLowerCase();

            if (!haystack.includes(search)) return false;
        }

        return true;
    }).sort((a, b) =>
        (toDate(b.fecha || b.createdAt)?.getTime() || 0) -
        (toDate(a.fecha || a.createdAt)?.getTime() || 0)
    );

    renderSummary();
    renderCharts();
    renderAdvisorCards();
    renderTable();
}

function advisorLookup() {
    return new Map(advisors.map(advisor => [advisor.id, advisor]));
}

function groupCount(items, getter) {
    const counts = new Map();
    items.forEach(item => {
        const raw = getter(item);
        const key = raw ? String(raw) : "Sin dato";
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function renderSummary() {
    const total = filteredGestiones.length;
    const advisorIds = new Set(filteredGestiones.map(g => g.usuarioId).filter(Boolean));
    const clientKeys = new Set(
        filteredGestiones
            .map(g => `${g.clienteId || ""}|${normalizeText(g.clienteNombre)}`)
            .filter(Boolean)
    );
    const followups = filteredGestiones.filter(g => g.proximoSeguimiento).length;

    $("kpiTotal").textContent = total;
    $("kpiAdvisors").textContent = advisorIds.size;
    $("kpiClients").textContent = clientKeys.size;
    $("kpiFollowups").textContent = followups;

    $("kpiTotalHint").textContent = `${dateFrom.value || "Sin inicio"} → ${dateTo.value || "Sin fin"}`;
    $("tableCount").textContent = `${total} ${total === 1 ? "registro" : "registros"}`;
    $("detailCount").textContent = `${advisors.length} ${advisors.length === 1 ? "asesor registrado" : "asesores registrados"}`;

    const selectedAdvisor = advisorFilter.selectedOptions?.[0]?.textContent || "Todos los asesores";
    advisorChartHint.textContent = selectedAdvisor;
}

function chartPalette(size) {
    const palette = [
        "#2563eb", "#0f766e", "#7c3aed", "#c2410c", "#be123c",
        "#0f172a", "#047857", "#a16207", "#475569", "#6d28d9"
    ];
    return Array.from({ length: size }, (_, i) => palette[i % palette.length]);
}

function destroyChart(key) {
    if (charts[key]) {
        charts[key].destroy();
        delete charts[key];
    }
}

function renderCharts() {
    if (typeof Chart === "undefined") {
        showMessage("No se pudo cargar el motor de gráficos. Verifica la conexión a internet.");
        return;
    }

    const lookup = advisorLookup();
    const advisorsForChart = advisors.map(advisor => {
        const total = filteredGestiones.filter(g => g.usuarioId === advisor.id).length;
        return { advisor, total };
    }).sort((a, b) => b.total - a.total || compareNames(a.advisor, b.advisor));

    const typeGroups = groupCount(filteredGestiones, g => g.tipo || "Sin tipo");
    const resultGroups = groupCount(filteredGestiones, g => g.resultado || "Sin resultado");

    const dailyMap = new Map();
    filteredGestiones.forEach(gestion => {
        const day = localYmd(gestion.fecha || gestion.createdAt);
        if (day) dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    });
    const daily = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    destroyChart("advisor");
    destroyChart("type");
    destroyChart("result");
    destroyChart("trend");

    charts.advisor = new Chart($("advisorChart"), {
        type: "bar",
        data: {
            labels: advisorsForChart.map(x => advisorName(x.advisor)),
            datasets: [{
                label: "Gestiones",
                data: advisorsForChart.map(x => x.total),
                backgroundColor: "#2563eb",
                borderRadius: 8,
                maxBarThickness: 48
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
                x: { grid: { display: false } }
            }
        }
    });

    charts.type = new Chart($("typeChart"), {
        type: "doughnut",
        data: {
            labels: typeGroups.map(x => x[0]),
            datasets: [{
                data: typeGroups.map(x => x[1]),
                backgroundColor: chartPalette(typeGroups.length),
                borderWidth: 2,
                borderColor: "#ffffff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom" } }
        }
    });

    charts.result = new Chart($("resultChart"), {
        type: "doughnut",
        data: {
            labels: resultGroups.map(x => x[0]),
            datasets: [{
                data: resultGroups.map(x => x[1]),
                backgroundColor: chartPalette(resultGroups.length),
                borderWidth: 2,
                borderColor: "#ffffff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom" } }
        }
    });

    charts.trend = new Chart($("trendChart"), {
        type: "line",
        data: {
            labels: daily.map(x => x[0]),
            datasets: [{
                label: "Gestiones",
                data: daily.map(x => x[1]),
                borderColor: "#2563eb",
                backgroundColor: "rgba(37,99,235,.12)",
                fill: true,
                tension: .28,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
                x: { grid: { display: false } }
            }
        }
    });
}

function buildAdvisorStats() {
    const stats = new Map();
    advisors.forEach(advisor => {
        stats.set(advisor.id, {
            advisor,
            total: 0,
            clients: new Set(),
            followups: 0,
            last: null,
            results: new Map()
        });
    });

    filteredGestiones.forEach(gestion => {
        const key = gestion.usuarioId || `name:${normalizeText(gestion.usuarioNombre)}`;
        if (!stats.has(key)) {
            stats.set(key, {
                advisor: {
                    id: key,
                    nombre: gestion.usuarioNombre || "Asesor",
                    email: "",
                    rol: ""
                },
                total: 0,
                clients: new Set(),
                followups: 0,
                last: null,
                results: new Map()
            });
        }

        const stat = stats.get(key);
        stat.total += 1;

        if (gestion.clienteId || gestion.clienteNombre) {
            stat.clients.add(`${gestion.clienteId || ""}|${normalizeText(gestion.clienteNombre)}`);
        }

        if (gestion.proximoSeguimiento) stat.followups += 1;

        const date = toDate(gestion.fecha || gestion.createdAt);
        if (date && (!stat.last || date > stat.last)) stat.last = date;

        const result = gestion.resultado || "Sin resultado";
        stat.results.set(result, (stat.results.get(result) || 0) + 1);
    });

    return [...stats.values()].sort((a, b) =>
        advisorName(a.advisor).localeCompare(advisorName(b.advisor), "es", { sensitivity: "base" })
    );
}

function renderAdvisorCards() {
    const stats = buildAdvisorStats();
    const maxTotal = Math.max(...stats.map(stat => stat.total), 1);

    if (!stats.length) {
        advisorCards.innerHTML = `<div class="empty-card">No hay asesores registrados para mostrar.</div>`;
        return;
    }

    advisorCards.innerHTML = stats.map(stat => {
        const resultTags = [...stat.results.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        const percentage = stat.total ? Math.round((stat.total / maxTotal) * 100) : 0;
        const noActivity = stat.total === 0;
        const name = advisorName(stat.advisor);

        return `
            <article class="advisor-card ${noActivity ? "inactive" : ""}">
                <div class="advisor-card-head">
                    <div class="advisor-card-identity">
                        <div class="advisor-avatar">${escapeHtml(initials(name))}</div>
                        <div>
                            <h4 class="advisor-card-name">${escapeHtml(name)}</h4>
                            <span class="advisor-card-role">${escapeHtml(roleLabel(stat.advisor.rol))}</span>
                        </div>
                    </div>
                    <div class="advisor-card-total">
                        ${stat.total}
                        <small>gestiones</small>
                    </div>
                </div>

                <div class="advisor-mini-grid">
                    <div class="advisor-mini"><span>Clientes</span><strong>${stat.clients.size}</strong></div>
                    <div class="advisor-mini"><span>Seguimientos</span><strong>${stat.followups}</strong></div>
                    <div class="advisor-mini"><span>Última gestión</span><strong>${escapeHtml(formatDateOnly(stat.last))}</strong></div>
                </div>

                <div class="advisor-progress">
                    <div class="advisor-progress-top">
                        <span>Actividad relativa</span>
                        <span>${percentage}%</span>
                    </div>
                    <div class="advisor-progress-bar">
                        <div class="advisor-progress-fill" style="width:${percentage}%"></div>
                    </div>
                </div>

                <div class="advisor-top-results">
                    ${resultTags.length
                        ? resultTags.map(([result, count]) => `<span>${escapeHtml(result)} · ${count}</span>`).join("")
                        : `<span class="no-activity">Sin actividad en el filtro</span>`}
                </div>
            </article>
        `;
    }).join("");
}

function renderTable() {
    if (!filteredGestiones.length) {
        reportTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">No hay gestiones que coincidan con los filtros.</td></tr>`;
        return;
    }

    const lookup = advisorLookup();

    reportTableBody.innerHTML = filteredGestiones.slice(0, 500).map(gestion => `
        <tr>
            <td>${escapeHtml(formatDate(gestion.fecha || gestion.createdAt))}</td>
            <td><strong>${escapeHtml(gestion.usuarioNombre || lookup.get(gestion.usuarioId)?.nombre || "—")}</strong></td>
            <td>
                <strong>${escapeHtml(gestion.clienteNombre || "Cliente")}</strong>
                ${gestion.clienteEmpresa ? `<small class="table-muted">${escapeHtml(gestion.clienteEmpresa)}</small>` : ""}
            </td>
            <td>${escapeHtml(gestion.tipo || "—")}</td>
            <td>${escapeHtml(gestion.resultado || "—")}</td>
            <td class="report-description">${escapeHtml(gestion.descripcion || "—")}</td>
            <td>${escapeHtml(formatDate(gestion.proximoSeguimiento))}</td>
        </tr>
    `).join("");

    if (filteredGestiones.length > 500) {
        reportTableBody.insertAdjacentHTML(
            "beforeend",
            `<tr><td colspan="7" class="table-empty">La tabla muestra los primeros 500 registros. La exportación contiene todos los resultados filtrados.</td></tr>`
        );
    }
}

function collectExportRows(items = filteredGestiones) {
    const lookup = advisorLookup();

    return items.map(gestion => ({
        Fecha: formatDate(gestion.fecha || gestion.createdAt),
        Asesor: gestion.usuarioNombre || lookup.get(gestion.usuarioId)?.nombre || "",
        Rol: roleLabel(lookup.get(gestion.usuarioId)?.rol || ""),
        Cliente: gestion.clienteNombre || "",
        Empresa: gestion.clienteEmpresa || "",
        Tipo: gestion.tipo || "",
        Resultado: gestion.resultado || "",
        Descripcion: gestion.descripcion || "",
        ProximoSeguimiento: formatDate(gestion.proximoSeguimiento),
        Recordatorio: gestion.recordatorio || "",
        ClienteId: gestion.clienteId || "",
        GestionId: gestion.id || ""
    }));
}

function summaryRows() {
    const advisorActivity = new Map();
    filteredGestiones.forEach(gestion => {
        const name = gestion.usuarioNombre || advisorLookup().get(gestion.usuarioId)?.nombre || "Sin asesor";
        advisorActivity.set(name, (advisorActivity.get(name) || 0) + 1);
    });

    return [...advisorActivity.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
        .map(([Asesor, Gestiones]) => ({ Asesor, Gestiones }));
}

function safeSheetName(name, used) {
    const base = String(name || "Asesor")
        .replace(/[\\/*?:\[\]]/g, " ")
        .trim()
        .slice(0, 31) || "Asesor";

    let candidate = base;
    let i = 2;

    while (used.has(candidate)) {
        const suffix = ` ${i++}`;
        candidate = base.slice(0, 31 - suffix.length) + suffix;
    }

    used.add(candidate);
    return candidate;
}

function exportExcel() {
    if (typeof XLSX === "undefined") {
        showMessage("No se pudo cargar el exportador de Excel. Verifica la conexión a internet.");
        return;
    }

    if (!filteredGestiones.length) {
        showMessage("No hay datos filtrados para exportar.");
        return;
    }

    const wb = XLSX.utils.book_new();
    const lookup = advisorLookup();

    const metadata = [
        ["REPORTE DE GESTIONES"],
        ["Generado", new Date().toLocaleString("es-CO")],
        ["Periodo desde", dateFrom.value || ""],
        ["Periodo hasta", dateTo.value || ""],
        ["Asesor", advisorFilter.selectedOptions?.[0]?.textContent || "Todos los asesores"],
        ["Tipo", typeFilter.selectedOptions?.[0]?.textContent || "Todos los tipos"],
        ["Resultado", resultFilter.selectedOptions?.[0]?.textContent || "Todos los resultados"],
        ["Búsqueda", searchFilter.value || ""],
        [],
        ["Indicador", "Valor"],
        ["Gestiones", filteredGestiones.length],
        ["Asesores con actividad", new Set(filteredGestiones.map(g => g.usuarioId).filter(Boolean)).size],
        ["Clientes atendidos", new Set(filteredGestiones.map(g => `${g.clienteId || ""}|${normalizeText(g.clienteNombre)}`)).size],
        ["Seguimientos programados", filteredGestiones.filter(g => g.proximoSeguimiento).length]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(metadata);
    summarySheet["!cols"] = [{ wch: 30 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, "Resumen");

    const activitySheet = XLSX.utils.json_to_sheet(summaryRows());
    activitySheet["!cols"] = [{ wch: 34 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, activitySheet, "Por asesor");
    activitySheet["!autofilter"] = { ref: `A1:B${Math.max(summaryRows().length + 1, 2)}` };
    activitySheet["!freeze"] = { xSplit: 0, ySplit: 1 };

    const detailSheet = XLSX.utils.json_to_sheet(collectExportRows());
    detailSheet["!cols"] = [
        { wch: 21 }, { wch: 30 }, { wch: 24 }, { wch: 28 },
        { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 55 },
        { wch: 22 }, { wch: 18 }, { wch: 24 }, { wch: 24 }
    ];
    detailSheet["!autofilter"] = { ref: `A1:L${Math.max(filteredGestiones.length + 1, 2)}` };
    detailSheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, detailSheet, "Detalle");

    const used = new Set(["Resumen", "Por asesor", "Detalle"]);
    const grouped = new Map();

    filteredGestiones.forEach(gestion => {
        const key = gestion.usuarioId || gestion.usuarioNombre || "sin_asesor";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(gestion);
    });

    [...grouped.entries()]
        .sort((a, b) => {
            const an = advisorName(lookup.get(a[0]) || { nombre: a[1][0]?.usuarioNombre });
            const bn = advisorName(lookup.get(b[0]) || { nombre: b[1][0]?.usuarioNombre });
            return an.localeCompare(bn, "es", { sensitivity: "base" });
        })
        .forEach(([key, items]) => {
            const advisor = lookup.get(key);
            const name = advisorName(advisor || { nombre: items[0]?.usuarioNombre });
            const sheet = XLSX.utils.json_to_sheet(collectExportRows(items));
            sheet["!cols"] = [
                { wch: 21 }, { wch: 30 }, { wch: 24 }, { wch: 28 },
                { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 55 },
                { wch: 22 }, { wch: 18 }, { wch: 24 }, { wch: 24 }
            ];
            sheet["!autofilter"] = { ref: `A1:L${Math.max(items.length + 1, 2)}` };
            sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
            XLSX.utils.book_append_sheet(wb, sheet, safeSheetName(name, used));
        });

    const stamp = localDateInputNow();
    XLSX.writeFile(wb, `reporte_gestiones_${stamp}.xlsx`);
    showMessage("Excel generado correctamente.", "success");
}

function csvEscape(value) {
    const text = String(value ?? "");
    return /[";\n\r]/.test(text)
        ? `"${text.replace(/"/g, '""')}"`
        : text;
}

function exportCsv() {
    if (!filteredGestiones.length) {
        showMessage("No hay datos filtrados para exportar.");
        return;
    }

    const rows = collectExportRows();
    const headers = Object.keys(rows[0] || { Fecha: "" });
    const csv = [
        headers.join(";"),
        ...rows.map(row => headers.map(header => csvEscape(row[header])).join(";"))
    ].join("\r\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte_gestiones_${localDateInputNow()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showMessage("CSV generado correctamente.", "success");
}

function setQuickRange(range) {
    document.querySelectorAll(".range-chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.range === range);
    });

    const today = localDateInputNow();

    if (range === "today") {
        dateFrom.value = today;
        dateTo.value = today;
    } else if (range === "7") {
        dateFrom.value = daysAgoInput(6);
        dateTo.value = today;
    } else if (range === "30") {
        dateFrom.value = daysAgoInput(29);
        dateTo.value = today;
    } else if (range === "month") {
        dateFrom.value = firstDayOfMonthInput();
        dateTo.value = today;
    } else if (range === "all") {
        dateFrom.value = "";
        dateTo.value = "";
    }

    applyFilters();
}

function refreshRangeChipState() {
    const currentFrom = dateFrom.value;
    const currentTo = dateTo.value;
    const today = localDateInputNow();

    let active = "";
    if (currentFrom === today && currentTo === today) active = "today";
    else if (currentFrom === daysAgoInput(6) && currentTo === today) active = "7";
    else if (currentFrom === daysAgoInput(29) && currentTo === today) active = "30";
    else if (currentFrom === firstDayOfMonthInput() && currentTo === today) active = "month";
    else if (!currentFrom && !currentTo) active = "all";

    document.querySelectorAll(".range-chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.range === active);
    });
}

function clearFilters() {
    dateFrom.value = daysAgoInput(29);
    dateTo.value = localDateInputNow();
    advisorFilter.value = "";
    typeFilter.value = "";
    resultFilter.value = "";
    searchFilter.value = "";
    refreshRangeChipState();
    applyFilters();
}

function configureComingSoon() {
    document.querySelectorAll("[data-coming-soon]").forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();
            alert(`${item.dataset.comingSoon} será habilitado en la siguiente fase.`);
        });
    });
}

async function logout() {
    try {
        await signOut(auth);
        window.location.href = "./login.html";
    } catch (error) {
        console.error("Error cerrando sesión:", error);
        showMessage("No fue posible cerrar la sesión.");
    }
}

function setupEvents() {
    [dateFrom, dateTo, advisorFilter, typeFilter, resultFilter, searchFilter].forEach(element => {
        element.addEventListener("input", () => {
            refreshRangeChipState();
            applyFilters();
        });
        element.addEventListener("change", () => {
            refreshRangeChipState();
            applyFilters();
        });
    });

    document.querySelectorAll(".range-chip").forEach(chip => {
        chip.addEventListener("click", () => setQuickRange(chip.dataset.range));
    });

    $("clearFiltersButton").addEventListener("click", clearFilters);

    $("refreshButton").addEventListener("click", async () => {
        try {
            await loadData();
            showMessage("Reporte actualizado.", "success");
        } catch (error) {
            console.error("Error actualizando reportes:", error);
            showMessage(`No se pudo actualizar el reporte: ${error.message}`);
        }
    });

    $("exportExcelButton").addEventListener("click", exportExcel);
    $("exportCsvButton").addEventListener("click", exportCsv);
    $("logoutButton").addEventListener("click", logout);
}

async function init(user) {
    try {
        currentUserProfile = await requireAdmin(user);
        renderCurrentUser();
        dateFrom.value = daysAgoInput(29);
        dateTo.value = localDateInputNow();
        refreshRangeChipState();
        configureComingSoon();
        setupEvents();
        await loadData();
    } catch (error) {
        console.error("Error inicializando reportes:", error);
        showMessage(error.message || "No se pudo abrir el módulo de reportes.");
        setTimeout(() => { window.location.href = "./dashboard.html"; }, 1400);
    }
}

onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "./login.html";
        return;
    }
    await init(user);
});

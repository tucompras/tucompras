import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const ADMIN_ROLES = new Set(["administrador"]);
const ADVISOR_ROLES = new Set(["asesor_comercial", "asesor_soporte"]);

function setVisible(id, visible) {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? "" : "none";
}

function configureMenu(role) {
    if (ADMIN_ROLES.has(role)) {
        setVisible("reportesMenuItem", true);
        setVisible("usersMenuItem", true);
        return;
    }

    if (ADVISOR_ROLES.has(role)) {
        setVisible("reportesMenuItem", false);
        setVisible("usersMenuItem", false);
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists()) configureMenu(snap.data()?.rol);
    } catch (error) {
        console.error("Error configurando menú por rol:", error);
    }
});

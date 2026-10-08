import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const userAvatar = document.getElementById("userAvatar");
const logoutButton = document.getElementById("logoutButton");

function formatRole(role) {
    return (role || "Usuario").replaceAll("_", " ");
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "./login.html";
        return;
    }

    try {
        const snapshot = await getDoc(doc(db, "usuarios", user.uid));
        if (!snapshot.exists()) throw new Error("Perfil no encontrado");

        const profile = snapshot.data();
        if (profile.estado && profile.estado !== "activo") throw new Error("Usuario inactivo");

        const name = profile.nombre || user.email || "Usuario";
        if (userName) userName.textContent = name;
        if (userRole) userRole.textContent = formatRole(profile.rol);
        if (userAvatar) userAvatar.textContent = name.trim().charAt(0).toUpperCase() || "U";
    } catch (error) {
        console.error("No fue posible validar el perfil:", error);
        await signOut(auth);
        window.location.href = "./login.html";
    }
});

logoutButton?.addEventListener("click", async () => {
    try {
        await signOut(auth);
    } finally {
        window.location.href = "./login.html";
    }
});

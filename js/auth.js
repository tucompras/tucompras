import {
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");


function showMessage(message, type = "error") {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;

    loginMessage.className = "form-message";

    if (type === "success") {
        loginMessage.classList.add("success");
    }

    if (type === "warning") {
        loginMessage.classList.add("warning");
    }
}


function setLoading(isLoading) {

    if (!loginButton) {
        return;
    }

    loginButton.disabled = isLoading;

    loginButton.textContent =
        isLoading
            ? "Ingresando..."
            : "Iniciar sesión";
}


async function getUserProfile(uid) {

    const userRef = doc(
        db,
        "usuarios",
        uid
    );

    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data()
    };
}


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            showMessage("");

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value;

            if (!email || !password) {

                showMessage(
                    "Ingresa el correo y la contraseña."
                );

                return;
            }

            try {

                setLoading(true);

                const credential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                const profile =
                    await getUserProfile(
                        credential.user.uid
                    );

                if (!profile) {

                    await auth.signOut();

                    showMessage(
                        "Tu usuario de acceso existe, pero todavía no tiene un perfil configurado. Debes registrarlo como usuario del sistema."
                    );

                    return;
                }

                if (
                    profile.estado &&
                    profile.estado !== "activo"
                ) {

                    await auth.signOut();

                    showMessage(
                        "Tu usuario está desactivado. Contacta al administrador."
                    );

                    return;
                }

                showMessage(
                    "Inicio de sesión correcto.",
                    "success"
                );

                window.location.href =
                    "./dashboard.html";

            } catch (error) {

                console.error(
                    "Error de autenticación:",
                    error
                );

                let message =
                    "No fue posible iniciar sesión.";

                switch (error.code) {

                    case "auth/invalid-credential":
                        message =
                            "Correo o contraseña incorrectos.";
                        break;

                    case "auth/user-disabled":
                        message =
                            "Este usuario ha sido deshabilitado.";
                        break;

                    case "auth/too-many-requests":
                        message =
                            "Demasiados intentos. Intenta nuevamente más tarde.";
                        break;

                    case "auth/network-request-failed":
                        message =
                            "No se pudo conectar con Firebase.";
                        break;

                    default:
                        message =
                            error.message ||
                            "Ocurrió un error al iniciar sesión.";
                }

                showMessage(message);

            } finally {

                setLoading(false);

            }

        }
    );

}


onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {
            return;
        }

        const currentPage =
            window.location.pathname;

        const isLoginPage =
            currentPage.endsWith("login.html") ||
            currentPage.endsWith("/");

        if (!isLoginPage) {
            return;
        }

        try {

            const profile =
                await getUserProfile(user.uid);

            if (profile) {

                window.location.href =
                    "./dashboard.html";

            }

        } catch (error) {

            console.error(
                "Error verificando perfil:",
                error
            );

        }

    }
);
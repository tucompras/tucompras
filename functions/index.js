const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();
const auth = getAuth();

async function requireAdmin(request) {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    const adminRef = db.collection("usuarios").doc(request.auth.uid);
    const adminSnap = await adminRef.get();

    if (!adminSnap.exists || adminSnap.data().rol !== "administrador" || adminSnap.data().estado !== "activo") {
        throw new HttpsError("permission-denied", "Solo un administrador activo puede realizar esta acción.");
    }

    return adminSnap.data();
}

exports.adminSetUserPassword = onCall({
    region: "us-central1",
    enforceAppCheck: false
}, async (request) => {
    await requireAdmin(request);

    const targetUid = typeof request.data?.targetUid === "string" ? request.data.targetUid.trim() : "";
    const newPassword = typeof request.data?.newPassword === "string" ? request.data.newPassword : "";

    if (!targetUid) {
        throw new HttpsError("invalid-argument", "Falta el usuario destinatario.");
    }

    if (newPassword.length < 8) {
        throw new HttpsError("invalid-argument", "La contraseña debe tener mínimo 8 caracteres.");
    }

    if (targetUid === request.auth.uid) {
        throw new HttpsError("failed-precondition", "Para el administrador actual debe utilizarse un flujo de cambio de contraseña de la propia cuenta.");
    }

    try {
        const targetUser = await auth.getUser(targetUid);
        await auth.updateUser(targetUser.uid, { password: newPassword });

        await db.collection("usuarios").doc(targetUid).set({
            contrasenaActualizadaEn: FieldValue.serverTimestamp(),
            contrasenaActualizadaPorId: request.auth.uid
        }, { merge: true });

        return { ok: true };
    } catch (error) {
        console.error("adminSetUserPassword error", error);
        throw new HttpsError("internal", "No fue posible cambiar la contraseña.");
    }
});

exports.adminDeleteTicket = onCall({
    region: "us-central1",
    enforceAppCheck: false
}, async (request) => {
    await requireAdmin(request);

    const ticketId = typeof request.data?.ticketId === "string" ? request.data.ticketId.trim() : "";
    if (!ticketId) {
        throw new HttpsError("invalid-argument", "Falta el ID del ticket.");
    }

    const ticketRef = db.collection("tickets").doc(ticketId);
    const ticketSnap = await ticketRef.get();
    if (!ticketSnap.exists) {
        throw new HttpsError("not-found", "El ticket no existe.");
    }

    const historySnap = await ticketRef.collection("historial").get();
    const historyRefs = historySnap.docs.map((doc) => doc.ref);

    // Firestore admite hasta 500 operaciones por batch.
    // Se usa un margen de seguridad de 450.
    for (let i = 0; i < historyRefs.length; i += 450) {
        const batch = db.batch();
        historyRefs.slice(i, i + 450).forEach((ref) => batch.delete(ref));
        await batch.commit();
    }

    await ticketRef.delete();

    return { ok: true, deletedHistory: historyRefs.length };
});


exports.assignSupportTicket = onCall({
    region: "us-central1",
    enforceAppCheck: false
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes iniciar sesión."
        );
    }

    const callerRef =
        db.collection("usuarios").doc(request.auth.uid);

    const callerSnap =
        await callerRef.get();

    if (!callerSnap.exists) {
        throw new HttpsError(
            "permission-denied",
            "No existe el perfil del usuario."
        );
    }

    const caller = callerSnap.data();

    const canCreateTickets =
        caller.rol === "administrador" ||
        caller.rol === "jefe_ventas_marketing" ||
        caller.permisos?.tickets_crear === true;

    if (
        caller.estado &&
        caller.estado !== "activo"
    ) {
        throw new HttpsError(
            "permission-denied",
            "El usuario está inactivo."
        );
    }

    if (!canCreateTickets) {
        throw new HttpsError(
            "permission-denied",
            "No tienes permiso para crear tickets."
        );
    }

    try {
        const assignment = await db.runTransaction(
            async (transaction) => {
                const supportQuery =
                    db.collection("usuarios")
                        .where("rol", "==", "asesor_soporte");

                const snapshot =
                    await transaction.get(supportQuery);

                const supportUsers =
                    snapshot.docs
                        .map((documentSnapshot) => ({
                            id: documentSnapshot.id,
                            ...documentSnapshot.data()
                        }))
                        .filter((user) =>
                            user.estado === "activo" &&
                            user.recibeTickets !== false
                        );

                if (supportUsers.length === 0) {
                    return null;
                }

                const timestampValue = (value) => {
                    if (!value) return 0;
                    if (typeof value.toMillis === "function") {
                        return value.toMillis();
                    }
                    if (typeof value.toDate === "function") {
                        return value.toDate().getTime();
                    }
                    return 0;
                };

                supportUsers.sort((a, b) => {
                    const lastA = timestampValue(
                        a.ultimaAsignacionTicketAt
                    );
                    const lastB = timestampValue(
                        b.ultimaAsignacionTicketAt
                    );

                    if (lastA !== lastB) {
                        return lastA - lastB;
                    }

                    const queueA = Number(a.ordenCola || 0);
                    const queueB = Number(b.ordenCola || 0);

                    if (queueA !== queueB) {
                        return queueA - queueB;
                    }

                    return String(a.nombre || "")
                        .localeCompare(
                            String(b.nombre || ""),
                            "es",
                            { sensitivity: "base" }
                        );
                });

                const selected = supportUsers[0];

                transaction.update(
                    db.collection("usuarios").doc(selected.id),
                    {
                        ultimaAsignacionTicketAt:
                            FieldValue.serverTimestamp()
                    }
                );

                return {
                    id: selected.id,
                    nombre: selected.nombre || "Soporte",
                    email: selected.email || "",
                    rol: selected.rol || "asesor_soporte",
                    recibeTickets:
                        selected.recibeTickets !== false
                };
            }
        );

        return {
            ok: true,
            supportUser: assignment
        };

    } catch (error) {
        console.error(
            "assignSupportTicket error",
            error
        );

        throw new HttpsError(
            "internal",
            "No fue posible asignar automáticamente el ticket a soporte."
        );
    }
});

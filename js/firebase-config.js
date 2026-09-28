import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    getStorage
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";


const firebaseConfig = {
    apiKey: "AIzaSyC_lrRYPpXj3pKZlctqxTm4PEq5EPaOqPA",
    authDomain: "tucompras-e5e0a.firebaseapp.com",
    projectId: "tucompras-e5e0a",
    storageBucket: "tucompras-e5e0a.firebasestorage.app",
    messagingSenderId: "553308034860",
    appId: "1:553308034860:web:f532128682f163683efe89"
};


const app = initializeApp(firebaseConfig);


const auth = getAuth(app);


const db = getFirestore(app);


const storage = getStorage(app);


export {
    app,
    auth,
    db,
    storage,
    firebaseConfig
};
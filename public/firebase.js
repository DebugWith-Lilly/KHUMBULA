import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyBfuA7I-yKTiTDytNl8NfPm4DXnqES9t9o",
    authDomain: "khumbula-144db.firebaseapp.com",
    projectId: "khumbula-144db",
    storageBucket: "khumbula-144db.firebasestorage.app",
    messagingSenderId: "303262158172",
    appId: "1:303262158172:web:e7859784411dd558298599",
    measurementId: "G-LY8N65GST1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let analytics = null;

isSupported().then((supported) => {
    if (supported) {
        analytics = getAnalytics(app);
    }
});

export { app, auth, analytics };

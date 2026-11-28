// ============================================
// KHUMBULA - FIREBASE LOGIN
// ============================================

import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence
} from
    "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import { auth } from "./firebase.js";


// ============================================
// GET HTML ELEMENTS
// ============================================

const loginForm = document.getElementById("login-form");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");

const forgotPassword = document.getElementById("forgot-password");
const selectedLanguage = document.getElementById("selected-language");


// ============================================
// LANGUAGE MESSAGES
// ============================================

const messages = {
    en: {
        signingIn: "Verifying your account. Please wait...",
        success: "Login successful. Welcome back!",
        invalid: "Incorrect email or password. Please try again.",
        disabled: "This account has been disabled.",
        network: "Please check your internet connection.",
        error: "Something went wrong. Please try again.",
        enterEmail: "Please enter your email address first.",
        sendingReset: "Sending password reset email...",
        resetSent: "If an account exists for this email, a reset link will be sent.",
        resetError: "Could not send the reset email. Please try again."
    },

    zu: {
        signingIn: "Sihlola i-akhawunti yakho. Sicela ulinde...",
        success: "Ungene ngempumelelo. Siyakwamukela futhi!",
        invalid: "I-imeyili noma iphasiwedi ayilungile. Zama futhi.",
        disabled: "Le akhawunti ivaliwe.",
        network: "Sicela uhlole uxhumano lwakho lwe-inthanethi.",
        error: "Kukhona okungahambanga kahle. Zama futhi.",
        enterEmail: "Sicela ufake ikheli lakho le-imeyili kuqala.",
        sendingReset: "Sithumela i-imeyili yokushintsha iphasiwedi...",
        resetSent: "Uma i-akhawunti ikhona, isixhumanisi sizothunyelwa ku-imeyili yakho.",
        resetError: "Asikwazanga ukuthumela i-imeyili. Zama futhi."
    }
};


// ============================================
// GET CURRENT LANGUAGE
// ============================================

function getText() {
    const language = selectedLanguage?.value || "en";

    return messages[language] || messages.en;
}


// ============================================
// SHOW MESSAGE
// ============================================

function showMessage(message, type = "info") {
    loginMessage.textContent = message;
    loginMessage.style.display = "block";

    if (type === "error") {
        loginMessage.style.background = "#F8E0D8";
        loginMessage.style.color = "#8A3827";
    } else if (type === "success") {
        loginMessage.style.background = "#E7E8D9";
        loginMessage.style.color = "#40543C";
    } else {
        loginMessage.style.background = "#F3E5D8";
        loginMessage.style.color = "#75452F";
    }
}


// ============================================
// FIREBASE LOGIN
// VERIFY EXISTING FIREBASE AUTH USERS
// ============================================

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const text = getText();

    if (!email || !password) {
        showMessage(text.invalid, "error");
        return;
    }

    loginButton.disabled = true;

    showMessage(text.signingIn);

    try {
        // Keep the user signed in on this browser
        await setPersistence(auth, browserLocalPersistence);

        // Firebase verifies the existing user's credentials
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        console.log("KHUMBULA authenticated user:", user.uid);

        showMessage(text.success, "success");

        // Login successful - open dashboard
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Firebase authentication error:", error.code);

        switch (error.code) {
            case "auth/invalid-credential":
            case "auth/wrong-password":
            case "auth/user-not-found":
            case "auth/invalid-email":
                showMessage(text.invalid, "error");
                break;

            case "auth/user-disabled":
                showMessage(text.disabled, "error");
                break;

            case "auth/network-request-failed":
                showMessage(text.network, "error");
                break;

            default:
                showMessage(text.error, "error");
                break;
        }

        loginButton.disabled = false;
    }
});


// ============================================
// FORGOT PASSWORD
// ============================================

forgotPassword.addEventListener("click", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const text = getText();

    if (!email) {
        showMessage(text.enterEmail, "error");
        emailInput.focus();
        return;
    }

    showMessage(text.sendingReset);

    try {
        await sendPasswordResetEmail(auth, email);

        showMessage(text.resetSent, "success");

    } catch (error) {
        console.error("Password reset error:", error.code);

        showMessage(text.resetError, "error");
    }
});

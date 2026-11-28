
import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// ========================================
// KHUMBULA LOGIN
// ========================================

console.log("KHUMBULA login script loaded!");

// ========================================
// ELEMENTS
// ========================================

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");

const forgotPasswordLink = document.getElementById("forgot-password");
const togglePassword = document.getElementById("togglePassword");

const languageOptions = document.querySelectorAll(".language-option");
const selectedLanguageInput = document.getElementById("selected-language");

// Stop if this script is accidentally loaded on another page.
if (!loginForm) {
    console.log("Login form not found. Login script stopped.");
} else {

// ========================================
// SETTINGS
// ========================================

const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 15 * 60 * 1000;

const ATTEMPTS_KEY = "khumbula_failed_login_attempts";
const LOCKOUT_KEY = "khumbula_login_lockout_until";
const LANGUAGE_KEY = "khumbula_selected_language";

// ========================================
// MESSAGE HELPER
// ========================================

function showMessage(message) {
    if (loginMessage) {
        loginMessage.textContent = message;
    }
}

// ========================================
// LANGUAGE SELECTION
// ========================================

function getSelectedLanguage() {
    return localStorage.getItem(LANGUAGE_KEY) || "en";
}

function saveSelectedLanguage(language) {
    localStorage.setItem(LANGUAGE_KEY, language);
}

function restoreLanguageSelection() {
    const savedLanguage = getSelectedLanguage();

    if (selectedLanguageInput) {
        selectedLanguageInput.value = savedLanguage;
    }

    languageOptions.forEach(option => {
        const isSelected = option.dataset.language === savedLanguage;

        option.classList.toggle("selected", isSelected);
        option.setAttribute("aria-pressed", String(isSelected));
    });
}

languageOptions.forEach(option => {
    option.addEventListener("click", () => {
        const language = option.dataset.language;

        if (!language) return;

        languageOptions.forEach(item => {
            item.classList.remove("selected");
            item.setAttribute("aria-pressed", "false");
        });

        option.classList.add("selected");
        option.setAttribute("aria-pressed", "true");

        if (selectedLanguageInput) {
            selectedLanguageInput.value = language;
        }

        saveSelectedLanguage(language);
    });
});

restoreLanguageSelection();

// ========================================
// SHOW / HIDE PASSWORD
// ========================================

if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";
        togglePassword.textContent = isPassword ? "Hide" : "Show";

        togglePassword.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });
}

// ========================================
// LOGIN ATTEMPT TRACKING
// ========================================

function getFailedAttempts() {
    return Number(sessionStorage.getItem(ATTEMPTS_KEY) || 0);
}

function getLockoutUntil() {
    return Number(sessionStorage.getItem(LOCKOUT_KEY) || 0);
}

function clearLoginAttempts() {
    sessionStorage.removeItem(ATTEMPTS_KEY);
    sessionStorage.removeItem(LOCKOUT_KEY);
}

function updateLockout() {
    const remaining = getLockoutUntil() - Date.now();

    if (remaining <= 0) {
        clearLoginAttempts();

        emailInput.disabled = false;
        passwordInput.disabled = false;
        loginButton.disabled = false;

        loginButton.textContent = "Log In";

        showMessage("");
        return;
    }

    emailInput.disabled = true;
    passwordInput.disabled = true;
    loginButton.disabled = true;

    const minutes = Math.ceil(remaining / 60000);

    showMessage(
        `Login is temporarily locked after 3 failed attempts. ` +
        `Please try again in ${minutes} minute(s).`
    );

    window.setTimeout(updateLockout, 1000);
}

function recordFailedAttempt() {
    const attempts = getFailedAttempts() + 1;

    sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));

    if (attempts >= MAX_ATTEMPTS) {
        sessionStorage.setItem(
            LOCKOUT_KEY,
            String(Date.now() + LOCKOUT_TIME)
        );

        updateLockout();
    } else {
        const remaining = MAX_ATTEMPTS - attempts;

        showMessage(
            `Incorrect email or password. ` +
            `${remaining} attempt(s) remaining.`
        );
    }
}

// Restore lockout if one is active.
if (getLockoutUntil() > Date.now()) {
    updateLockout();
} else {
    clearLoginAttempts();
}

// ========================================
// FIREBASE LOGIN
// ========================================

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (getLockoutUntil() > Date.now()) {
        updateLockout();
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const language =
        selectedLanguageInput?.value || getSelectedLanguage();

    if (!email || !password) {
        showMessage("Please enter your email and password.");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    showMessage("");

    try {
        // Sign in using Firebase Authentication.
        const credential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = credential.user;

        // Clear failed login attempts.
        clearLoginAttempts();

        // Save the user's preferred language.
        loginButton.textContent = "Preparing your account...";

        try {
            await setDoc(
                doc(db, "users", user.uid),
                {
                    preferredLanguage: language,
                    updatedAt: serverTimestamp()
                },
                { merge: true }
            );
        } catch (error) {
            console.error("Could not save language preference:", error);
        }

        // Save language locally too.
        saveSelectedLanguage(language);

        // Open the dashboard.
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("KHUMBULA login error:", error.code);

        if (
            error.code === "auth/invalid-credential" ||
            error.code === "auth/user-not-found" ||
            error.code === "auth/wrong-password"
        ) {
            recordFailedAttempt();

        } else if (error.code === "auth/invalid-email") {
            showMessage("Please enter a valid email address.");

        } else if (error.code === "auth/too-many-requests") {
            showMessage(
                "Too many attempts. Please try again later."
            );

        } else if (error.code === "auth/network-request-failed") {
            showMessage(
                "Connection problem. Please check your internet."
            );

        } else if (error.code === "auth/operation-not-allowed") {
            showMessage(
                "Email/password login is not enabled in Firebase."
            );

        } else {
            showMessage("Login failed. Please try again.");
        }

        if (getLockoutUntil() > Date.now()) {
            loginButton.disabled = true;
        } else {
            loginButton.disabled = false;
            loginButton.textContent = "Log In";
        }
    }
});

// ========================================
// FORGOT PASSWORD
// ========================================

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", async event => {
        event.preventDefault();

        const email = emailInput.value.trim();

        if (!email) {
            showMessage(
                "Enter your email address first, then click Forgot Password."
            );

            emailInput.focus();
            return;
        }

        showMessage("Sending password reset email...");

        try {
            await sendPasswordResetEmail(auth, email);

            showMessage(
                "If an account exists for that email, a reset email will be sent."
            );

        } catch (error) {
            console.error("Password reset error:", error.code);

            if (error.code === "auth/invalid-email") {
                showMessage("Please enter a valid email address.");
            } else {
                showMessage(
                    "Could not send the reset email. Please try again."
                );
            }
        }
    });
}

}

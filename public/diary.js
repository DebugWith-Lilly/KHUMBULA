
"use strict";

/* ==========================================
   KHUMBULA MEMORY DIARY
   IndexedDB storage + Voice Transcription
========================================== */

const DB_NAME = "KhumbulaMemoryDiary";
const DB_VERSION = 1;
const STORE_NAME = "memories";

let db = null;
let currentEntries = [];
let selectedImages = [];
let editingExistingImages = [];

let speechRecognition = null;
let isRecording = false;

const $ = (id) => document.getElementById(id);

/* ==========================================
   DATABASE
========================================== */

function openDatabase() {
    return new Promise((resolve, reject) => {
        if (!("indexedDB" in window)) {
            reject(new Error("Your browser does not support local storage for this diary."));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = () => {
            db = request.result;

            db.onversionchange = () => {
                db.close();
            };

            resolve(db);
        };

        request.onerror = () => {
            reject(request.error || new Error("Could not open the diary database."));
        };

        request.onblocked = () => {
            reject(new Error("Please close other KHUMBULA diary tabs and refresh this page."));
        };
    });
}

function saveMemory(memory) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("The diary database is not ready."));
            return;
        }

        const transaction = db.transaction(STORE_NAME, "readwrite");

        transaction.objectStore(STORE_NAME).put(memory);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

function deleteMemoryFromDatabase(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");

        transaction.objectStore(STORE_NAME).delete(id);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

function getAllMemories() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

/* ==========================================
   HELPERS
========================================== */

function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return Date.now() + "-" + Math.random().toString(16).slice(2);
}

function getToday() {
    const date = new Date();

    return new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value + "T12:00:00");

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function showStatus(elementId, message) {
    const element = $(elementId);

    if (element) {
        element.textContent = message;
    }
}

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/* ==========================================
   VOICE TRANSCRIPTION
========================================== */

function setVoiceStatus(message, isError = false) {
    const status = $("voice-status");

    if (!status) return;

    status.classList.add("visible");
    status.classList.toggle("error", isError);

    status.innerHTML = `
        <i data-lucide="${isError ? "alert-circle" : "audio-lines"}"></i>
        <span>${escapeHTML(message)}</span>
    `;

    refreshIcons();
}

function updateVoiceButton(recording) {
    const button = $("voice-note-button");

    if (!button) return;

    button.classList.toggle("recording", recording);
    button.setAttribute("aria-pressed", String(recording));

    if (recording) {
        button.innerHTML = `<i data-lucide="mic-off"></i>`;
        button.setAttribute("aria-label", "Stop voice transcription");
        button.title = "Stop recording";
    } else {
        button.innerHTML = `<i data-lucide="mic"></i>`;
        button.setAttribute("aria-label", "Start voice transcription");
        button.title = "Speak your memory";
    }

    refreshIcons();
}

function appendTranscript(transcript) {
    const notes = $("entry-text");

    if (!notes || !transcript.trim()) return;

    const existingText = notes.value.trim();

    if (existingText) {
        notes.value = existingText + " " + transcript.trim();
    } else {
        notes.value = transcript.trim();
    }

    notes.focus();

    notes.dispatchEvent(new Event("input", {
        bubbles: true
    }));
}

function stopVoiceRecording() {
    if (speechRecognition && isRecording) {
        speechRecognition.stop();
    }
}

function startVoiceRecording() {
    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        setVoiceStatus(
            "Voice transcription is not supported in this browser. Please try Google Chrome.",
            true
        );
        return;
    }

    if (isRecording) {
        stopVoiceRecording();
        return;
    }

    try {
        speechRecognition = new SpeechRecognition();

        speechRecognition.lang = "en-ZA";
        speechRecognition.continuous = true;
        speechRecognition.interimResults = true;
        speechRecognition.maxAlternatives = 1;

        isRecording = true;
        updateVoiceButton(true);

        setVoiceStatus("Listening... Speak naturally. Your words will appear in your notes.");

        speechRecognition.onresult = (event) => {
            let finalTranscript = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {
                const transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                }
            }

            if (finalTranscript.trim()) {
                appendTranscript(finalTranscript);
                setVoiceStatus("Your speech has been transcribed into your notes.");
            }
        };

        speechRecognition.onerror = (event) => {
            console.error("Voice transcription error:", event.error);

            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                setVoiceStatus(
                    "Microphone access was blocked. Please allow microphone permission in your browser.",
                    true
                );
            } else if (event.error === "no-speech") {
                setVoiceStatus(
                    "No speech was detected. Tap the microphone and try again.",
                    true
                );
            } else if (event.error === "audio-capture") {
                setVoiceStatus(
                    "No microphone was detected. Check your microphone connection.",
                    true
                );
            } else if (event.error !== "aborted") {
                setVoiceStatus(
                    "Voice transcription encountered a problem. Please try again.",
                    true
                );
            }
        };

        speechRecognition.onend = () => {
            isRecording = false;
            updateVoiceButton(false);

            if (!$("voice-status").classList.contains("error")) {
                setVoiceStatus("Recording stopped. You can review or edit your notes.");
            }
        };

        speechRecognition.start();

    } catch (error) {
        console.error("Could not start voice transcription:", error);

        isRecording = false;
        updateVoiceButton(false);

        setVoiceStatus(
            "Could not start the microphone. Please try again.",
            true
        );
    }
}

$("voice-note-button").addEventListener("click", () => {
    if (isRecording) {
        stopVoiceRecording();
    } else {
        startVoiceRecording();
    }
});

/* ==========================================
   TAB NAVIGATION
========================================== */

function showTab(tabName) {
    const sections = {
        memories: "memories-section",
        attachments: "attachments-section",
        history: "history-section"
    };

    if (!sections[tabName]) return;

    Object.entries(sections).forEach(([name, sectionId]) => {
        $(sectionId).classList.toggle("hidden", name !== tabName);
    });

    document.querySelectorAll("[data-tab]").forEach(button => {
        const isActive = button.dataset.tab === tabName;

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });

    if (tabName === "attachments") {
        renderAttachments();
    }

    if (tabName === "history") {
        renderHistory();
    }

    refreshIcons();
}

document.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => {
        showTab(button.dataset.tab);
    });
});

/* ==========================================
   IMAGE READING
========================================== */

function readImage(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) {
            reject(new Error(file.name + " is not an image."));
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            resolve({
                id: makeId(),
                name: file.name,
                type: file.type,
                data: reader.result
            });
        };

        reader.onerror = () => {
            reject(new Error("Could not read " + file.name));
        };

        reader.readAsDataURL(file);
    });
}

/* ==========================================
   IMAGE PREVIEW
========================================== */

function renderPreview() {
    const allImages = [
        ...editingExistingImages,
        ...selectedImages
    ];

    if (!allImages.length) {
        $("preview-grid").innerHTML = "";
        return;
    }

    $("preview-grid").innerHTML = allImages.map((image, index) => `
        <div class="image-card">
            <img
                src="${image.data}"
                alt="${escapeHTML(image.name)}"
            >

            <button
                type="button"
                class="remove-image"
                data-remove-image="${index}"
                aria-label="Remove image"
            >
                <i data-lucide="x"></i>
            </button>

            <p>${escapeHTML(image.name)}</p>
        </div>
    `).join("");

    refreshIcons();
}

$("image-upload").addEventListener("change", async event => {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    let added = 0;
    const errors = [];

    for (const file of files) {
        try {
            const image = await readImage(file);

            selectedImages.push(image);
            added++;
        } catch (error) {
            errors.push(error.message);
        }
    }

    renderPreview();

    if (errors.length) {
        showStatus("diary-status", errors.join(" "));
    } else {
        showStatus(
            "diary-status",
            added + " photo(s) added. Save your memory to keep them."
        );
    }

    event.target.value = "";
});

$("preview-grid").addEventListener("click", event => {
    const button = event.target.closest("[data-remove-image]");

    if (!button) return;

    const index = Number(button.dataset.removeImage);

    if (index < editingExistingImages.length) {
        editingExistingImages.splice(index, 1);
    } else {
        const newImageIndex = index - editingExistingImages.length;
        selectedImages.splice(newImageIndex, 1);
    }

    renderPreview();
});

/* ==========================================
   FORM RESET
========================================== */

function resetEditor() {
    stopVoiceRecording();

    $("diary-form").reset();

    $("entry-id").value = "";
    $("entry-date").value = getToday();

    selectedImages = [];
    editingExistingImages = [];

    $("save-entry").innerHTML = `
        <i data-lucide="heart"></i>
        Save Memory
    `;

    $("preview-grid").innerHTML = "";

    showStatus("diary-status", "");

    $("voice-status").classList.remove("visible", "error");
    $("voice-status").innerHTML = "";

    refreshIcons();
}

$("clear-entry").addEventListener("click", resetEditor);

/* ==========================================
   SAVE MEMORY
========================================== */

$("diary-form").addEventListener("submit", async event => {
    event.preventDefault();

    const id = $("entry-id").value;
    const title = $("entry-title").value.trim();
    const date = $("entry-date").value;
    const notes = $("entry-text").value.trim();

    if (!title || !date || !notes) {
        showStatus(
            "diary-status",
            "Please complete the title, date and notes."
        );
        return;
    }

    const existingEntry = currentEntries.find(
        memory => memory.id === id
    );

    const allImages = [
        ...editingExistingImages,
        ...selectedImages
    ];

    const memory = {
        id: id || makeId(),
        title,
        date,
        text: notes,
        images: allImages,
        createdAt: existingEntry
            ? existingEntry.createdAt
            : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const saveButton = $("save-entry");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        await saveMemory(memory);

        await refreshAll();

        resetEditor();

        showStatus(
            "diary-status",
            existingEntry
                ? "Your memory has been updated successfully."
                : "Your memory has been saved successfully."
        );

    } catch (error) {
        console.error("KHUMBULA save error:", error);

        showStatus(
            "diary-status",
            "Could not save this memory. Please try again or use a smaller photo."
        );

    } finally {
        saveButton.disabled = false;

        if (!$("entry-id").value) {
            saveButton.innerHTML = `
                <i data-lucide="heart"></i>
                Save Memory
            `;
        }

        refreshIcons();
    }
});

/* ==========================================
   EDIT MEMORY
========================================== */

function editMemory(id) {
    const memory = currentEntries.find(
        entry => entry.id === id
    );

    if (!memory) return;

    stopVoiceRecording();

    $("entry-id").value = memory.id;
    $("entry-title").value = memory.title;
    $("entry-date").value = memory.date;
    $("entry-text").value = memory.text;

    editingExistingImages = [...(memory.images || [])];
    selectedImages = [];

    $("save-entry").innerHTML = `
        <i data-lucide="check"></i>
        Update Memory
    `;

    renderPreview();
    showTab("memories");

    showStatus(
        "diary-status",
        "You are editing this memory. Your existing photos are kept."
    );

    $("voice-status").classList.remove("visible", "error");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    refreshIcons();
}

/* ==========================================
   DELETE MEMORY
========================================== */

async function removeMemory(id) {
    const memory = currentEntries.find(
        entry => entry.id === id
    );

    if (!memory) return;

    const confirmed = window.confirm(
        `Delete "${memory.title}" and its attached photos?`
    );

    if (!confirmed) return;

    try {
        await deleteMemoryFromDatabase(id);

        await refreshAll();

        showStatus(
            "history-status",
            "Memory deleted successfully."
        );

    } catch (error) {
        console.error("KHUMBULA delete error:", error);

        showStatus(
            "history-status",
            "Could not delete this memory. Please try again."
        );
    }
}

/* ==========================================
   MEMORY HISTORY
========================================== */

function renderHistory() {
    const container = $("saved-entries");

    if (!currentEntries.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="book-heart"></i>
                <h3>No memories saved yet</h3>
                <p>Your saved moments will appear here. Start by creating your first memory.</p>
            </div>
        `;

        refreshIcons();
        return;
    }

    container.innerHTML = currentEntries.map(memory => `
        <article class="memory-card">

            <h3>${escapeHTML(memory.title)}</h3>

            <div class="memory-date">
                <i data-lucide="calendar-days"></i>
                ${escapeHTML(formatDate(memory.date))}
            </div>

            <p class="memory-text">${escapeHTML(memory.text)}</p>

            ${(memory.images || []).length ? `
                <div class="memory-images">
                    ${memory.images.map(image => `
                        <img
                            src="${image.data}"
                            alt="${escapeHTML(image.name)}"
                            loading="lazy"
                        >
                    `).join("")}
                </div>
            ` : ""}

            <div class="memory-actions">

                <button
                    type="button"
                    class="btn btn-secondary"
                    data-action="edit"
                    data-id="${escapeHTML(memory.id)}"
                >
                    <i data-lucide="pencil"></i>
                    Edit
                </button>

                <button
                    type="button"
                    class="btn btn-danger"
                    data-action="delete"
                    data-id="${escapeHTML(memory.id)}"
                >
                    <i data-lucide="trash-2"></i>
                    Delete
                </button>

            </div>

        </article>
    `).join("");

    refreshIcons();
}

$("saved-entries").addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const id = button.dataset.id;

    if (button.dataset.action === "edit") {
        editMemory(id);
    }

    if (button.dataset.action === "delete") {
        removeMemory(id);
    }
});

/* ==========================================
   PHOTOS / ATTACHMENTS
========================================== */

function renderAttachments() {
    const container = $("attachments-grid");

    const attachments = currentEntries.flatMap(memory =>
        (memory.images || []).map(image => ({
            ...image,
            memoryTitle: memory.title,
            memoryDate: memory.date
        }))
    );

    if (!attachments.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="images"></i>
                <h3>No photos yet</h3>
                <p>Photos you attach to your memories will appear here.</p>
            </div>
        `;

        showStatus("attachments-status", "");
        refreshIcons();
        return;
    }

    container.innerHTML = attachments.map(image => `
        <article class="attachment-card">

            <img
                src="${image.data}"
                alt="${escapeHTML(image.name)}"
                loading="lazy"
            >

            <strong>${escapeHTML(image.name)}</strong>

            <span>${escapeHTML(image.memoryTitle)}</span>

            <span>${escapeHTML(formatDate(image.memoryDate))}</span>

        </article>
    `).join("");

    showStatus(
        "attachments-status",
        attachments.length + " saved photo(s)."
    );

    refreshIcons();
}

/* ==========================================
   REFRESH ALL CONTENT
========================================== */

async function refreshAll() {
    currentEntries = await getAllMemories();

    currentEntries.sort((a, b) => {
        return (b.date || "").localeCompare(a.date || "") ||
            (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    renderHistory();
    renderAttachments();
}

/* ==========================================
   START DIARY
========================================== */

async function startDiary() {
    $("entry-date").value = getToday();

    refreshIcons();

    try {
        await openDatabase();
        await refreshAll();

        showStatus("diary-status", "");

    } catch (error) {
        console.error("KHUMBULA database error:", error);

        showStatus(
            "diary-status",
            error.message || "Could not open your memory diary."
        );
    }
}

document.addEventListener("DOMContentLoaded", startDiary);


const STORAGE_KEY = "khumbula_daily_tasks";

const taskForm = document.getElementById("add-task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");

const progressCount = document.getElementById("progress-count");
const progressFill = document.getElementById("progress-fill");
const progressCaption = document.getElementById("progress-caption");
const progressTrack = document.getElementById("progress-track");

const taskTotal = document.getElementById("task-total");

const reminderMessage = document.getElementById("reminder-message");
const reminderTitle = document.getElementById("reminder-title");
const reminderText = document.getElementById("reminder-text");

const todayDate = document.getElementById("today-date");

// ======================================================
// LOAD SAVED TASKS
// ======================================================

function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);

        if (!savedTasks) {
            return [];
        }

        const parsedTasks = JSON.parse(savedTasks);

        if (!Array.isArray(parsedTasks)) {
            return [];
        }

        return parsedTasks.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.text === "string" &&
            typeof task.completed === "boolean"
        );

    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

let tasks = loadTasks();

// ======================================================
// SAVE TASKS
// ======================================================

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        console.error("Could not save tasks:", error);
        alert("Your tasks could not be saved. Please check your browser storage.");
    }
}

// ======================================================
// DISPLAY TODAY'S DATE
// ======================================================

function displayDate() {
    const today = new Date();

    todayDate.textContent = today.toLocaleDateString("en-ZA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// ======================================================
// ADD A NEW TASK
// ======================================================

taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const taskText = taskInput.value.trim();

    if (!taskText) {
        taskInput.focus();
        return;
    }

    const newTask = {
        id: createTaskId(),
        text: taskText,
        completed: false
    };

    tasks.push(newTask);

    saveTasks();
    renderTasks();

    taskInput.value = "";
    taskInput.focus();
});

// Create a unique ID for each task.
function createTaskId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return Date.now().toString() + Math.random().toString(36).slice(2);
}

// ======================================================
// COMPLETE OR UNCOMPLETE A TASK
// ======================================================

function toggleTask(taskId) {
    tasks = tasks.map(task => {
        if (task.id === taskId) {
            return {
                ...task,
                completed: !task.completed
            };
        }

        return task;
    });

    saveTasks();
    renderTasks();
}

// ======================================================
// DELETE A TASK
// ======================================================

function deleteTask(taskId) {
    tasks = tasks.filter(task => task.id !== taskId);

    saveTasks();
    renderTasks();
}

// ======================================================
// RENDER THE TASK LIST
// ======================================================

function renderTasks() {
    // Remove old task elements.
    taskList.querySelectorAll(".task-item").forEach(item => {
        item.remove();
    });

    // Show empty state if there are no tasks.
    emptyState.style.display = tasks.length === 0 ? "block" : "none";

    // Create each task.
    tasks.forEach(task => {
        const taskItem = document.createElement("div");
        taskItem.className = "task-item";

        if (task.completed) {
            taskItem.classList.add("completed");
        }

        // Checkbox.
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", `Mark ${task.text} as completed`);

        checkbox.addEventListener("change", () => {
            toggleTask(task.id);
        });

        // Task description.
        const taskText = document.createElement("span");
        taskText.className = "task-text";
        taskText.textContent = task.text;

        // Delete button.
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-task";
        deleteButton.setAttribute("aria-label", `Delete ${task.text}`);
        deleteButton.innerHTML = '<i class="fa-regular fa-trash-can"></i>';

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        taskItem.appendChild(checkbox);
        taskItem.appendChild(taskText);
        taskItem.appendChild(deleteButton);

        taskList.appendChild(taskItem);
    });

    updateProgress();
}

// ======================================================
// UPDATE PROGRESS AND GENTLE REMINDERS
// ======================================================

function updateProgress() {
    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(task => task.completed).length;

    const remainingTasks = totalTasks - completedTasks;

    const percentage = totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100);

    // Update task counter.
    progressCount.textContent = `${completedTasks} of ${totalTasks} completed`;

    taskTotal.textContent = `${totalTasks} ${totalTasks === 1 ? "task" : "tasks"}`;

    // Update progress bar.
    progressFill.style.width = `${percentage}%`;

    progressTrack.setAttribute("aria-valuenow", percentage);

    // Update progress description.
    if (totalTasks === 0) {
        progressCaption.textContent = "Add a task to get started with your day.";
    } else if (remainingTasks === 0) {
        progressCaption.textContent = "Wonderful! You've completed everything on your list.";
    } else if (completedTasks === 0) {
        progressCaption.textContent = "Your day is just getting started. Take it one step at a time.";
    } else {
        progressCaption.textContent = `You've made a good start. ${remainingTasks} ${remainingTasks === 1 ? "task" : "tasks"} still to go.`;
    }

    // Show a gentle reminder after at least three tasks
    // have been completed, while there are still tasks left.
    if (completedTasks >= 3 && remainingTasks > 0) {
        reminderMessage.classList.add("show");

        reminderTitle.textContent = "You're doing so well!";

        reminderText.textContent =
            `You've completed ${completedTasks} things on your list. You still have ${remainingTasks} ${remainingTasks === 1 ? "thing" : "things"} left to do. Take a look when you're ready.`;

    } else if (totalTasks > 0 && remainingTasks === 0) {
        reminderMessage.classList.add("show");

        reminderTitle.textContent = "Everything is done!";

        reminderText.textContent =
            "You've completed all your tasks. Well done! Take a moment to enjoy your day.";

    } else {
        reminderMessage.classList.remove("show");
    }
}

// ======================================================
// INITIALISE PAGE
// ======================================================

displayDate();
renderTasks();

import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const APPROVED_EMAILS = [
  "sahaan@example.com",
  "farris@example.com"
];

const TEAM_MEMBERS = ["Sahaan", "Farris"];

const DEFAULT_ROLES = [
  "Coding",
  "Testing",
  "Marketing",
  "Emails"
];

let currentUser = null;
let activeSessionId = null;
let roles = [...DEFAULT_ROLES];

const loginPage = document.getElementById("loginPage");
const dashboardPage = document.getElementById("dashboardPage");

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");

const currentUserName = document.getElementById("currentUserName");
const activeSessionText = document.getElementById("activeSessionText");
const totalSessions = document.getElementById("totalSessions");
const openTasks = document.getElementById("openTasks");

const workRoleSelect = document.getElementById("workRoleSelect");
const workNotesInput = document.getElementById("workNotesInput");
const startWorkBtn = document.getElementById("startWorkBtn");
const endWorkBtn = document.getElementById("endWorkBtn");

const taskTitleInput = document.getElementById("taskTitleInput");
const taskRoleSelect = document.getElementById("taskRoleSelect");
const taskPersonSelect = document.getElementById("taskPersonSelect");
const addTaskBtn = document.getElementById("addTaskBtn");

const newRoleInput = document.getElementById("newRoleInput");
const addRoleBtn = document.getElementById("addRoleBtn");
const rolesList = document.getElementById("rolesList");

const taskList = document.getElementById("taskList");
const historyList = document.getElementById("historyList");

function showMessage(text) {
  loginMessage.textContent = text;
}

function isApprovedEmail(email) {
  return APPROVED_EMAILS.includes(email.toLowerCase());
}

function getPersonFromEmail(email) {
  if (email.toLowerCase().includes("sahaan")) return "Sahaan";
  if (email.toLowerCase().includes("farris")) return "Farris";
  return "Team";
}

function renderRoles() {
  workRoleSelect.innerHTML = "";
  taskRoleSelect.innerHTML = "";
  rolesList.innerHTML = "";

  roles.forEach(role => {
    const option1 = document.createElement("option");
    option1.value = role;
    option1.textContent = role;
    workRoleSelect.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = role;
    option2.textContent = role;
    taskRoleSelect.appendChild(option2);

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = role;
    rolesList.appendChild(chip);
  });
}

async function loadRoles() {
  const snapshot = await getDocs(collection(db, "roles"));

  if (snapshot.empty) {
    for (const role of DEFAULT_ROLES) {
      await addDoc(collection(db, "roles"), {
        name: role,
        createdAt: serverTimestamp()
      });
    }
    roles = [...DEFAULT_ROLES];
  } else {
    roles = snapshot.docs.map(doc => doc.data().name);
  }

  renderRoles();
}

async function addRole() {
  const role = newRoleInput.value.trim();

  if (!role) return;
  if (roles.includes(role)) {
    alert("That role already exists.");
    return;
  }

  await addDoc(collection(db, "roles"), {
    name: role,
    createdAt: serverTimestamp()
  });

  newRoleInput.value = "";
  await loadRoles();
}

async function startWork() {
  if (activeSessionId) {
    alert("You already have an active work session.");
    return;
  }

  const role = workRoleSelect.value;
  const notes = workNotesInput.value.trim();

  const session = await addDoc(collection(db, "workSessions"), {
    email: currentUser.email,
    person: getPersonFromEmail(currentUser.email),
    role,
    notes,
    startTime: new Date().toISOString(),
    endTime: null,
    totalMinutes: null,
    createdAt: serverTimestamp()
  });

  activeSessionId = session.id;
  activeSessionText.textContent = `Working on ${role}`;
  workNotesInput.value = "";

  await loadWorkHistory();
}

async function endWork() {
  if (!activeSessionId) {
    alert("No active session to end.");
    return;
  }

  const sessionsSnapshot = await getDocs(collection(db, "workSessions"));
  const sessionDoc = sessionsSnapshot.docs.find(item => item.id === activeSessionId);

  if (!sessionDoc) return;

  const data = sessionDoc.data();
  const start = new Date(data.startTime);
  const end = new Date();
  const totalMinutesValue = Math.round((end - start) / 60000);

  await updateDoc(doc(db, "workSessions", activeSessionId), {
    endTime: end.toISOString(),
    totalMinutes: totalMinutesValue
  });

  activeSessionId = null;
  activeSessionText.textContent = "Not started";

  await loadWorkHistory();
}

async function addTask() {
  const title = taskTitleInput.value.trim();
  const role = taskRoleSelect.value;
  const assignedTo = taskPersonSelect.value;

  if (!title) {
    alert("Please enter a task title.");
    return;
  }

  await addDoc(collection(db, "tasks"), {
    title,
    role,
    assignedTo,
    status: "To Do",
    createdAt: serverTimestamp()
  });

  taskTitleInput.value = "";
  await loadTasks();
}

async function loadTasks() {
  const snapshot = await getDocs(collection(db, "tasks"));
  const tasks = snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));

  taskList.innerHTML = "";

  const unfinishedTasks = tasks.filter(task => task.status !== "Done");
  openTasks.textContent = unfinishedTasks.length;

  if (tasks.length === 0) {
    taskList.innerHTML = `<p class="muted">No tasks yet.</p>`;
    return;
  }

  tasks.forEach(task => {
    const card = document.createElement("div");
    card.className = "task-card";

    card.innerHTML = `
      <div>
        <h3>${task.title}</h3>
        <span class="badge">${task.role}</span>
        <span class="badge">${task.assignedTo}</span>
        <span class="badge">${task.status}</span>
      </div>
      <div class="button-row">
        <button class="small-btn" data-action="progress" data-id="${task.id}">In Progress</button>
        <button class="small-btn" data-action="done" data-id="${task.id}">Done</button>
        <button class="small-btn danger-btn" data-action="delete" data-id="${task.id}">Delete</button>
      </div>
    `;

    taskList.appendChild(card);
  });

  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const action = button.dataset.action;

      if (action === "progress") {
        await updateDoc(doc(db, "tasks", id), {
          status: "In Progress"
        });
      }

      if (action === "done") {
        await updateDoc(doc(db, "tasks", id), {
          status: "Done"
        });
      }

      if (action === "delete") {
        await deleteDoc(doc(db, "tasks", id));
      }

      await loadTasks();
    });
  });
}

async function loadWorkHistory() {
  const snapshot = await getDocs(collection(db, "workSessions"));

  const sessions = snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));

  totalSessions.textContent = sessions.length;
  historyList.innerHTML = "";

  const active = sessions.find(session =>
    session.email === currentUser.email && session.endTime === null
  );

  if (active) {
    activeSessionId = active.id;
    activeSessionText.textContent = `Working on ${active.role}`;
  } else {
    activeSessionId = null;
    activeSessionText.textContent = "Not started";
  }

  if (sessions.length === 0) {
    historyList.innerHTML = `<p class="muted">No work sessions yet.</p>`;
    return;
  }

  sessions.reverse().forEach(session => {
    const card = document.createElement("div");
    card.className = "history-card";

    const start = new Date(session.startTime).toLocaleString();
    const end = session.endTime ? new Date(session.endTime).toLocaleString() : "Still active";
    const minutes = session.totalMinutes ? `${session.totalMinutes} minutes` : "In progress";

    card.innerHTML = `
      <h3>${session.person} — ${session.role}</h3>
      <p><strong>Start:</strong> ${start}</p>
      <p><strong>End:</strong> ${end}</p>
      <p><strong>Total:</strong> ${minutes}</p>
      <p class="muted">${session.notes || "No notes added."}</p>
    `;

    historyList.appendChild(card);
  });
}

async function loadDashboard() {
  currentUserName.textContent = getPersonFromEmail(currentUser.email);

  await loadRoles();
  await loadTasks();
  await loadWorkHistory();
}

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!isApprovedEmail(email)) {
    showMessage("Access denied. This email is not approved for Lucente.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showMessage(error.message);
  }
});

signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!isApprovedEmail(email)) {
    showMessage("Access denied. This email is not approved for Lucente.");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "approvedUsers", email), {
      email,
      person: getPersonFromEmail(email),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    showMessage(error.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

startWorkBtn.addEventListener("click", startWork);
endWorkBtn.addEventListener("click", endWork);
addTaskBtn.addEventListener("click", addTask);
addRoleBtn.addEventListener("click", addRole);

onAuthStateChanged(auth, async user => {
  if (!user) {
    currentUser = null;
    loginPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
    return;
  }

  if (!isApprovedEmail(user.email)) {
    await signOut(auth);
    showMessage("Access denied. This email is not approved for Lucente.");
    return;
  }

  currentUser = user;
  loginPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");

  await loadDashboard();
});
import { auth, db } from "./firebase.js";
import { renderCharts } from "./chart.js";

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
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const APPROVED_EMAILS = [
  "PUT_SAHAAN_EMAIL_HERE",
  "PUT_FARRIS_EMAIL_HERE"
];

const TEAM = ["Sahaan", "Farris"];
const DEFAULT_ROLES = ["Coding", "Testing", "Marketing", "Emails"];

let currentUser = null;
let activeSessionId = null;
let roles = [...DEFAULT_ROLES];

const $ = id => document.getElementById(id);

function approved(email) {
  return APPROVED_EMAILS.includes(email.toLowerCase());
}

function personFromEmail(email) {
  if (email.toLowerCase().includes("farris")) return "Farris";
  return "Sahaan";
}

function setMessage(text) {
  $("loginMessage").textContent = text;
}

function showDashboard(user) {
  $("loginPage").classList.add("hidden");
  $("dashboardPage").classList.remove("hidden");

  const name = personFromEmail(user.email);
  $("welcomeName").textContent = name;
}

function showLogin() {
  $("loginPage").classList.remove("hidden");
  $("dashboardPage").classList.add("hidden");
}

async function loadRoles() {
  const snap = await getDocs(collection(db, "roles"));

  if (snap.empty) {
    for (const role of DEFAULT_ROLES) {
      await addDoc(collection(db, "roles"), {
        name: role,
        createdAt: serverTimestamp()
      });
    }
    roles = [...DEFAULT_ROLES];
  } else {
    roles = snap.docs.map(d => d.data().name);
  }

  $("workRoleSelect").innerHTML = roles.map(r => `<option>${r}</option>`).join("");
  $("taskRoleSelect").innerHTML = roles.map(r => `<option>${r}</option>`).join("");
  $("rolesList").innerHTML = roles.map(r => `<span class="chip">${r}</span>`).join("");
}

async function addRole() {
  const role = $("newRoleInput").value.trim();
  if (!role) return;

  await addDoc(collection(db, "roles"), {
    name: role,
    createdAt: serverTimestamp()
  });

  $("newRoleInput").value = "";
  await loadRoles();
}

async function startWork() {
  if (activeSessionId) {
    alert("You already have an active session.");
    return;
  }

  const role = $("workRoleSelect").value;
  const notes = $("workNotesInput").value.trim();
  const person = personFromEmail(currentUser.email);

  const docRef = await addDoc(collection(db, "sessions"), {
    email: currentUser.email,
    person,
    role,
    notes,
    startTime: new Date().toISOString(),
    endTime: null,
    totalMinutes: 0,
    createdAt: serverTimestamp()
  });

  activeSessionId = docRef.id;
  $("workNotesInput").value = "";
  await loadAll();
}

async function endWork() {
  if (!activeSessionId) {
    alert("No active session.");
    return;
  }

  const snap = await getDocs(collection(db, "sessions"));
  const found = snap.docs.find(d => d.id === activeSessionId);
  if (!found) return;

  const data = found.data();
  const start = new Date(data.startTime);
  const end = new Date();
  const mins = Math.max(1, Math.round((end - start) / 60000));

  await updateDoc(doc(db, "sessions", activeSessionId), {
    endTime: end.toISOString(),
    totalMinutes: mins
  });

  activeSessionId = null;
  await loadAll();
}

async function addTask() {
  const title = $("taskTitleInput").value.trim();
  if (!title) return;

  await addDoc(collection(db, "tasks"), {
    title,
    role: $("taskRoleSelect").value,
    assignedTo: $("taskPersonSelect").value,
    deadline: $("taskDeadlineInput").value,
    status: "To Do",
    createdAt: serverTimestamp()
  });

  $("taskTitleInput").value = "";
  $("taskDeadlineInput").value = "";
  await loadAll();
}

async function loadTasks() {
  const snap = await getDocs(collection(db, "tasks"));
  const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  $("openTasks").textContent = tasks.filter(t => t.status !== "Done").length;

  $("taskList").innerHTML = tasks.length
    ? tasks.map(task => `
      <div class="task-card">
        <h3>${task.title}</h3>
        <div class="badges">
          <span class="badge">${task.role}</span>
          <span class="badge">${task.assignedTo}</span>
          <span class="badge">${task.status}</span>
          ${task.deadline ? `<span class="badge">Due ${task.deadline}</span>` : ""}
        </div>
        <div class="task-actions">
          <button onclick="window.updateTask('${task.id}', 'In Progress')">In Progress</button>
          <button onclick="window.updateTask('${task.id}', 'Done')">Done</button>
          <button class="danger" onclick="window.deleteTask('${task.id}')">Delete</button>
        </div>
      </div>
    `).join("")
    : `<p>No tasks yet.</p>`;

  $("deadlineList").innerHTML = tasks
    .filter(t => t.deadline && t.status !== "Done")
    .map(t => `<div class="item"><strong>${t.title}</strong><br>Due: ${t.deadline}</div>`)
    .join("") || `<p>No deadlines yet.</p>`;

  return tasks;
}

window.updateTask = async function(id, status) {
  await updateDoc(doc(db, "tasks", id), { status });
  await loadAll();
};

window.deleteTask = async function(id) {
  await deleteDoc(doc(db, "tasks", id));
  await loadAll();
};

async function addAnnouncement() {
  const text = $("announcementInput").value.trim();
  if (!text) return;

  await addDoc(collection(db, "announcements"), {
    text,
    createdAt: serverTimestamp()
  });

  $("announcementInput").value = "";
  await loadAll();
}

async function loadAnnouncements() {
  const snap = await getDocs(collection(db, "announcements"));
  const items = snap.docs.map(d => d.data()).reverse();

  $("announcementList").innerHTML = items.length
    ? items.map(a => `<div class="item">${a.text}</div>`).join("")
    : `<p>No announcements yet.</p>`;
}

async function addGoal() {
  const text = $("goalInput").value.trim();
  if (!text) return;

  await addDoc(collection(db, "goals"), {
    text,
    done: false,
    createdAt: serverTimestamp()
  });

  $("goalInput").value = "";
  await loadAll();
}

async function loadGoals() {
  const snap = await getDocs(collection(db, "goals"));
  const goals = snap.docs.map(d => d.data());

  $("goalCount").textContent = goals.length;

  $("goalList").innerHTML = goals.length
    ? goals.map(g => `<div class="item">${g.text}</div>`).join("")
    : `<p>No goals yet.</p>`;

  return goals;
}

async function loadSessions() {
  const snap = await getDocs(collection(db, "sessions"));
  const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const active = sessions.find(s => s.email === currentUser.email && !s.endTime);

  if (active) {
    activeSessionId = active.id;
    $("liveStatus").textContent = `${active.person} is working on ${active.role}`;
  } else {
    activeSessionId = null;
    $("liveStatus").textContent = "No active session";
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0);
  $("totalHours").textContent = `${(totalMinutes / 60).toFixed(1)}h`;

  $("historyList").innerHTML = sessions.length
    ? sessions.reverse().map(s => `
      <div class="history-card">
        <strong>${s.person} — ${s.role}</strong>
        <p>${s.notes || "No notes"}</p>
        <p>${new Date(s.startTime).toLocaleString()}</p>
        <p>${s.endTime ? `${s.totalMinutes} mins` : "Still working"}</p>
      </div>
    `).join("")
    : `<p>No work history yet.</p>`;

  return sessions;
}

function loadAchievements(tasks, sessions, goals) {
  const achievements = [];

  if (sessions.length >= 1) achievements.push("First work session");
  if (sessions.length >= 5) achievements.push("5 sessions completed");
  if (tasks.some(t => t.status === "Done")) achievements.push("First task completed");
  if (goals.length >= 1) achievements.push("First goal created");

  $("achievementCount").textContent = achievements.length;

  $("achievementList").innerHTML = achievements.length
    ? achievements.map(a => `<div class="item">🏆 ${a}</div>`).join("")
    : `<p>No achievements yet.</p>`;
}

async function loadAll() {
  await loadRoles();
  const tasks = await loadTasks();
  await loadAnnouncements();
  const goals = await loadGoals();
  const sessions = await loadSessions();

  loadAchievements(tasks, sessions, goals);
  renderCharts(sessions, TEAM);
}

$("loginBtn").addEventListener("click", async () => {
  const email = $("emailInput").value.trim().toLowerCase();
  const password = $("passwordInput").value;

  if (!approved(email)) {
    setMessage("Access denied. This email is not approved.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    setMessage(err.message);
  }
});

$("signupBtn").addEventListener("click", async () => {
  const email = $("emailInput").value.trim().toLowerCase();
  const password = $("passwordInput").value;

  if (!approved(email)) {
    setMessage("Access denied. This email is not approved.");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    setMessage(err.message);
  }
});

$("logoutBtn").addEventListener("click", () => signOut(auth));

$("startWorkBtn").addEventListener("click", startWork);
$("endWorkBtn").addEventListener("click", endWork);
$("addTaskBtn").addEventListener("click", addTask);
$("addRoleBtn").addEventListener("click", addRole);
$("addAnnouncementBtn").addEventListener("click", addAnnouncement);
$("addGoalBtn").addEventListener("click", addGoal);

$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    currentUser = null;
    showLogin();
    return;
  }

  if (!approved(user.email)) {
    await signOut(auth);
    setMessage("Access denied.");
    return;
  }

  currentUser = user;
  showDashboard(user);
  await loadAll();
});
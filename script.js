// script.js (module) - Firebase + UI wiring
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ---------- Firebase config (yours) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyCcd1CCTlJRZ2YOhbziRVdiZlvVzUHiYm4",
  authDomain: "video-tracker-7f709.firebaseapp.com",
  projectId: "video-tracker-7f709",
  storageBucket: "video-tracker-7f709.appspot.com",
  messagingSenderId: "6567580876",
  appId: "1:6567580876:web:e982351a06897faea45e69",
  measurementId: "G-554K9DJVCJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- Clock ---------- */
function tick() {
  const el = document.getElementById('clockDisplay') || document.getElementById('clock');
  if (el) el.textContent = new Date().toLocaleTimeString();
}
setInterval(tick, 1000);
tick();

/* ---------- Auth UI handlers (wired to HTML) ---------- */
let isLogin = true;

window.toggleAuthMode = function () {
  isLogin = !isLogin;
  const title = document.getElementById("formTitle");
  const btn = document.getElementById("authButton");
  const toggleText = document.getElementById("toggleText");
  const err = document.getElementById("loginError");
  err.textContent = "";
  if (isLogin) {
    title.innerText = "Sign In";
    btn.innerText = "Login";
    toggleText.innerText = "Sign Up";
  } else {
    title.innerText = "Sign Up";
    btn.innerText = "Register";
    toggleText.innerText = "Sign In";
  }
};

window.login = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");
  error.textContent = "";
  if (!email || !password) {
    error.textContent = "Enter email and password.";
    return;
  }

  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
      // after register, optionally switch to login
      isLogin = true;
      toggleAuthMode();
      alert("Account created. Please login.");
    }
  } catch (err) {
    console.error(err);
    error.textContent = "❌ " + (err.message || "Auth error");
  }
};

window.showReset = function () {
  const email = document.getElementById("email").value.trim();
  if (!email) return alert("Please enter your email to reset password.");
  sendPasswordResetEmail(auth, email)
    .then(() => alert("Password reset email sent."))
    .catch(e => alert("Reset failed: " + e.message));
};

window.logout = function () {
  signOut(auth).catch(e => console.warn("Sign out failed", e));
};

/* ---------- Auth state changes ---------- */
onAuthStateChanged(auth, user => {
  const authPage = document.getElementById('authPage');
  const appPanel = document.getElementById('appPanel');
  const userBadge = document.getElementById('userBadge');
  const userEmail = document.getElementById('userEmail');
  if (user) {
    if (authPage) authPage.classList.add('hidden');
    if (appPanel) appPanel.style.display = 'block';
    if (userBadge) { userBadge.style.display = 'block'; userEmail.textContent = user.email || ''; }
    loadUploads();
  } else {
    if (authPage) authPage.classList.remove('hidden');
    if (appPanel) appPanel.style.display = 'none';
    if (userBadge) userBadge.style.display = 'none';
    // keep charts cleared
    updateChart({});
    updatePie({});
  }
});

/* ---------- Firestore uploads ---------- */
window.addUpload = async function () {
  const date = document.getElementById("date").value;
  const platform = document.getElementById("platform").value;
  const title1 = document.getElementById("title1").value.trim();
  const title2 = document.getElementById("title2").value.trim();
  const title3 = document.getElementById("title3").value.trim();
  if (!date || !platform || !title1) return alert("Please fill date, platform and Title 1.");
  try {
    await addDoc(collection(db, "uploads"), { date, platform, title1, title2, title3 });
    document.getElementById("title1").value = "";
    document.getElementById("title2").value = "";
    document.getElementById("title3").value = "";
    await loadUploads();
  } catch (e) {
    alert("Save failed: " + e.message);
  }
};

window.deleteUpload = async function (id) {
  if (!confirm("Delete this upload?")) return;
  try {
    await deleteDoc(doc(db, "uploads", id));
    await loadUploads();
  } catch (e) {
    alert("Delete failed: " + e.message);
  }
};

async function loadUploads() {
  const tbody = document.querySelector("#uploadTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  try {
    const snapshot = await getDocs(collection(db, "uploads"));
    const stats = {};
    let total = 0;
    snapshot.forEach(s => {
      const e = s.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${e.date || ''}</td>
        <td>${e.platform || ''}</td>
        <td>${escapeHtml(e.title1 || '')}</td>
        <td>${escapeHtml(e.title2 || '')}</td>
        <td>${escapeHtml(e.title3 || '')}</td>
        <td><button class="delete-btn" onclick="deleteUpload('${s.id}')">🗑️</button></td>
      `;
      tbody.appendChild(tr);
      stats[e.platform] = (stats[e.platform] || 0) + 1;
      total++;
    });
    document.getElementById("totalUploads").textContent = total;
    updateChart(stats);
    updatePie(stats);
  } catch (e) {
    console.error(e);
    alert("Could not load uploads: " + e.message);
  }
}

/* ---------- CSV & PNG Export ---------- */
window.downloadCSV = async function () {
  try {
    const snapshot = await getDocs(collection(db, "uploads"));
    let csv = "Date,Platform,Title1,Title2,Title3\n";
    snapshot.forEach(s => {
      const e = s.data();
      const escape = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
      csv += [e.date || "", e.platform || "", escape(e.title1), escape(e.title2), escape(e.title3)].join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `uploads_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  } catch (e) {
    alert("Export failed: " + e.message);
  }
};

window.downloadPNG = function () {
  const canvas = document.getElementById("uploadChart");
  if (!canvas) return alert("No chart to export.");
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `upload_chart_${new Date().toISOString().slice(0,10)}.png`;
  link.click();
};

/* ---------- Charts (Chart.js) ---------- */
let barChart = null;
let pieChart = null;

function updateChart(data) {
  const labels = Object.keys(data || {});
  const values = labels.map(k => data[k] || 0);
  const ctx = document.getElementById("uploadChart")?.getContext("2d");
  if (!ctx) return;
  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Uploads",
        data: values,
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 8
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { ticks: { color: "#fff", beginAtZero: true } }
      }
    }
  });
}

function updatePie(data) {
  const labels = Object.keys(data || {});
  const values = labels.map(k => data[k] || 0);
  const ctx = document.getElementById("uploadPie")?.getContext("2d");
  if (!ctx) return;
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ["#ffce56", "#36a2eb", "#ff6384"]
      }]
    },
    options: {
      plugins: { legend: { labels: { color: "#fff" } } }
    }
  });
}

/* ---------- UI helpers ---------- */
window.toggleAppPanel = function () {
  const panel = document.getElementById("appPanel");
  if (!panel) return;
  panel.style.display = (panel.style.display === "none" || panel.style.display === "") ? "block" : "none";
};

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

/* ---------- Init: hide panel by default ---------- */
document.getElementById("appPanel").style.display = "none";

/* Expose a couple helpers for console/testing */
window._updateCharts = () => { loadUploads(); };

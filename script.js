// Firebase Config + Setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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

// ⏰ Live Clock
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// 🔄 Toggle Form
window.toggleForm = function (showSignup) {
  document.getElementById("signupSection").classList.toggle("hidden", !showSignup);
  document.getElementById("loginSection").classList.toggle("hidden", showSignup);
};

// 🔑 Login
window.login = function () {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  const error = document.getElementById("loginError");

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => (error.textContent = ""))
    .catch(() => (error.textContent = "❌ Invalid credentials"));
};

// 🆕 Signup
window.signup = function () {
  const email = document.getElementById("signupEmail").value;
  const pass = document.getElementById("signupPassword").value;
  const error = document.getElementById("signupError");

  createUserWithEmailAndPassword(auth, email, pass)
    .then(() => {
      error.textContent = "✅ Registered successfully!";
      toggleForm(false);
    })
    .catch(err => (error.textContent = "❌ " + err.message));
};

// 👁️ Auth State Listener
onAuthStateChanged(auth, user => {
  document.getElementById("authCard").classList.toggle("hidden", !!user);
  document.getElementById("appPage").classList.toggle("hidden", !user);
  if (user) loadUploads();
});

// 🚪 Logout
window.logout = () => signOut(auth);

// ➕ Add Upload
window.addUpload = async function () {
  const date = document.getElementById("date").value;
  const platform = document.getElementById("platform").value;
  const title1 = document.getElementById("title1").value;
  const title2 = document.getElementById("title2").value;
  const title3 = document.getElementById("title3").value;

  if (!date || !platform) return alert("Fill all required fields");

  await addDoc(collection(db, "uploads"), {
    date, platform, title1, title2, title3
  });

  ["title1", "title2", "title3"].forEach(id => document.getElementById(id).value = "");
  loadUploads();
};

// 📥 Load Uploads
async function loadUploads() {
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";

  const snapshot = await getDocs(collection(db, "uploads"));
  const stats = {};

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${data.date}</td>
      <td>${data.platform}</td>
      <td>${data.title1}</td>
      <td>${data.title2}</td>
      <td>${data.title3}</td>
      <td><button class="delete-btn" onclick="deleteUpload('${docSnap.id}')">🗑️</button></td>`;
    table.appendChild(tr);

    stats[data.platform] = (stats[data.platform] || 0) + 1;
  });

  updateCharts(stats);
}

// 🗑️ Delete Upload
window.deleteUpload = async function (id) {
  await deleteDoc(doc(db, "uploads", id));
  loadUploads();
};

// 📤 Download CSV
window.downloadCSV = async function () {
  const snapshot = await getDocs(collection(db, "uploads"));
  let csv = "Date,Platform,Title 1,Title 2,Title 3\n";

  snapshot.forEach(doc => {
    const d = doc.data();
    csv += `${d.date},${d.platform},"${d.title1}","${d.title2}","${d.title3}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "uploads.csv";
  link.click();
};

// 📊 Charts
let barChart, pieChart;

function updateCharts(stats) {
  const labels = Object.keys(stats);
  const data = Object.values(stats);

  // Destroy previous charts
  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  const ctx1 = document.getElementById("uploadChart").getContext("2d");
  const ctx2 = document.getElementById("pieChart").getContext("2d");

  barChart = new Chart(ctx1, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Uploads per Platform",
        data,
        backgroundColor: ["#0ff", "#ff6", "#f88"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Platform Uploads (Bar)", color: "#0ff" }
      },
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { ticks: { color: "#fff" } }
      }
    }
  });

  pieChart = new Chart(ctx2, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        label: "Uploads Share",
        data,
        backgroundColor: ["#36a2eb", "#ff6384", "#cc65fe"]
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: "Platform Distribution (Pie)", color: "#0ff" },
        legend: { labels: { color: "#fff" } }
      }
    }
  });
}

// Firebase SDK Imports
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

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCcd1CCTlJRZ2YOhbziRVdiZlvVzUHiYm4",
  authDomain: "video-tracker-7f709.firebaseapp.com",
  projectId: "video-tracker-7f709",
  storageBucket: "video-tracker-7f709.appspot.com",
  messagingSenderId: "6567580876",
  appId: "1:6567580876:web:e982351a06897faea45e69",
  measurementId: "G-554K9DJVCJ"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ⏰ Clock
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// 🔐 Login
window.login = function () {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const error = document.getElementById("loginError");

  signInWithEmailAndPassword(auth, email, password)
    .then(() => error.textContent = "")
    .catch(() => error.textContent = "❌ Invalid credentials.");
};

// 🆕 Sign Up
window.signup = function () {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const error = document.getElementById("signupError");

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => error.textContent = "✅ Account created. Please log in.")
    .catch((e) => error.textContent = "❌ " + e.message);
};

// 🔁 Forgot Password
window.forgotPassword = function () {
  const email = document.getElementById("loginEmail").value;
  const error = document.getElementById("loginError");

  if (!email) {
    error.textContent = "❌ Enter your email first.";
    return;
  }

  sendPasswordResetEmail(auth, email)
    .then(() => {
      error.textContent = "📧 Password reset link sent!";
    })
    .catch(() => {
      error.textContent = "❌ Failed to send reset email.";
    });
};

// 👥 Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("signupPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");
    loadUploads();
  } else {
    document.getElementById("appPage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
  }
});

// 🚪 Logout
window.logout = function () {
  signOut(auth);
};

// ➕ Add Upload
window.addUpload = async function () {
  const date = document.getElementById("date").value;
  const platform = document.getElementById("platform").value;
  const title1 = document.getElementById("title1").value;
  const title2 = document.getElementById("title2").value;
  const title3 = document.getElementById("title3").value;

  if (!date || !platform) return alert("Fill date and platform.");

  await addDoc(collection(db, "uploads"), {
    date, platform, title1, title2, title3
  });

  document.getElementById("title1").value = "";
  document.getElementById("title2").value = "";
  document.getElementById("title3").value = "";
  loadUploads();
};

// 📥 Load Uploads
async function loadUploads() {
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";
  const snapshot = await getDocs(collection(db, "uploads"));
  const stats = {};

  snapshot.forEach(docSnap => {
    const e = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.date}</td>
      <td>${e.platform}</td>
      <td>${e.title1}</td>
      <td>${e.title2}</td>
      <td>${e.title3}</td>
      <td><button class="delete-btn" onclick="deleteUpload('${docSnap.id}')">🗑️</button></td>
    `;
    table.appendChild(tr);
    stats[e.platform] = (stats[e.platform] || 0) + 1;
  });

  updateCharts(stats);
}

// 🗑️ Delete
window.deleteUpload = async function (id) {
  await deleteDoc(doc(db, "uploads", id));
  loadUploads();
};

// ⬇️ Download CSV
window.downloadCSV = async function () {
  const snapshot = await getDocs(collection(db, "uploads"));
  let csv = "Date,Platform,Title 1,Title 2,Title 3\n";
  snapshot.forEach(docSnap => {
    const e = docSnap.data();
    csv += `${e.date},${e.platform},"${e.title1}","${e.title2}","${e.title3}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "uploads.csv";
  link.click();
};

// 📊 Chart.js
let barChart, pieChart;
function updateCharts(data) {
  const labels = Object.keys(data);
  const values = Object.values(data);
  const colors = ["#ff6384", "#36a2eb", "#ffcd56"];

  const barCtx = document.getElementById("uploadChart").getContext("2d");
  const pieCtx = document.getElementById("uploadPie").getContext("2d");

  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Uploads",
        data: values,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Uploads per Platform",
          color: "#0ff"
        }
      },
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { ticks: { color: "#fff" } }
      }
    }
  });

  pieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        label: "Upload Share",
        data: values,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#fff" } },
        title: {
          display: true,
          text: "Platform Share (Pie)",
          color: "#0ff"
        }
      }
    }
  });
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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

// Firebase config
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

// Clock
function updateClock() {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// Sign In
window.login = () => {
  const email = emailInput().value;
  const password = passwordInput().value;
  const error = document.getElementById("loginError");

  signInWithEmailAndPassword(auth, email, password)
    .then(() => error.textContent = "")
    .catch(() => error.textContent = "❌ Invalid email or password.");
};

// Sign Up
window.signup = () => {
  const email = emailInput().value;
  const password = passwordInput().value;
  const error = document.getElementById("loginError");

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => error.textContent = "✅ Account created.")
    .catch(e => error.textContent = e.message);
};

// Forgot Password
window.forgotPassword = () => {
  const email = emailInput().value;
  if (!email) return alert("Enter your email first.");
  sendPasswordResetEmail(auth, email)
    .then(() => alert("📩 Reset link sent!"))
    .catch(e => alert("Error: " + e.message));
};

// Auth Observer
onAuthStateChanged(auth, user => {
  document.getElementById("authPage").classList.toggle("hidden", !!user);
  document.getElementById("appPage").classList.toggle("hidden", !user);
  if (user) loadUploads();
});

// Logout
window.logout = () => signOut(auth);

// Upload Entry
window.addUpload = async () => {
  const date = val("date");
  const platform = val("platform") || "Unknown";
  const title1 = val("title1"), title2 = val("title2"), title3 = val("title3");
  if (!date || !platform) return alert("Fill all fields");

  await addDoc(collection(db, "uploads"), { date, platform, title1, title2, title3 });
  clearInputs(["title1", "title2", "title3"]);
  loadUploads();
};

// Load Table + Stats
async function loadUploads() {
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";
  const snapshot = await getDocs(collection(db, "uploads"));
  const stats = {};

  snapshot.forEach(docSnap => {
    const entry = docSnap.data();
    const platform = entry.platform?.trim() || "Unknown";
    stats[platform] = (stats[platform] || 0) + 1;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${platform}</td>
      <td>${entry.title1}</td>
      <td>${entry.title2}</td>
      <td>${entry.title3}</td>
      <td><button class="delete-btn" onclick="deleteUpload('${docSnap.id}')">🗑️</button></td>
    `;
    table.appendChild(tr);
  });

  updateChart(stats);
  updatePie(stats);
}

// Delete
window.deleteUpload = async id => {
  await deleteDoc(doc(db, "uploads", id));
  loadUploads();
};

// Export CSV
window.downloadCSV = async () => {
  const snapshot = await getDocs(collection(db, "uploads"));
  let csv = "Date,Platform,Title 1,Title 2,Title 3\n";
  snapshot.forEach(d => {
    const e = d.data();
    csv += `${e.date},${e.platform},"${e.title1}","${e.title2}","${e.title3}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "uploads.csv";
  link.click();
};

// Charts
let chart, pieChart;
function updateChart(data) {
  const ctx = document.getElementById("uploadChart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [{ label: "Uploads", data: Object.values(data), backgroundColor: ["#36a2eb", "#ff6384", "#cc65fe"] }]
    },
    options: {
      plugins: { legend: { display: false }, title: { display: true, text: "Uploads Per Platform", color: "#0ff" }},
      scales: { x: { ticks: { color: "#fff" } }, y: { ticks: { color: "#fff" } }}
    }
  });
}

function updatePie(data) {
  const ctx = document.getElementById("uploadPieChart").getContext("2d");
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Uploads",
        data: Object.values(data),
        backgroundColor: ["#ff6384", "#36a2eb", "#cc65fe", "#00e6ac", "#ffaa00"]
      }]
    },
    options: {
      plugins: {
        legend: { position: "right", labels: { color: "#fff" }},
        title: { display: true, text: "Upload Distribution", color: "#0ff" }
      }
    }
  });
}

// Helpers
const val = id => document.getElementById(id).value;
const clearInputs = ids => ids.forEach(id => document.getElementById(id).value = "");
const emailInput = () => document.getElementById("email");
const passwordInput = () => document.getElementById("password");

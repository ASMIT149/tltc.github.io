// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
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
  appId: "1:6567580876:web:e982351a06897faea45e69"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth
window.login = function () {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  signInWithEmailAndPassword(auth, email, password).catch(err => {
    document.getElementById("loginError").textContent = err.message;
  });
};

window.signup = function () {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  createUserWithEmailAndPassword(auth, email, password).catch(err => {
    document.getElementById("signupError").textContent = err.message;
  });
};

window.resetPassword = function () {
  const email = document.getElementById("resetEmail").value;
  sendPasswordResetEmail(auth, email)
    .then(() => alert("Password reset email sent!"))
    .catch(err => {
      document.getElementById("resetError").textContent = err.message;
    });
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, user => {
  document.getElementById("authContainer").classList.toggle("hidden", !!user);
  document.getElementById("appPage").classList.toggle("hidden", !user);
  if (user) loadUploads();
});

window.toggleForms = function (form = null) {
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("signupForm").classList.add("hidden");
  document.getElementById("forgotPasswordForm").classList.add("hidden");

  if (form === "login") {
    document.getElementById("loginForm").classList.remove("hidden");
  } else {
    document.getElementById("signupForm").classList.toggle("hidden");
    document.getElementById("loginForm").classList.toggle("hidden");
  }
};

window.showForgotPassword = function () {
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("forgotPasswordForm").classList.remove("hidden");
};

// Upload logic
window.addUpload = async function () {
  const date = document.getElementById("date").value;
  const platform = document.getElementById("platform").value;
  const title1 = document.getElementById("title1").value;
  const title2 = document.getElementById("title2").value;
  const title3 = document.getElementById("title3").value;

  if (!date || !platform) return alert("Fill all required fields");

  await addDoc(collection(db, "uploads"), { date, platform, title1, title2, title3 });
  loadUploads();
};

window.deleteUpload = async function (id) {
  await deleteDoc(doc(db, "uploads", id));
  loadUploads();
};

window.downloadCSV = async function () {
  const snapshot = await getDocs(collection(db, "uploads"));
  let csv = "Date,Platform,Title 1,Title 2,Title 3\n";
  snapshot.forEach(doc => {
    const d = doc.data();
    csv += `${d.date},${d.platform},${d.title1},${d.title2},${d.title3}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "uploads.csv";
  link.click();
};

async function loadUploads() {
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";
  const stats = {};
  const snapshot = await getDocs(collection(db, "uploads"));

  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    stats[d.platform] = (stats[d.platform] || 0) + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.date}</td>
      <td>${d.platform}</td>
      <td>${d.title1}</td>
      <td>${d.title2}</td>
      <td>${d.title3}</td>
      <td><button class="delete-btn" onclick="deleteUpload('${docSnap.id}')">🗑️</button></td>
    `;
    table.appendChild(tr);
  });

  drawCharts(stats);
}

let barChart, pieChart;
function drawCharts(data) {
  const barCtx = document.getElementById("uploadChart").getContext("2d");
  const pieCtx = document.getElementById("pieChart").getContext("2d");
  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  const labels = Object.keys(data);
  const values = Object.values(data);

  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Uploads per Platform",
        data: values,
        backgroundColor: ["#ff6384", "#36a2eb", "#cc65fe"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Platform Statistics" }
      }
    }
  });

  pieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        label: "Distribution",
        data: values,
        backgroundColor: ["#ff9f40", "#4bc0c0", "#9966ff"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

setInterval(() => {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString();
}, 1000);

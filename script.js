// 🔥 Firebase Config
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
import { Chart } from "https://cdn.jsdelivr.net/npm/chart.js";

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

// 🕒 Clock
setInterval(() => {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString();
}, 1000);

// 🔐 Auth
window.signup = () => {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => alert("✅ User registered! Now Sign In."))
    .catch(err => alert("❌ " + err.message));
};

window.signin = () => {
  const email = document.getElementById("signinEmail").value;
  const password = document.getElementById("signinPassword").value;
  signInWithEmailAndPassword(auth, email, password)
    .catch(err => alert("❌ " + err.message));
};

window.resetPassword = () => {
  const email = prompt("Enter your registered email to reset password:");
  if (email) {
    sendPasswordResetEmail(auth, email)
      .then(() => alert("📧 Password reset link sent!"))
      .catch(err => alert("❌ " + err.message));
  }
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, user => {
  document.getElementById("authPage").style.display = user ? "none" : "block";
  document.getElementById("appPage").style.display = user ? "block" : "none";
  if (user) loadUploads();
});

// 📦 Data Handling
window.addUpload = async () => {
  const date = document.getElementById("date").value;
  const platform = document.getElementById("platform").value;
  const title1 = document.getElementById("title1").value;
  const title2 = document.getElementById("title2").value;
  const title3 = document.getElementById("title3").value;

  if (!date || !platform) return alert("Please enter all required fields");

  await addDoc(collection(db, "uploads"), { date, platform, title1, title2, title3 });
  loadUploads();
};

window.deleteUpload = async id => {
  await deleteDoc(doc(db, "uploads", id));
  loadUploads();
};

let barChart, pieChart;

async function loadUploads() {
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";
  const stats = {};

  const snapshot = await getDocs(collection(db, "uploads"));
  snapshot.forEach(docSnap => {
    const e = docSnap.data();
    stats[e.platform] = (stats[e.platform] || 0) + 1;
    table.innerHTML += `
      <tr>
        <td>${e.date}</td>
        <td>${e.platform}</td>
        <td>${e.title1}</td>
        <td>${e.title2}</td>
        <td>${e.title3}</td>
        <td><button class="delete-btn" onclick="deleteUpload('${docSnap.id}')">🗑️</button></td>
      </tr>`;
  });

  renderCharts(stats);
}

function renderCharts(data) {
  const barCtx = document.getElementById("barChart").getContext("2d");
  const pieCtx = document.getElementById("pieChart").getContext("2d");
  const labels = Object.keys(data);
  const values = Object.values(data);

  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Uploads Per Platform",
        data: values,
        backgroundColor: ["#00f2fe", "#ff6b6b", "#ffc107"]
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Uploads Per Platform",
          color: "#00ffff"
        },
        legend: { display: false }
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
        label: "Upload Distribution",
        data: values,
        backgroundColor: ["#00f2fe", "#ff6b6b", "#ffc107"]
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Upload Distribution",
          color: "#00ffff"
        },
        legend: {
          labels: { color: "#fff" }
        }
      }
    }
  });
}

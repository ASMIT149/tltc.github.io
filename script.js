// ✅ Full JavaScript (script.js) with fixed chart labels + sign up, sign in, stats
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
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
  appId: "1:6567580876:web:e982351a06897faea45e69"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🕒 Clock
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// 🔐 Login
window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");

  signInWithEmailAndPassword(auth, email, password)
    .then(() => (error.textContent = ""))
    .catch(() => (error.textContent = "❌ Invalid email or password."));
};

// 🆕 Sign Up
window.signup = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => (error.textContent = "Account created successfully!"))
    .catch((e) => (error.textContent = "❌ " + e.message));
};

// 🔁 Forgot Password
window.resetPassword = function () {
  const email = document.getElementById("email").value;
  if (!email) return alert("Enter your email to reset password");
  sendPasswordResetEmail(auth, email)
    .then(() => alert("Reset link sent! Check your email."))
    .catch((e) => alert("Error: " + e.message));
};

// 🔄 Auth Change
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");
    document.getElementById("appPage").classList.add("animate-dashboard");
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
  if (!date || !platform) return alert("Please fill all required fields");

  await addDoc(collection(db, "uploads"), {
    date,
    platform,
    title1,
    title2,
    title3
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

  snapshot.forEach((docSnap) => {
    const entry = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.platform}</td>
      <td>${entry.title1}</td>
      <td>${entry.title2}</td>
      <td>${entry.title3}</td>
      <td><button class="delete-btn" onclick="deleteUpload('${docSnap.id}')">🗑️</button></td>
    `;
    table.appendChild(tr);
    stats[entry.platform] = (stats[entry.platform] || 0) + 1;
  });

  updateChart(stats);
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
  snapshot.forEach((docSnap) => {
    const e = docSnap.data();
    csv += `${e.date},${e.platform},"${e.title1}","${e.title2}","${e.title3}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "uploads.csv";
  link.click();
};

// 📊 Chart
function updateChart(data) {
  const ctxBar = document.getElementById("uploadChart").getContext("2d");
  const ctxPie = document.getElementById("uploadPie").getContext("2d");

  if (window.barChart) window.barChart.destroy();
  if (window.pieChart) window.pieChart.destroy();

  window.barChart = new Chart(ctxBar, {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Uploads",
        data: Object.values(data),
        backgroundColor: ["#2196f3", "#ff4081", "#4caf50"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Uploads Per Platform",
          color: "#00ffff",
          font: { size: 16 }
        }
      },
      scales: {
        x: {
          ticks: { color: "#fff", font: { size: 14 } },
          title: { display: true, text: "Platform", color: "#fff" }
        },
        y: {
          ticks: { color: "#fff", font: { size: 14 } },
          title: { display: true, text: "Upload Count", color: "#fff" }
        }
      }
    }
  });

  window.pieChart = new Chart(ctxPie, {
    type: "pie",
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ["#2196f3", "#ff4081", "#4caf50"]
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Upload Distribution",
          color: "#00ffff",
          font: { size: 16 }
        },
        legend: {
          labels: {
            color: "#fff",
            font: { size: 14 }
          }
        }
      }
    }
  });
}

// Firebase Setup
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

// Auth
let isLogin = true;

window.toggleAuthMode = function () {
  const title = document.getElementById("formTitle");
  const btn = document.getElementById("authButton");
  const toggleText = document.getElementById("toggleText");
  isLogin = !isLogin;
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

window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");

  if (!isLogin) {
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => error.textContent = "")
      .catch(err => error.textContent = err.message);
  } else {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => error.textContent = "")
      .catch(err => error.textContent = "❌ Invalid email or password.");
  }
};

window.showReset = function () {
  const email = document.getElementById("email").value;
  const error = document.getElementById("loginError");
  if (!email) return alert("Please enter your email to reset password");

  sendPasswordResetEmail(auth, email)
    .then(() => alert("Password reset email sent!"))
    .catch((err) => error.textContent = err.message);
};

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById("authPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");
    loadUploads();
  } else {
    document.getElementById("appPage").classList.add("hidden");
    document.getElementById("authPage").classList.remove("hidden");
  }
});

window.logout = function () {
  signOut(auth);
};

window.addUpload = async function () {
  const date = document.getElementById("date").value;
  const platform = document.getElementById("platform").value;
  const title1 = document.getElementById("title1").value;
  const title2 = document.getElementById("title2").value;
  const title3 = document.getElementById("title3").value;

  if (!date || !platform) return alert("Please fill all required fields");

  await addDoc(collection(db, "uploads"), {
    date, platform, title1, title2, title3
  });

  document.getElementById("title1").value = "";
  document.getElementById("title2").value = "";
  document.getElementById("title3").value = "";

  loadUploads();
};

window.deleteUpload = async function (id) {
  await deleteDoc(doc(db, "uploads", id));
  loadUploads();
};

async function loadUploads() {
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";
  const snapshot = await getDocs(collection(db, "uploads"));
  const stats = {};
  let count = 0;

  snapshot.forEach(docSnap => {
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
    count++;
  });

  document.getElementById("totalUploads").textContent = count;
  updateChart(stats);
  updatePie(stats);
}

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

window.downloadPNG = function () {
  const canvas = document.getElementById("uploadChart");
  const link = document.createElement("a");
  link.download = "chart.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
};

let chart;
function updateChart(data) {
  const ctx = document.getElementById("uploadChart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Uploads per Platform",
        data: Object.values(data),
        backgroundColor: ["#ff6384", "#36a2eb", "#cc65fe"]
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Uploads by Platform",
          color: "#0ff"
        },
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { ticks: { color: "#fff" } }
      }
    }
  });
}

let pie;
function updatePie(data) {
  const ctx = document.getElementById("uploadPie").getContext("2d");
  if (pie) pie.destroy();
  pie = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ["#ffce56", "#36a2eb", "#ff6384"]
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Upload Distribution",
          color: "#0ff"
        },
        legend: {
          labels: {
            color: "#fff"
          }
        }
      }
    }
  });
}

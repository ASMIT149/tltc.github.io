// Firebase Imports
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
  appId: "1:6567580876:web:e982351a06897faea45e69"
};

// Init Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Clock
setInterval(() => {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString();
}, 1000);

// UI Toggles
const loginPage = document.getElementById("loginPage");
const appPage = document.getElementById("appPage");
const toggleBtn = document.getElementById("toggleLogin");
const authTitle = document.getElementById("authTitle");
const loginBtn = document.getElementById("loginBtn");
let isLogin = true;

toggleBtn.onclick = () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? "Login" : "Sign Up";
  loginBtn.textContent = isLogin ? "Login" : "Sign Up";
  toggleBtn.textContent = isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login";
};

// Auth Functions
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");
  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
    error.textContent = "";
  } catch (err) {
    error.textContent = err.message;
  }
};

// Forgot Password
window.forgotPassword = () => {
  const email = document.getElementById("email").value;
  if (!email) return alert("Enter email to reset password");
  sendPasswordResetEmail(auth, email)
    .then(() => alert("Reset link sent to email"))
    .catch((err) => alert(err.message));
};

// Auth State Check
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginPage.classList.add("hidden");
    appPage.classList.remove("hidden");
    loadUploads();
  } else {
    loginPage.classList.remove("hidden");
    appPage.classList.add("hidden");
  }
});

// Logout
window.logout = () => signOut(auth);

// Add Upload
window.addUpload = async () => {
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
  ["title1", "title2", "title3"].forEach(id => document.getElementById(id).value = "");
  loadUploads();
};

// Load Uploads + Chart
let chart1, chart2;
async function loadUploads() {
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";
  const snapshot = await getDocs(collection(db, "uploads"));
  const stats = {};

  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    stats[d.platform] = (stats[d.platform] || 0) + 1;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${d.date}</td>
      <td>${d.platform}</td>
      <td>${d.title1}</td>
      <td>${d.title2}</td>
      <td>${d.title3}</td>
      <td><button class="delete-btn" onclick="deleteUpload('${docSnap.id}')">🗑️</button></td>
    `;
    table.appendChild(row);
  });

  updateCharts(stats);
}

// Delete
window.deleteUpload = async (id) => {
  await deleteDoc(doc(db, "uploads", id));
  loadUploads();
};

// Export
window.downloadCSV = async () => {
  const snapshot = await getDocs(collection(db, "uploads"));
  let csv = "Date,Platform,Title 1,Title 2,Title 3\n";
  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    csv += `${d.date},${d.platform},"${d.title1}","${d.title2}","${d.title3}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "uploads.csv";
  link.click();
};

// Update Chart
function updateCharts(data) {
  const ctx1 = document.getElementById("uploadChart").getContext("2d");
  const ctx2 = document.getElementById("uploadPie").getContext("2d");
  if (chart1) chart1.destroy();
  if (chart2) chart2.destroy();

  chart1 = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Uploads",
        data: Object.values(data),
        backgroundColor: ["#36a2eb", "#ff6384", "#4bc0c0", "#ffce56"]
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Uploads Per Platform",
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

  chart2 = new Chart(ctx2, {
    type: "pie",
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ["#36a2eb", "#ff6384", "#4bc0c0", "#ffce56"]
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
          labels: { color: "#fff" }
        }
      }
    }
  });
}

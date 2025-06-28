// Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// Your Firebase config
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
const db = getFirestore(app);
const auth = getAuth(app);

const loginPage = document.getElementById("loginPage");
const appPage = document.getElementById("appPage");
const loginError = document.getElementById("loginError");

document.querySelector("button[onclick='login()']").onclick = async () => {
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginError.textContent = "";
  } catch (err) {
    loginError.textContent = "❌ Invalid credentials.";
  }
};

onAuthStateChanged(auth, user => {
  if (user) {
    loginPage.classList.add("hidden");
    appPage.classList.remove("hidden");
    loadUploads(user.uid);
  } else {
    loginPage.classList.remove("hidden");
    appPage.classList.add("hidden");
  }
});

document.querySelector(".logout-btn").onclick = () => {
  signOut(auth);
};

async function addUpload() {
  const user = auth.currentUser;
  if (!user) return;

  const date = document.getElementById("date").value;
  const platform = document.getElementById("platform").value;
  const title1 = document.getElementById("title1").value;
  const title2 = document.getElementById("title2").value;
  const title3 = document.getElementById("title3").value;

  if (!date || !platform) {
    alert("Please fill in the date and platform.");
    return;
  }

  await addDoc(collection(db, "uploads"), {
    uid: user.uid,
    date,
    platform,
    title1,
    title2,
    title3
  });

  document.getElementById("title1").value = "";
  document.getElementById("title2").value = "";
  document.getElementById("title3").value = "";
}

async function loadUploads(uid) {
  const uploadsRef = collection(db, "uploads");
  const snapshot = await getDocs(uploadsRef);
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.uid === uid) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${data.date}</td>
        <td>${data.platform}</td>
        <td>${data.title1}</td>
        <td>${data.title2}</td>
        <td>${data.title3}</td>
        <td><button class="delete-btn" onclick="deleteUpload('${docSnap.id}')">🗑️</button></td>
      `;
      table.appendChild(row);
    }
  });
}

window.deleteUpload = async function (id) {
  await deleteDoc(doc(db, "uploads", id));
  loadUploads(auth.currentUser.uid);
};

document.querySelector("button[onclick='addUpload()']").onclick = addUpload;

document.querySelector("button[onclick='downloadCSV()']").onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;
  const snapshot = await getDocs(collection(db, "uploads"));
  const rows = [["Date", "Platform", "Title 1", "Title 2", "Title 3"]];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.uid === user.uid) {
      rows.push([data.date, data.platform, data.title1, data.title2, data.title3]);
    }
  });

  const csv = rows.map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "uploads.csv";
  link.click();
};

// Dark mode toggle
function toggleDarkMode() {
  const isDark = document.getElementById("darkModeToggle").checked;
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("darkMode", isDark);
}
window.toggleDarkMode = toggleDarkMode;

window.onload = () => {
  const isDark = localStorage.getItem("darkMode") === "true";
  document.getElementById("darkModeToggle").checked = isDark;
  document.body.classList.toggle("dark", isDark);
};

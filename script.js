// Firebase + App Logic (script.js)

// Firebase objects (already initialized in index.html)
const auth = window.auth;
const db = window.db;

import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js';

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    error.textContent = "";
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");
    loadUploads();
  } catch (e) {
    error.textContent = "❌ " + e.message;
  }
}

function logout() {
  signOut(auth).then(() => {
    document.getElementById("appPage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
  });
}

async function addUpload() {
  const date = document.getElementById("date").value;
  const platform = document.getElementById("platform").value;
  const title1 = document.getElementById("title1").value;
  const title2 = document.getElementById("title2").value;
  const title3 = document.getElementById("title3").value;

  if (!date || !platform) {
    alert("Please fill in the date and platform.");
    return;
  }

  try {
    await addDoc(collection(db, "uploads"), {
      date, platform, title1, title2, title3
    });
    document.getElementById("title1").value = "";
    document.getElementById("title2").value = "";
    document.getElementById("title3").value = "";
    loadUploads();
  } catch (e) {
    alert("Error adding document: " + e);
  }
}

async function loadUploads() {
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";

  try {
    const querySnapshot = await getDocs(collection(db, "uploads"));
    querySnapshot.forEach(docSnap => {
      const entry = docSnap.data();
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${entry.date}</td>
        <td>${entry.platform}</td>
        <td>${entry.title1}</td>
        <td>${entry.title2}</td>
        <td>${entry.title3}</td>
        <td><button class="delete-btn" onclick="deleteUpload('${docSnap.id}')">🗑️</button></td>
      `;

      table.appendChild(row);
    });
  } catch (e) {
    alert("Error loading uploads: " + e);
  }
}

async function deleteUpload(id) {
  try {
    await deleteDoc(doc(db, "uploads", id));
    loadUploads();
  } catch (e) {
    alert("Error deleting upload: " + e);
  }
}

async function downloadCSV() {
  try {
    const querySnapshot = await getDocs(collection(db, "uploads"));
    let csv = "Date,Platform,Title 1,Title 2,Title 3\n";
    querySnapshot.forEach(docSnap => {
      const u = docSnap.data();
      csv += `${u.date},${u.platform},"${u.title1}","${u.title2}","${u.title3}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "uploads.csv";
    link.click();
  } catch (e) {
    alert("Error exporting CSV: " + e);
  }
}

function toggleDarkMode() {
  const isDark = document.getElementById("darkModeToggle").checked;
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("darkMode", isDark);
}

window.onload = () => {
  const isDark = localStorage.getItem("darkMode") === "true";
  document.getElementById("darkModeToggle").checked = isDark;
  document.body.classList.toggle("dark", isDark);

  onAuthStateChanged(auth, user => {
    if (user) {
      document.getElementById("loginPage").classList.add("hidden");
      document.getElementById("appPage").classList.remove("hidden");
      loadUploads();
    } else {
      document.getElementById("appPage").classList.add("hidden");
      document.getElementById("loginPage").classList.remove("hidden");
    }
  });
};

import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Firebase app is already initialized in index.html
const auth = window.auth;
const db = window.db;

window.login = async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    error.textContent = "";
  } catch (e) {
    error.textContent = "❌ " + e.message;
  }
}

window.logout = async function logout() {
  await signOut(auth);
}

window.addUpload = async function addUpload() {
  const date = document.getElementById("date").value;
  const platform = document.getElementById("platform").value;
  const title1 = document.getElementById("title1").value;
  const title2 = document.getElementById("title2").value;
  const title3 = document.getElementById("title3").value;

  if (!date || !platform) {
    alert("Please fill in the date and platform.");
    return;
  }

  await addDoc(collection(db, "uploads"), { date, platform, title1, title2, title3 });

  document.getElementById("title1").value = "";
  document.getElementById("title2").value = "";
  document.getElementById("title3").value = "";

  loadUploads();
}

window.deleteUpload = async function deleteUpload(id) {
  await deleteDoc(doc(db, "uploads", id));
  loadUploads();
}

window.downloadCSV = async function downloadCSV() {
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
}

async function loadUploads() {
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";
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
}

// Handle auth state changes
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

// Dark mode toggle
window.toggleDarkMode = function toggleDarkMode() {
  const isDark = document.getElementById("darkModeToggle").checked;
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("darkMode", isDark);
}

window.onload = () => {
  const isDark = localStorage.getItem("darkMode") === "true";
  document.getElementById("darkModeToggle").checked = isDark;
  document.body.classList.toggle("dark", isDark);
}

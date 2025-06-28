import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

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
const auth = getAuth();
const db = getFirestore(app);

window.login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const error = document.getElementById("loginError");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    error.textContent = "";
  } catch (err) {
    error.textContent = "❌ Invalid credentials.";
  }
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");
    loadUploads();
  } else {
    document.getElementById("loginPage").classList.remove("hidden");
    document.getElementById("appPage").classList.add("hidden");
  }
});

window.logout = async () => {
  await signOut(auth);
};

window.addUpload = async () => {
  const date = document.getElementById("date").value;
  const platform = document.getElementById("platform").value;
  const title1 = document.getElementById("title1").value;
  const title2 = document.getElementById("title2").value;
  const title3 = document.getElementById("title3").value;

  if (!date || !platform) return alert("Please fill in date and platform.");

  await addDoc(collection(db, "uploads"), { date, platform, title1, title2, title3 });
  loadUploads();
};

async function loadUploads() {
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "uploads"));
  querySnapshot.forEach((docSnap) => {
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

window.deleteUpload = async (id) => {
  await deleteDoc(doc(db, "uploads", id));
  loadUploads();
};

window.downloadCSV = async () => {
  const querySnapshot = await getDocs(collection(db, "uploads"));
  let csv = "Date,Platform,Title 1,Title 2,Title 3\n";
  querySnapshot.forEach((docSnap) => {
    const u = docSnap.data();
    csv += `${u.date},${u.platform},"${u.title1}","${u.title2}","${u.title3}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "uploads.csv";
  link.click();
};

window.toggleDarkMode = () => {
  const isDark = document.getElementById("darkModeToggle").checked;
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("darkMode", isDark);
};

window.onload = () => {
  const isDark = localStorage.getItem("darkMode") === "true";
  document.getElementById("darkModeToggle").checked = isDark;
  document.body.classList.toggle("dark", isDark);

  document.querySelectorAll('.glass-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      card.style.transform = `rotateY(${x * 0.03}deg) rotateX(${y * -0.03}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateY(0deg) rotateX(0deg)';
    });
  });
};

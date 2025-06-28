function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById("loginPage").classList.add("hidden");
      document.getElementById("appPage").classList.remove("hidden");
      error.textContent = "";
      loadUploads();
    })
    .catch(() => {
      error.textContent = "❌ Login failed. Check credentials.";
    });
}

function logout() {
  auth.signOut().then(() => {
    document.getElementById("appPage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
  });
}

function addUpload() {
  const date = document.getElementById("date").value;
  const platform = document.getElementById("platform").value;
  const title1 = document.getElementById("title1").value;
  const title2 = document.getElementById("title2").value;
  const title3 = document.getElementById("title3").value;

  if (!date || !platform) {
    alert("Please fill in the date and platform.");
    return;
  }

  db.collection("uploads").add({
    date,
    platform,
    title1,
    title2,
    title3,
    timestamp: Date.now()
  });

  document.getElementById("title1").value = "";
  document.getElementById("title2").value = "";
  document.getElementById("title3").value = "";
  document.getElementById("date").value = "";
  document.getElementById("platform").value = "";
}

function loadUploads() {
  db.collection("uploads").orderBy("timestamp", "desc").onSnapshot(snapshot => {
    const table = document.querySelector("#uploadTable tbody");
    table.innerHTML = "";
    snapshot.forEach(doc => {
      const entry = doc.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${entry.date}</td>
        <td>${entry.platform}</td>
        <td>${entry.title1}</td>
        <td>${entry.title2}</td>
        <td>${entry.title3}</td>
        <td><button class="delete-btn" onclick="deleteUpload('${doc.id}')">🗑️</button></td>
      `;
      table.appendChild(row);
    });
  });
}

function deleteUpload(id) {
  db.collection("uploads").doc(id).delete();
}

function downloadCSV() {
  db.collection("uploads").orderBy("timestamp", "desc").get().then(snapshot => {
    const rows = [["Date", "Platform", "Title 1", "Title 2", "Title 3"]];
    snapshot.forEach(doc => {
      const data = doc.data();
      rows.push([data.date, data.platform, data.title1, data.title2, data.title3]);
    });

    const csvContent = rows.map(r => r.join(",")).join("\\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "uploads.csv";
    link.click();
  });
}

function toggleDarkMode() {
  const isDark = document.getElementById("darkModeToggle").checked;
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("darkMode", isDark);
}

auth.onAuthStateChanged((user) => {
  const isDark = localStorage.getItem("darkMode") === "true";
  document.getElementById("darkModeToggle").checked = isDark;
  document.body.classList.toggle("dark", isDark);

  if (user) {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");
    loadUploads();
  } else {
    document.getElementById("appPage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
  }
});

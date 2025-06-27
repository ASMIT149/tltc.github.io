const USERNAME = "tltc";
const PASSWORD = "tltc";

function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  const error = document.getElementById("loginError");

  if (user === USERNAME && pass === PASSWORD) {
    sessionStorage.setItem("loggedIn", "true");
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");
    error.textContent = "";
    loadUploads();
  } else {
    error.textContent = "❌ Invalid credentials.";
  }
}

function logout() {
  sessionStorage.removeItem("loggedIn");
  document.getElementById("appPage").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");
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

  const entry = { date, platform, title1, title2, title3 };
  const uploads = JSON.parse(localStorage.getItem("uploads") || "[]");
  uploads.push(entry);
  localStorage.setItem("uploads", JSON.stringify(uploads));

  document.getElementById("title1").value = "";
  document.getElementById("title2").value = "";
  document.getElementById("title3").value = "";

  loadUploads();
}

function loadUploads() {
  const uploads = JSON.parse(localStorage.getItem("uploads") || "[]");
  const table = document.querySelector("#uploadTable tbody");
  table.innerHTML = "";
  uploads.forEach(entry => {
    const row = `<tr>
      <td>${entry.date}</td>
      <td>${entry.platform}</td>
      <td>${entry.title1}</td>
      <td>${entry.title2}</td>
      <td>${entry.title3}</td>
    </tr>`;
    table.innerHTML += row;
  });
}

function downloadCSV() {
  const uploads = JSON.parse(localStorage.getItem("uploads") || "[]");
  if (!uploads.length) {
    alert("No data to export.");
    return;
  }

  let csv = "Date,Platform,Title 1,Title 2,Title 3\n";
  uploads.forEach(u => {
    csv += `${u.date},${u.platform},"${u.title1}","${u.title2}","${u.title3}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "uploads.csv";
  link.click();
}

function toggleDarkMode() {
  const isDark = document.getElementById("darkModeToggle").checked;
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("darkMode", isDark);
}

window.onload = () => {
  const isLoggedIn = sessionStorage.getItem("loggedIn") === "true";
  const isDark = localStorage.getItem("darkMode") === "true";

  document.getElementById("darkModeToggle").checked = isDark;
  document.body.classList.toggle("dark", isDark);

  if (isLoggedIn) {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");
    loadUploads();
  }
};

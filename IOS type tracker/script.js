// Play music on first user interaction (mobile safe)
document.addEventListener("click", () => {
  const music = document.getElementById("bgMusic");
  if (music) {
    music.volume = 0.4;
    music.play();
  }
}, { once: true });

console.log("Asmit ❤️ Pari — site loaded successfully");




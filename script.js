// Music on first click (mobile safe)
document.addEventListener("click", () => {
  const music = document.getElementById("bgMusic");
  if (music) {
    music.volume = 0.4;
    music.play();
  }
}, { once: true });

// Music on first click
document.addEventListener("click", () => {
  const music = document.getElementById("bgMusic");
  if (music) {
    music.volume = 0.4;
    music.play();
  }
}, { once: true });

// Scroll animation
const cards = document.querySelectorAll(".card");

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
    }
  });
}, { threshold: 0.3 });

cards.forEach(card => observer.observe(card));

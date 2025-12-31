const slides = document.querySelectorAll('.slide');
let current = 0;

// change slide on click / tap
document.addEventListener('click', () => {
  slides[current].classList.remove('active');
  current = (current + 1) % slides.length;
  slides[current].classList.add('active');
});

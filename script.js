// Simple fade-in on scroll (SAFE)
const cards = document.querySelectorAll('.card');

const obs = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.style.opacity = 1;
      e.target.style.transform = 'none';
    }
  });
},{threshold:0.2});

cards.forEach(c=>{
  c.style.opacity = 0;
  c.style.transform = 'translateY(30px)';
  c.style.transition = 'all .8s ease';
  obs.observe(c);
});

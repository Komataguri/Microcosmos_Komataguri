<script>
document.addEventListener("DOMContentLoaded", () => {

    const carousel = document.querySelector('.books-carousel');
    if (!carousel) return;

    /* ===========================
       1. Колесо мыши
       =========================== */

    if (window.innerWidth > 768) {
        carousel.addEventListener('wheel', (e) => {
            e.preventDefault();
            carousel.scrollLeft += e.deltaY * 1.5; 
        }, { passive: false });
    }

    /* ===========================
       2. Drag мышью (правильный)
       =========================== */

    let isDragging = false;
    let startX = 0;
    let startScroll = 0;

    carousel.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startScroll = carousel.scrollLeft;
        carousel.style.cursor = "grabbing";
        carousel.style.userSelect = "none";
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        carousel.style.cursor = "grab";
        carousel.style.userSelect = "auto";
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const delta = e.clientX - startX;
        carousel.scrollLeft = startScroll - delta;
    });

});
</script>
document.addEventListener("DOMContentLoaded", function () {
    const nav = document.querySelector(".navigation");

    if (!nav) {
        return;
    }

    function updateNavigationState() {
        nav.classList.toggle("scrolled", window.scrollY > 50);
    }

    updateNavigationState();
    window.addEventListener("scroll", updateNavigationState, { passive: true });
});

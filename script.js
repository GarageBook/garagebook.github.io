let numButtonClicks = 0;
function buttonClicked() {
    document.getElementById("overlay").classList.add("active");
}

function closeOverlay() {
    document.getElementById("overlay").classList.remove("active");
}

/* sluiten bij klik buiten modal */

document.getElementById("overlay").addEventListener("click", function(e) {
    if (e.target === this) {
        closeOverlay();
    }
});


document.addEventListener("DOMContentLoaded", function () {

    window.addEventListener("scroll", function () {

        const nav = document.querySelector(".navigation");

        if (window.scrollY > 50) {
            nav.classList.add("scrolled");
        } else {
            nav.classList.remove("scrolled");
        }

    });

});
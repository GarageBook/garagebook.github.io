window.garagebookTrack = function (eventName, params = {}) {
    if (typeof window.gtag !== "function") {
        return;
    }

    window.gtag("event", eventName, params);
};

function isTrackedCtaUrl(url) {
    if (url.hostname !== "app.garagebook.nl") {
        return false;
    }

    return url.pathname === "/" || url.pathname === "/start" || url.pathname === "/start/";
}

function trackMarketingCtaClick(event) {
    if (!(event.target instanceof Element)) {
        return;
    }

    const link = event.target.closest("a[href]");

    if (!link) {
        return;
    }

    let url;

    try {
        url = new URL(link.getAttribute("href"), window.location.origin);
    } catch {
        return;
    }

    if (!isTrackedCtaUrl(url)) {
        return;
    }

    window.garagebookTrack("cta_click", {
        cta_url: url.href,
        cta_text: link.textContent.replace(/\s+/g, " ").trim(),
        page_path: window.location.pathname,
        page_title: document.title,
        source: "marketing_site",
        transport_type: "beacon",
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const nav = document.querySelector(".navigation");

    if (nav) {
        function updateNavigationState() {
            nav.classList.toggle("scrolled", window.scrollY > 50);
        }

        updateNavigationState();
        window.addEventListener("scroll", updateNavigationState, { passive: true });
    }

    document.addEventListener("click", trackMarketingCtaClick, true);
});

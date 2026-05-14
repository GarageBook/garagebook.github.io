const PRODUCTION_HOSTNAMES = new Set(["garagebook.nl", "www.garagebook.nl"]);
const APP_HOSTNAME = "app.garagebook.nl";
const SCROLL_THRESHOLDS = [25, 50, 75, 90];

function isProductionHostname(hostname = window.location.hostname) {
    return PRODUCTION_HOSTNAMES.has(hostname);
}

window.garagebookTrack = function (eventName, params = {}) {
    if (!isProductionHostname() || typeof window.gtag !== "function") {
        return;
    }

    window.gtag("event", eventName, params);
};

function isTrackedCtaUrl(url) {
    return url.hostname === APP_HOSTNAME;
}

function getNormalizedLinkText(link) {
    return link.textContent.replace(/\s+/g, " ").trim();
}

function getCurrentUtmEntries() {
    const currentUrl = new URL(window.location.href);
    const utmEntries = [];

    for (const [key, value] of currentUrl.searchParams.entries()) {
        if (!key.toLowerCase().startsWith("utm_")) {
            continue;
        }

        utmEntries.push([key, value]);
    }

    return utmEntries;
}

function mergeCurrentUtmsIntoUrl(url) {
    const utmEntries = getCurrentUtmEntries();
    let changed = false;

    for (const [key, value] of utmEntries) {
        if (url.searchParams.has(key)) {
            continue;
        }

        url.searchParams.set(key, value);
        changed = true;
    }

    return changed;
}

function updateLinkHref(link, url) {
    link.setAttribute("href", url.toString());
}

function ensureTrackedLinkDestination(link) {
    let url;

    try {
        url = new URL(link.getAttribute("href"), window.location.origin);
    } catch {
        return null;
    }

    if (!isTrackedCtaUrl(url)) {
        return null;
    }

    if (mergeCurrentUtmsIntoUrl(url)) {
        updateLinkHref(link, url);
    }

    return url;
}

function getCtaLocation(link) {
    const isBlogPage = window.location.pathname === "/blog/" || window.location.pathname.startsWith("/blog/");

    if (link.closest(".navigation")) {
        return "navbar";
    }

    if (link.closest(".footer")) {
        return "footer";
    }

    if (link.closest(".ctaBanner")) {
        return isBlogPage ? "blog_end" : "cta_banner";
    }

    if (isBlogPage && link.closest('[aria-labelledby="blog-cta"]')) {
        return "blog_inline";
    }

    if (link.closest(".hero") || link.closest(".heroThree")) {
        return "hero";
    }

    if (link.closest(".ctaSection")) {
        return "cta_section";
    }

    return "content";
}

function getScrollPercent() {
    const doc = document.documentElement;
    const scrollableHeight = doc.scrollHeight - window.innerHeight;

    if (scrollableHeight <= 0) {
        return 100;
    }

    return Math.min(100, Math.round((window.scrollY / scrollableHeight) * 100));
}

function createScrollDepthTracker() {
    const firedThresholds = new Set();

    function trackScrollDepth() {
        const currentPercent = getScrollPercent();

        for (const threshold of SCROLL_THRESHOLDS) {
            if (currentPercent < threshold || firedThresholds.has(threshold)) {
                continue;
            }

            firedThresholds.add(threshold);
            window.garagebookTrack("scroll_depth", {
                scroll_percent: threshold,
                page_path: window.location.pathname,
                page_title: document.title,
                transport_type: "beacon",
            });
        }
    }

    return trackScrollDepth;
}

function getDemoTrackableElement(target) {
    if (!(target instanceof Element)) {
        return null;
    }

    return target.closest("[data-track-demo]");
}

function trackDemoInteraction(event) {
    const element = getDemoTrackableElement(event.target);

    if (!element) {
        return;
    }

    const label = element.getAttribute("data-track-demo-label") || getNormalizedLinkText(element);
    const location = element.getAttribute("data-track-demo-location") || "content";
    const targetId = element.getAttribute("href") || element.getAttribute("data-track-demo-target") || "";

    window.garagebookTrack("demo_click", {
        click_text: label,
        click_location: location,
        click_target: targetId,
        page_path: window.location.pathname,
        page_title: document.title,
        transport_type: "beacon",
    });
}

function trackMarketingCtaClick(event) {
    if (!(event.target instanceof Element)) {
        return;
    }

    const link = event.target.closest("a[href]");

    if (!link) {
        return;
    }

    const destinationUrl = ensureTrackedLinkDestination(link);

    if (!destinationUrl) {
        return;
    }

    window.garagebookTrack("cta_click", {
        cta_text: getNormalizedLinkText(link),
        cta_location: getCtaLocation(link),
        destination_url: destinationUrl.toString(),
        page_path: window.location.pathname,
        page_title: document.title,
        transport_type: "beacon",
    });
}

function updateTrackedAppLinks() {
    const links = document.querySelectorAll("a[href]");

    for (const link of links) {
        ensureTrackedLinkDestination(link);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const nav = document.querySelector(".navigation");
    const trackScrollDepth = createScrollDepthTracker();

    if (nav) {
        function updateNavigationState() {
            nav.classList.toggle("scrolled", window.scrollY > 50);
        }

        updateNavigationState();
        window.addEventListener("scroll", updateNavigationState, { passive: true });
    }

    updateTrackedAppLinks();
    trackScrollDepth();
    window.addEventListener("scroll", trackScrollDepth, { passive: true });
    document.addEventListener("click", trackMarketingCtaClick, true);
    document.addEventListener("click", trackDemoInteraction, true);
});

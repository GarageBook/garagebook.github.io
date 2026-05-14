const PRODUCTION_HOSTNAMES = new Set(["garagebook.nl", "www.garagebook.nl"]);
const APP_HOSTNAME = "app.garagebook.nl";
const GARAGEBOOK_HOSTNAMES = new Set(["garagebook.nl", "www.garagebook.nl", APP_HOSTNAME]);
const START_PATH = "/start/";
const SCROLL_THRESHOLDS = [50, 75, 90];
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const MONEY_PAGE_PATHS = new Set([
    "/digitaal-onderhoudsboekje/",
    "/motor-onderhoud-app/",
    "/motor-onderhoud-bijhouden/",
    "/motor-onderhoud-excel/",
    "/motor-onderhoud-schema/",
    "/onderhoudsboekje-motor/",
    "/onderhoudsboekje-oldtimer/",
    "/circuit-onderhoud-motor/",
]);

function isProductionHostname(hostname = window.location.hostname) {
    return PRODUCTION_HOSTNAMES.has(hostname);
}

window.garagebookTrack = function (eventName, params = {}) {
    if (!isProductionHostname()) {
        return;
    }

    try {
        if (Array.isArray(window.dataLayer)) {
            window.dataLayer.push({ event: eventName, ...params });
            return;
        }

        if (typeof window.gtag === "function") {
            window.gtag("event", eventName, params);
        }
    } catch {
        // Tracking must never interrupt normal navigation.
    }
};

function isStartUrl(url) {
    return url.hostname === APP_HOSTNAME && normalizePath(url.pathname) === START_PATH;
}

function isInternalMoneyPageUrl(url) {
    return PRODUCTION_HOSTNAMES.has(url.hostname) && MONEY_PAGE_PATHS.has(normalizePath(url.pathname));
}

function isOutboundUrl(url) {
    return !GARAGEBOOK_HOSTNAMES.has(url.hostname);
}

function normalizePath(pathname) {
    if (!pathname || pathname === "/") {
        return "/";
    }

    return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function getPagePath() {
    return normalizePath(window.location.pathname);
}

function getPageType() {
    const path = getPagePath();

    if (path === "/" || path === "/index.html/") {
        return "homepage";
    }

    if (path === "/blog/" || path.startsWith("/blog/")) {
        return "blog";
    }

    if (MONEY_PAGE_PATHS.has(path)) {
        return "landing";
    }

    return "other";
}

function isImportantTrackedPage() {
    return getPageType() !== "other";
}

function getNormalizedLinkText(link) {
    return link.textContent.replace(/\s+/g, " ").trim();
}

function getCurrentUtmEntries() {
    const currentUrl = new URL(window.location.href);
    const utmEntries = [];

    for (const key of UTM_KEYS) {
        const value = currentUrl.searchParams.get(key);

        if (!value) {
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

    if (!isStartUrl(url)) {
        return null;
    }

    if (mergeCurrentUtmsIntoUrl(url)) {
        updateLinkHref(link, url);
    }

    return url;
}

function getCtaLocation(link) {
    if (link.closest(".navigation")) {
        return "header";
    }

    if (link.closest(".footer")) {
        return "footer";
    }

    if (getPageType() === "blog") {
        return "blog";
    }

    if (link.closest(".hero") || link.closest(".heroTwo") || link.closest(".heroThree") || link.closest(".heroFour") || link.closest(".blogHero")) {
        return "hero";
    }

    return "body";
}

function getBlogSlug() {
    const path = getPagePath();

    if (!path.startsWith("/blog/") || path === "/blog/") {
        return "";
    }

    return path.replace(/^\/blog\//, "").replace(/\/$/, "");
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
        if (!isImportantTrackedPage()) {
            return;
        }

        const currentPercent = getScrollPercent();

        for (const threshold of SCROLL_THRESHOLDS) {
            if (currentPercent < threshold || firedThresholds.has(threshold)) {
                continue;
            }

            firedThresholds.add(threshold);
            window.garagebookTrack("scroll_depth", {
                page_path: getPagePath(),
                scroll_percentage: threshold,
            });
        }
    }

    return trackScrollDepth;
}

function createEngagementTracker() {
    let fired = false;

    function trackEngagement() {
        if (fired || !isImportantTrackedPage()) {
            return;
        }

        fired = true;
        window.garagebookTrack("landing_page_engaged", {
            page_path: getPagePath(),
            page_type: getPageType(),
        });
    }

    window.setTimeout(trackEngagement, 30000);

    return trackEngagement;
}

function getClickedLink(event) {
    if (!(event.target instanceof Element)) {
        return null;
    }

    return event.target.closest("a[href]");
}

function getDestinationUrl(link) {
    try {
        return new URL(link.getAttribute("href"), window.location.origin);
    } catch {
        return null;
    }
}

function trackStartGratisClick(link, destinationUrl) {
    window.garagebookTrack("clicked_start_gratis", {
        cta_text: getNormalizedLinkText(link),
        page_path: getPagePath(),
        cta_location: getCtaLocation(link),
        destination_url: destinationUrl.toString(),
    });
}

function trackBlogCtaClick(link, destinationUrl) {
    if (getPageType() !== "blog") {
        return;
    }

    if (!isStartUrl(destinationUrl) && !isInternalMoneyPageUrl(destinationUrl)) {
        return;
    }

    window.garagebookTrack("blog_cta_clicked", {
        page_path: getPagePath(),
        blog_slug: getBlogSlug(),
        cta_text: getNormalizedLinkText(link),
        destination_url: destinationUrl.toString(),
    });
}

function trackOutboundClick(link, destinationUrl) {
    if (!isOutboundUrl(destinationUrl)) {
        return;
    }

    window.garagebookTrack("outbound_click", {
        page_path: getPagePath(),
        destination_domain: destinationUrl.hostname,
        destination_url: destinationUrl.toString(),
    });
}

function trackMarketingCtaClick(event) {
    const link = getClickedLink(event);

    if (!link) {
        return;
    }

    const originalDestinationUrl = getDestinationUrl(link);

    if (!originalDestinationUrl) {
        return;
    }

    const destinationUrl = ensureTrackedLinkDestination(link);

    if (destinationUrl) {
        trackStartGratisClick(link, destinationUrl);
        trackBlogCtaClick(link, destinationUrl);
        return;
    }

    trackBlogCtaClick(link, originalDestinationUrl);
    trackOutboundClick(link, originalDestinationUrl);
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
    const trackEngagement = createEngagementTracker();

    if (nav) {
        function updateNavigationState() {
            nav.classList.toggle("scrolled", window.scrollY > 50);
        }

        updateNavigationState();
        window.addEventListener("scroll", updateNavigationState, { passive: true });
    }

    updateTrackedAppLinks();
    trackScrollDepth();
    window.addEventListener("scroll", function () {
        trackScrollDepth();

        if (getScrollPercent() >= 50) {
            trackEngagement();
        }
    }, { passive: true });
    document.addEventListener("click", trackMarketingCtaClick, true);
});

(function () {
    const PRODUCTION_HOSTNAMES = new Set(["garagebook.nl", "www.garagebook.nl"]);
    const APP_HOSTNAME = "app.garagebook.nl";
    const GARAGEBOOK_HOSTNAMES = new Set(["garagebook.nl", "www.garagebook.nl", APP_HOSTNAME]);
    const START_URL = "https://app.garagebook.nl/start?utm_source=garagebook.nl&utm_medium=website&utm_campaign=organic_cta";
    const START_PATH = "/start/";
    const LEGACY_REGISTER_PATH = "/admin/register/";
    const TRACKED_EVENT_TIMEOUT_MS = 800;

    function isProductionHostname(hostname = window.location.hostname) {
        return PRODUCTION_HOSTNAMES.has(hostname);
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

    function getPageLocation() {
        return window.location.href;
    }

    function getPageType() {
        const path = getPagePath();

        if (path === "/" || path === "/index.html/") {
            return "homepage";
        }

        if (path === "/blog/" || path.startsWith("/blog/")) {
            return "blog";
        }

        return "page";
    }

    function getBlogSlug() {
        const path = getPagePath();

        if (!path.startsWith("/blog/") || path === "/blog/") {
            return "";
        }

        return path.replace(/^\/blog\//, "").replace(/\/$/, "");
    }

    function getDestinationUrl(link) {
        try {
            return new URL(link.getAttribute("href"), window.location.origin);
        } catch {
            return null;
        }
    }


    function isAppStartUrl(url) {
        return url.hostname === APP_HOSTNAME && normalizePath(url.pathname) === START_PATH;
    }

    function isRelevantStartUrl(url) {
        const normalizedPath = normalizePath(url.pathname);

        if (url.hostname === APP_HOSTNAME && normalizedPath === START_PATH) {
            return true;
        }

        if (!GARAGEBOOK_HOSTNAMES.has(url.hostname)) {
            return false;
        }

        return normalizedPath === START_PATH || normalizedPath === LEGACY_REGISTER_PATH;
    }

    function getNormalizedStartUrl(url) {
        if (!isRelevantStartUrl(url)) {
            return null;
        }

        return new URL(START_URL);
    }

    function updateLinkHref(link, url) {
        link.setAttribute("href", url.toString());
    }

    function ensureTrackedLinkDestination(link) {
        const destinationUrl = getDestinationUrl(link);

        if (!destinationUrl) {
            return null;
        }

        const normalizedStartUrl = getNormalizedStartUrl(destinationUrl);

        if (!normalizedStartUrl) {
            return null;
        }

        if (normalizedStartUrl.toString() !== destinationUrl.toString()) {
            updateLinkHref(link, normalizedStartUrl);
        }

        return normalizedStartUrl;
    }

    function getNormalizedLinkText(link) {
        return link.textContent.replace(/\s+/g, " ").trim().slice(0, 120);
    }

    function getCtaLocation(link) {
        const explicitLocation = link.getAttribute("data-cta-location");

        if (explicitLocation) {
            return explicitLocation.trim().toLowerCase();
        }

        if (link.closest(".navigation")) {
            return "header";
        }

        if (link.closest(".footer")) {
            return "footer";
        }

        if (link.closest(".ctaSection") || link.closest(".ctaBanner")) {
            return "closing_cta";
        }

        if (link.closest(".hero") || link.closest(".heroTwo") || link.closest(".heroThree") || link.closest(".heroFour") || link.closest(".blogHero")) {
            return "hero";
        }

        if (getPageType() === "blog") {
            return "blog_body";
        }

        return "body";
    }

    function isOutboundUrl(url) {
        return !GARAGEBOOK_HOSTNAMES.has(url.hostname);
    }

    function shouldInterceptNavigation(event, link) {
        if (event.defaultPrevented || event.button !== 0) {
            return false;
        }

        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return false;
        }

        if (link.hasAttribute("download")) {
            return false;
        }

        const target = link.getAttribute("target");

        return !target || target === "_self";
    }

    function garagebookTrack(eventName, params = {}, options = {}) {
        if (!isProductionHostname() || typeof window.gtag !== "function") {
            return false;
        }

        try {
            const eventParams = { ...params };

            if (typeof options.eventCallback === "function") {
                eventParams.event_callback = options.eventCallback;
                eventParams.event_timeout = TRACKED_EVENT_TIMEOUT_MS;
            }

            window.gtag("event", eventName, eventParams);
            return true;
        } catch {
            return false;
        }
    }

    function buildStartClickEvent(link, destinationUrl) {
        if (!isAppStartUrl(destinationUrl)) {
            return null;
        }

        return {
            eventName: "start_click",
            params: {
                link_url: destinationUrl.toString(),
                link_text: getNormalizedLinkText(link),
                page_location: getPageLocation(),
                page_path: getPagePath(),
                cta_location: getCtaLocation(link),
            },
        };
    }

    function buildBlogCtaClickEvent(link, destinationUrl) {
        if (getPageType() !== "blog" || !isAppStartUrl(destinationUrl)) {
            return null;
        }

        return {
            eventName: "blog_cta_click",
            params: {
                link_url: destinationUrl.toString(),
                link_text: getNormalizedLinkText(link),
                page_location: getPageLocation(),
                page_path: getPagePath(),
                blog_slug: getBlogSlug(),
            },
        };
    }

    function buildOutboundReferralClickEvent(destinationUrl) {
        if (!isOutboundUrl(destinationUrl)) {
            return null;
        }

        return {
            eventName: "outbound_referral_click",
            params: {
                link_url: destinationUrl.toString(),
                page_path: getPagePath(),
            },
        };
    }

    function getClickedLink(event) {
        if (!(event.target instanceof Element)) {
            return null;
        }

        return event.target.closest("a[href]");
    }

    function sendEventsBeforeNavigation(events, navigate) {
        if (events.length === 0) {
            navigate();
            return;
        }

        let navigated = false;

        function finishNavigation() {
            if (navigated) {
                return;
            }

            navigated = true;
            navigate();
        }

        for (let index = 0; index < events.length; index += 1) {
            const event = events[index];
            const isLastEvent = index === events.length - 1;
            const tracked = garagebookTrack(event.eventName, event.params, isLastEvent ? {
                eventCallback: finishNavigation,
            } : {});

            if (!tracked && isLastEvent) {
                finishNavigation();
                return;
            }
        }

        window.setTimeout(finishNavigation, TRACKED_EVENT_TIMEOUT_MS);
    }

    function handleTrackedClick(event) {
        const link = getClickedLink(event);

        if (!link) {
            return;
        }

        const originalDestinationUrl = getDestinationUrl(link);

        if (!originalDestinationUrl) {
            return;
        }

        const startDestinationUrl = ensureTrackedLinkDestination(link);
        const destinationUrl = startDestinationUrl || originalDestinationUrl;
        const events = [
            buildStartClickEvent(link, destinationUrl),
            buildBlogCtaClickEvent(link, destinationUrl),
            buildOutboundReferralClickEvent(destinationUrl),
        ].filter(Boolean);

        if (events.length === 0) {
            return;
        }

        if (!shouldInterceptNavigation(event, link)) {
            for (const trackedEvent of events) {
                garagebookTrack(trackedEvent.eventName, trackedEvent.params);
            }

            return;
        }

        event.preventDefault();
        sendEventsBeforeNavigation(events, function () {
            window.location.assign(destinationUrl.toString());
        });
    }

    function updateTrackedAppLinks() {
        const links = document.querySelectorAll("a[href]");

        for (const link of links) {
            ensureTrackedLinkDestination(link);
        }
    }

    window.garagebookTrack = garagebookTrack;
    document.addEventListener("DOMContentLoaded", function () {
        updateTrackedAppLinks();
        document.addEventListener("click", handleTrackedClick, true);
    });
})();

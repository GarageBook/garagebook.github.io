(function () {
    const MEASUREMENT_ID = "G-6KJM1W5N63";
    const PRODUCTION_HOSTNAMES = new Set(["garagebook.nl", "www.garagebook.nl"]);
    const CROSS_DOMAIN_HOSTNAMES = ["garagebook.nl", "www.garagebook.nl", "app.garagebook.nl"];
    const CONSENT_STORAGE_NAME = "klaro";
    const SERVICE_NAME = "googleAnalytics";
    const CONSENT_GRANTED_EVENT = "garagebook:analytics-consent-granted";

    function isProductionHostname(hostname = window.location.hostname) {
        return PRODUCTION_HOSTNAMES.has(hostname);
    }

    function hasMeasurementScript() {
        return Boolean(document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}"]`));
    }

    function hasStoredAnalyticsConsent() {
        try {
            const storedConsent = window.localStorage.getItem(CONSENT_STORAGE_NAME);

            if (!storedConsent) {
                return false;
            }

            const parsedConsent = JSON.parse(decodeURIComponent(storedConsent));
            return parsedConsent && parsedConsent[SERVICE_NAME] === true;
        } catch {
            return false;
        }
    }

    function ensureGtag() {
        window.dataLayer = window.dataLayer || [];

        if (typeof window.gtag !== "function") {
            window.gtag = function () {
                window.dataLayer.push(arguments);
            };
        }

        return window.gtag;
    }

    function getAnalyticsState() {
        if (!window.garageBookAnalytics) {
            window.garageBookAnalytics = {
                consentGranted: false,
                initialized: false,
                pageViewSent: false,
                queuedEvents: [],
                measurementId: MEASUREMENT_ID,
                consentGrantedEventName: CONSENT_GRANTED_EVENT,
            };
        }

        return window.garageBookAnalytics;
    }

    function loadMeasurementScript() {
        if (!isProductionHostname() || hasMeasurementScript()) {
            return;
        }

        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
        document.head.appendChild(script);
    }

    function initializeGoogleAnalytics() {
        if (!isProductionHostname()) {
            return;
        }

        const analyticsState = getAnalyticsState();

        if (analyticsState.initialized === true) {
            return;
        }

        const gtag = ensureGtag();
        loadMeasurementScript();
        gtag("js", new Date());
        gtag("consent", "default", {
            analytics_storage: "denied",
        });
        gtag("config", MEASUREMENT_ID, {
            linker: {
                domains: CROSS_DOMAIN_HOSTNAMES,
            },
            send_page_view: false,
        });

        analyticsState.initialized = true;
    }

    function grantAnalyticsConsent() {
        if (!isProductionHostname()) {
            return;
        }

        initializeGoogleAnalytics();

        const analyticsState = getAnalyticsState();

        if (analyticsState.consentGranted === true) {
            return;
        }

        window.gtag("consent", "update", {
            analytics_storage: "granted",
        });

        analyticsState.consentGranted = true;
        document.dispatchEvent(new CustomEvent(CONSENT_GRANTED_EVENT));
    }

    window.garageBookLoadAnalytics = initializeGoogleAnalytics;
    window.garageBookGrantAnalyticsConsent = grantAnalyticsConsent;
    window.klaroConfig = {
        version: 1,
        elementID: "klaro",
        storageMethod: "localStorage",
        storageName: CONSENT_STORAGE_NAME,
        noAutoLoad: false,
        htmlTexts: false,
        embedded: false,
        groupByPurpose: false,
        default: false,
        mustConsent: false,
        acceptAll: true,
        hideDeclineAll: false,
        hideLearnMore: true,
        noticeAsModal: false,
        lang: "nl",
        translations: {
            nl: {
                acceptAll: "OK",
                decline: "Nee bedankt",
                consentNotice: {
                    description: "GarageBook gebruikt analytische cookies om de website te verbeteren.",
                },
                purposes: {
                    analytics: {
                        title: "Analytics",
                    },
                },
                googleAnalytics: {
                    title: "Google Analytics",
                    description: "Meet anoniem geaggregeerd websitegebruik.",
                },
            },
        },
        services: [
            {
                name: SERVICE_NAME,
                title: "Google Analytics",
                purposes: ["analytics"],
                default: false,
                required: false,
                optOut: false,
                onlyOnce: true,
                callback: function (consent) {
                    if (consent === true) {
                        grantAnalyticsConsent();
                    }
                },
            },
        ],
    };

    initializeGoogleAnalytics();

    if (hasStoredAnalyticsConsent()) {
        grantAnalyticsConsent();
    }
})();

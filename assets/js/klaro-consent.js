(function () {
    const MEASUREMENT_ID = "G-HZE3QJPSBR";
    const PRODUCTION_HOSTNAMES = new Set(["garagebook.nl", "www.garagebook.nl"]);
    const CROSS_DOMAIN_HOSTNAMES = ["garagebook.nl", "www.garagebook.nl", "app.garagebook.nl"];
    const CONSENT_STORAGE_NAME = "klaro";
    const SERVICE_NAME = "googleAnalytics";

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

    function loadGoogleAnalytics() {
        if (!isProductionHostname() || window.garageBookAnalyticsLoaded) {
            return;
        }

        const gtag = ensureGtag();
        gtag("js", new Date());
        gtag("config", MEASUREMENT_ID, {
            linker: {
                domains: CROSS_DOMAIN_HOSTNAMES,
            },
        });

        if (!hasMeasurementScript()) {
            const script = document.createElement("script");
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
            document.head.appendChild(script);
        }

        window.garageBookAnalyticsLoaded = true;
    }

    window.garageBookLoadAnalytics = loadGoogleAnalytics;
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
                        loadGoogleAnalytics();
                    }
                },
            },
        ],
    };

    if (hasStoredAnalyticsConsent()) {
        loadGoogleAnalytics();
    }
})();

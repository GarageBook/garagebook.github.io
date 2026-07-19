(function () {
    var STORAGE_KEY = "gb_first_touch";
    var EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;
    var APP_HOSTNAME = "app.garagebook.nl";
    var REGISTRATION_PATHS = ["/admin/register", "/start"];

    function readStored() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (!data || typeof data.expires !== "number" || Date.now() > data.expires) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    }

    function capture() {
        if (readStored()) return;

        var params = new URLSearchParams(window.location.search);
        var utmSource = params.get("utm_source") || "";
        var utmMedium = params.get("utm_medium") || "";

        var referrer = "";
        try {
            if (document.referrer) {
                var refUrl = new URL(document.referrer);
                if (refUrl.hostname !== window.location.hostname) {
                    referrer = document.referrer;
                }
            }
        } catch (e) {}

        var source, medium;
        if (utmSource) {
            source = utmSource;
            medium = utmMedium || "unknown";
        } else if (referrer) {
            try {
                source = new URL(referrer).hostname;
            } catch (e) {
                source = "referral";
            }
            medium = "referral";
        } else {
            source = "direct";
            medium = "direct";
        }

        var record = {
            first_source: source,
            first_medium: medium,
            first_referrer: referrer,
            first_landing_page: window.location.pathname,
            expires: Date.now() + EXPIRY_MS,
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
        } catch (e) {}
    }

    function getAttribution() {
        var data = readStored();
        if (!data) return null;
        return {
            first_source: data.first_source || "",
            first_medium: data.first_medium || "",
            first_referrer: data.first_referrer || "",
            first_landing_page: data.first_landing_page || "",
        };
    }

    function appendToStartUrl(urlObj) {
        try {
            if (urlObj.hostname !== APP_HOSTNAME) return urlObj;
            if (REGISTRATION_PATHS.indexOf(urlObj.pathname.replace(/\/$/, "")) === -1) return urlObj;

            var attr = getAttribution();
            if (!attr) return urlObj;

            var result = new URL(urlObj.toString());
            if (attr.first_source) result.searchParams.set("attr_source", attr.first_source);
            if (attr.first_medium) result.searchParams.set("attr_medium", attr.first_medium);
            if (attr.first_referrer) result.searchParams.set("attr_referrer", attr.first_referrer);
            if (attr.first_landing_page) result.searchParams.set("attr_landing", attr.first_landing_page);
            return result;
        } catch (e) {
            return urlObj;
        }
    }

    window.garageBookAttribution = {
        getAttribution: getAttribution,
        appendToStartUrl: appendToStartUrl,
    };

    capture();
})();

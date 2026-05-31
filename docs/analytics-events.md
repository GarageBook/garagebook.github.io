# Analytics Events

De publieke GarageBook-site gebruikt GA4 Measurement ID `G-HZE3QJPSBR`.

De centrale analytics-flow is opgesplitst over [assets/js/klaro-consent.js](/mnt/raid1/GarageBook/Website/GarageBook/assets/js/klaro-consent.js) en [assets/js/analytics-events.js](/mnt/raid1/GarageBook/Website/GarageBook/assets/js/analytics-events.js):

- `klaro-consent.js` initialiseert `window.dataLayer`, `window.gtag`, `gtag.js` en Consent Mode default denied
- `analytics-events.js` bewaart pre-consent events in een queue
- na Klaro-acceptatie volgt `analytics_storage: granted`, exact één `page_view` en daarna replay van de queue

## Events op garagebook.nl

- `page_view`
- `start_click`
- `blog_cta_click`
- `outbound_referral_click`

De helper stuurt alleen technische en marketingparameters mee, zoals URL's, paden, CTA-tekst, `cta_location` en `blog_slug`. Er worden geen persoonsgegevens naar GA4 gestuurd.

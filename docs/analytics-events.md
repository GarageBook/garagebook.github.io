# Analytics Events

De publieke GarageBook-site gebruikt GA4 Measurement ID `G-HZE3QJPSBR`.

De GA4 loader en click-events staan centraal in [assets/js/analytics-events.js](/mnt/raid1/GarageBook/Website/GarageBook/assets/js/analytics-events.js). Die helper configureert cross-domain linking voor:

- `garagebook.nl`
- `www.garagebook.nl`
- `app.garagebook.nl`

## Events op garagebook.nl

- `start_click`
- `blog_cta_click`
- `outbound_referral_click`

De helper stuurt alleen technische en marketingparameters mee, zoals URL’s, paden, CTA-tekst, `cta_location` en `blog_slug`. Er worden geen persoonsgegevens naar GA4 gestuurd.

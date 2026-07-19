# Marketing analytics

Deze documentatie beschrijft de centrale GA4 tracking voor de statische marketingwebsite van GarageBook. De implementatie staat in [assets/js/klaro-consent.js](/mnt/raid1/GarageBook/Website/GarageBook/assets/js/klaro-consent.js) en [assets/js/analytics-events.js](/mnt/raid1/GarageBook/Website/GarageBook/assets/js/analytics-events.js). De overige UI-logica blijft in [script.js](/mnt/raid1/GarageBook/Website/GarageBook/script.js).

## GA4 loading

- Measurement ID: `G-L3BERFQ7KV`
- Deze marketing-site hoort naar de GA4 webstream `GarageBook website` op `https://garagebook.nl` te meten.
- Alle publieke pagina's laden centraal:
  - `assets/js/klaro-consent.js`
  - `assets/vendor/klaro/klaro-no-css.js`
  - `assets/js/analytics-events.js`
- `klaro-consent.js` maakt `window.dataLayer` en `window.gtag` vroeg beschikbaar, laadt `gtag.js` centraal en zet vóór GA4-configuratie:
  - `gtag('consent', 'default', { analytics_storage: 'denied' })`
- Daarna configureert de site GA4 met:
  - `gtag('config', 'G-L3BERFQ7KV', { send_page_view: false })`
- Cross-domain linker blijft geconfigureerd voor `garagebook.nl`, `www.garagebook.nl` en `app.garagebook.nl`

## Consent flow

1. Bij pageload wordt Consent Mode standaard op denied gezet.
2. Klaro bepaalt of er al opgeslagen analytics-consent is.
3. Bij acceptatie of bestaande opgeslagen consent stuurt de site:
   - `gtag('consent', 'update', { analytics_storage: 'granted' })`
4. Pas daarna worden de eerste `page_view` en eventuele gequeue'de events verstuurd.

## Page view en queue

- De site gebruikt `send_page_view: false` om dubbele pageviews te voorkomen.
- [assets/js/analytics-events.js](/mnt/raid1/GarageBook/Website/GarageBook/assets/js/analytics-events.js) bewaart pre-consent events eerst in een lokale queue.
- Na Klaro-acceptatie wordt exact één `page_view` verstuurd voor de huidige pagina.
- Daarna replayt de helper de gequeue'de events in volgorde.
- Als consent al opgeslagen was, gebeurt dit direct bij pageload.

## Events

### `start_click`

Trigger: klik op CTA's die uitkomen op `https://app.garagebook.nl/admin/register`, `app.garagebook.nl/admin/register`, `/start` of het legacy registratiepad dat naar `/start` wordt genormaliseerd.

Parameters:

- `link_url`
- `link_text`
- `page_location`
- `page_path`
- `cta_location`

### `blog_cta_click`

Trigger: klik vanaf een `/blog/` pagina naar `https://app.garagebook.nl/admin/register`.

Parameters:

- `link_url`
- `link_text`
- `page_location`
- `page_path`
- `blog_slug`

### `outbound_referral_click`

Trigger: klik naar externe domeinen buiten `garagebook.nl`, `www.garagebook.nl` en `app.garagebook.nl`.

Parameters:

- `link_url`
- `page_path`

## Querystring preservation

CTA-links naar `https://app.garagebook.nl/admin/register` behouden bestaande queryparameters op de link en vullen ontbrekende queryparameters van de huidige pagina aan. Zo blijven UTM's en andere marketingparameters behouden zonder bestaande doel-URL-parameters te overschrijven.

## Privacy

Er worden geen persoonsgegevens naar GA4 gestuurd. Eventpayloads bevatten alleen technische en marketingparameters zoals link-URL, linktekst, paginapad, paginalocatie, `cta_location` en `blog_slug`.

## Lokaal testen

Controleer lokaal in DevTools:

- elke publieke pagina laadt `assets/js/klaro-consent.js` en `assets/js/analytics-events.js`
- `gtag('consent', 'default', { analytics_storage: 'denied' })` staat vóór de GA4-config
- bij Klaro-acceptatie volgt `gtag('consent', 'update', { analytics_storage: 'granted' })`
- er wordt exact één `page_view` verstuurd na consent
- klikken blijven normaal navigeren als GA4 of een adblocker het request blokkeert

## GA4 DebugView controleren

1. Open een productiepagina op `garagebook.nl` met desgewenst UTM-parameters.
2. Bevestig dat Consent Mode eerst `analytics_storage: denied` gebruikt.
3. Accepteer analytics via Klaro.
4. Controleer dat één `page_view` binnenkomt voor de huidige pagina.
5. Klik een header-, hero-, footer- en blog-CTA naar `app.garagebook.nl/admin/register`.
6. Controleer dat `start_click` binnenkomt met `link_url`, `link_text`, `page_location`, `page_path` en `cta_location`.
7. Controleer op een blogartikel dat daarnaast `blog_cta_click` binnenkomt met `blog_slug`.
8. Klik een externe social link en controleer `outbound_referral_click`.

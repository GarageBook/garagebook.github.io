# Marketing analytics

Deze documentatie beschrijft de centrale GA4 tracking voor de statische marketingwebsite van GarageBook. De implementatie staat in [assets/js/analytics-events.js](/mnt/raid1/GarageBook/Website/GarageBook/assets/js/analytics-events.js). De overige UI-logica blijft in [script.js](/mnt/raid1/GarageBook/Website/GarageBook/script.js).

## GA4 loading

- Measurement ID: `G-HZE3QJPSBR`
- Geladen op alle publieke pagina's via een centrale `<script src=".../assets/js/analytics-events.js" defer></script>` include
- Cross-domain linker geconfigureerd voor `garagebook.nl`, `www.garagebook.nl` en `app.garagebook.nl`
- De helper voegt geen dubbele GA4-tag toe als dezelfde webstream al aanwezig is

## Events

### `start_click`

Trigger: klik op CTA's die uitkomen op `https://app.garagebook.nl/start`, `app.garagebook.nl/start`, `/start` of het legacy registratiepad dat naar `/start` wordt genormaliseerd.

Parameters:

- `link_url`
- `link_text`
- `page_location`
- `page_path`
- `cta_location`

### `blog_cta_click`

Trigger: klik vanaf een `/blog/` pagina naar `https://app.garagebook.nl/start`.

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

CTA-links naar `https://app.garagebook.nl/start` behouden bestaande queryparameters op de link en vullen ontbrekende queryparameters van de huidige pagina aan. Zo blijven UTM's en andere marketingparameters behouden zonder bestaande doel-URL-parameters te overschrijven.

## Privacy

Er worden geen persoonsgegevens naar GA4 gestuurd. Eventpayloads bevatten alleen technische en marketingparameters zoals link-URL, linktekst, paginapad, paginalocatie, `cta_location` en `blog_slug`.

## Lokaal testen

Controleer lokaal in DevTools:

- elke publieke pagina laadt `assets/js/analytics-events.js`
- CTA-links naar `app.garagebook.nl/start` behouden bestaande querystrings
- klikken blijven normaal navigeren als GA4 of een adblocker het request blokkeert
- `outbound_referral_click` wordt niet opgebouwd voor `garagebook.nl` of `app.garagebook.nl`

## GA4 DebugView controleren

1. Open een productiepagina op `garagebook.nl` met desgewenst UTM-parameters.
2. Activeer GA4 DebugView of een debug-extensie.
3. Klik een header-, hero-, footer- en blog-CTA naar `app.garagebook.nl/start`.
4. Controleer dat `start_click` binnenkomt met `link_url`, `link_text`, `page_location`, `page_path` en `cta_location`.
5. Controleer op een blogartikel dat daarnaast `blog_cta_click` binnenkomt met `blog_slug`.
6. Klik een externe social link en controleer `outbound_referral_click`.

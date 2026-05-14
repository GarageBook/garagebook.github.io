# Marketing analytics

Deze documentatie beschrijft de centrale tracking voor de statische marketingwebsite van GarageBook. De implementatie staat in `script.js` en werkt zonder inline tracking per pagina.

## Events

### `clicked_start_gratis`

Trigger: elke klik op een link naar `https://app.garagebook.nl/start`.

Parameters:

- `cta_text`
- `page_path`
- `cta_location`
- `destination_url`

`cta_location` wordt centraal afgeleid als `header`, `hero`, `footer`, `blog` of `body`.

### `blog_cta_clicked`

Trigger: elke klik vanaf een blogpagina naar:

- `https://app.garagebook.nl/start`
- relevante money pages op `garagebook.nl`, zoals `/digitaal-onderhoudsboekje/`, `/motor-onderhoud-app/`, `/onderhoudsboekje-motor/` en vergelijkbare landingspagina's.

Parameters:

- `page_path`
- `blog_slug`
- `cta_text`
- `destination_url`

### `outbound_click`

Trigger: klikken naar externe websites buiten `garagebook.nl`, `www.garagebook.nl` en `app.garagebook.nl`.

Parameters:

- `page_path`
- `destination_domain`
- `destination_url`

### `scroll_depth`

Trigger: 50%, 75% en 90% scroll op de homepage, actieve landingspagina's en blogpagina's.

Parameters:

- `page_path`
- `scroll_percentage`

### `landing_page_engaged`

Trigger: zodra iemand minimaal 30 seconden op een belangrijke pagina blijft of 50% scrollt. Dit event wordt maximaal een keer per paginabezoek verzonden.

Parameters:

- `page_path`
- `page_type`

`page_type` is `homepage`, `landing` of `blog`.

## Verzending naar GA4/GTM

De centrale helper `window.garagebookTrack()` stuurt events alleen op productiehostnames:

- `garagebook.nl`
- `www.garagebook.nl`

Als `window.dataLayer` aanwezig is, wordt `window.dataLayer.push({ event, ...params })` gebruikt. Als alleen `gtag` beschikbaar is, valt de code terug op `gtag('event', eventName, params)`.

Tracking is defensief opgezet: fouten door adblockers, privacytools of ontbrekende GA4 scripts blokkeren nooit de normale klik of navigatie.

## UTM preservation

Links naar `https://app.garagebook.nl/start` krijgen bestaande UTM-parameters uit de huidige URL mee. De volgende parameters worden behouden:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`

Voorbeeld:

```text
https://garagebook.nl/?utm_source=mailerlite&utm_medium=email&utm_campaign=feature_update_mei
```

wordt bij een Start gratis CTA:

```text
https://app.garagebook.nl/start?utm_source=mailerlite&utm_medium=email&utm_campaign=feature_update_mei
```

Bestaande UTM-parameters op de doel-URL worden niet overschreven.

## Privacy

De marketingtracking stuurt geen persoonsgegevens, formulierinhoud of vrije tekstvelden mee. De payloads bevatten alleen generieke velden zoals URL-pad, CTA-tekst, bestemming, domein, scrollpercentage en paginatype.

## Lokaal testen

Open een lokale pagina met UTM's, bijvoorbeeld:

```text
http://localhost:8000/?utm_source=mailerlite&utm_medium=email&utm_campaign=test
```

Controleer in DevTools:

- links naar `https://app.garagebook.nl/start` bevatten de UTM-parameters na `DOMContentLoaded`
- klikken blijven normaal navigeren
- er zijn geen console errors
- analytics wordt op localhost niet naar GA4 verzonden door de productiehost-gating

Voor functionele lokale checks kan een test-harness de hostname simuleren als `garagebook.nl` en `window.dataLayer` inspecteren.

## GA4 DebugView controleren

Na deploy:

1. Open een productiepagina met UTM-parameters.
2. Activeer GA DebugView of een browser debug-extensie.
3. Klik op een header-, hero-, footer- en inline CTA.
4. Controleer in GA4 DebugView dat de events binnenkomen met de verwachte parameters:
   - `clicked_start_gratis`
   - `blog_cta_clicked`
   - `outbound_click`
   - `scroll_depth`
   - `landing_page_engaged`


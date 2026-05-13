# Analytics marketing site

Laatste controle uitgevoerd op 13 mei 2026.

## Huidige GA4 implementatie

- De marketingsite laadt GA4 rechtstreeks in de `<head>` van elke actieve publieke pagina.
- De gebruikte Measurement ID op `garagebook.nl` is `G-55BFEXZGMC`.
- De CTA-eventlogica draait centraal via [script.js](/mnt/raid1/GarageBook/Website/GarageBook/script.js).
- Er is per pagina één GA4-loader aangetroffen. Er zijn geen dubbele GA4 `gtag.js` loaders of dubbele `gtag('config', ...)` calls op dezelfde pagina gevonden.
- Dezelfde GA4-snippet stond voorheen op elke pagina ongeconditioneerd aan, dus ook bij lokaal openen of andere niet-productie-hostnames.

## Productie-only gedrag

Vanaf deze wijziging start analytics alleen nog als `window.location.hostname` gelijk is aan:

- `garagebook.nl`
- `www.garagebook.nl`

Daardoor:

- geen tracking op `localhost`
- geen tracking op lokale preview-bestanden
- geen tracking op andere niet-productie-hostnames

## CTA tracking

Alle links naar `app.garagebook.nl` worden centraal behandeld in [script.js](/mnt/raid1/GarageBook/Website/GarageBook/script.js).

### Event

- Eventnaam: `cta_click`

### Verstuurde parameters

- `cta_text`
- `cta_location`
- `destination_url`
- `page_path`
- `page_title`

### CTA-locaties die nu automatisch worden herkend

- `navbar`
- `hero`
- `footer`
- `blog_inline`
- `blog_end`
- `cta_section`
- `content`

### Welke CTA's worden gemeten

- Alle links naar `https://app.garagebook.nl/start`
- Alle links naar `https://app.garagebook.nl/admin/login`
- Andere app-gerelateerde links naar `https://app.garagebook.nl/...`

Dat betekent concreet dat onder meer deze onderdelen worden gemeten:

- hero CTA's op homepage en SEO-landingspagina's
- navbar CTA's
- footer CTA's zoals `Start gratis`, `Inloggen`, `Naar de app`
- inline blog CTA's
- afsluitende blog CTA-banners

## UTM-behoud naar app.garagebook.nl

De marketingsite kopieert nu alle huidige queryparameters die beginnen met `utm_` naar app-links, zolang de doel-URL die parameters nog niet heeft.

Voorbeeld:

- binnenkomende URL: `/motor-onderhoud-app/?utm_source=mailerlite&utm_medium=email&utm_campaign=nieuwsbrief-mei`
- CTA-doel zonder query: `https://app.garagebook.nl/start`
- uiteindelijke CTA-doel: `https://app.garagebook.nl/start?utm_source=mailerlite&utm_medium=email&utm_campaign=nieuwsbrief-mei`

Belangrijk:

- bestaande queryparameters op de doel-URL blijven intact
- bestaande `utm_` parameters op de doel-URL worden niet overschreven
- dit gebeurt zonder CTA-tekst, layout of routing aan te passen

## Cross-domain voorbereiding

De Measurement ID van de marketingsite is op 13 mei 2026 gecontroleerd als:

- marketingsite `garagebook.nl`: `G-55BFEXZGMC`

De Measurement ID van de app-home op `https://app.garagebook.nl` is op 13 mei 2026 gecontroleerd als:

- app `app.garagebook.nl`: `G-6KJM1W5N63`

Conclusie:

- de marketingsite en app gebruiken momenteel niet dezelfde GA4 Measurement ID
- cross-domain meting binnen dezelfde GA4 property is daarmee nog niet volledig voorbereid
- voor volledige sessiecontinuiteit tussen marketingsite en app moeten beide domeinen onder dezelfde GA4 property of een expliciet ontworpen meetstrategie vallen

## Testplan

### 1. CTA-click lokaal functioneel controleren

Open een pagina met UTM's, bijvoorbeeld:

```text
http://localhost:8000/motor-onderhoud-bijhouden/?utm_source=mailerlite&utm_medium=email&utm_campaign=test-mei
```

Controleer daarna in DevTools:

- dat app-CTA's in de DOM een `href` hebben met dezelfde `utm_` parameters
- dat geen request naar `googletagmanager.com/gtag/js` wordt gedaan op localhost

### 2. CTA-click op productie testen

Open op productie een pagina zoals:

```text
https://garagebook.nl/motor-onderhoud-bijhouden/?utm_source=mailerlite&utm_medium=email&utm_campaign=test-mei
```

Klik daarna op:

- navbar CTA
- hero CTA
- footer CTA
- een blog inline CTA
- een blog-eind CTA

Controleer per klik:

- eventnaam `cta_click`
- juiste `cta_text`
- juiste `cta_location`
- `destination_url` inclusief verwachte `utm_` parameters
- `page_path` van de huidige SEO-landingspagina of blogpagina

### 3. Controleren in GA4 DebugView

In GA4:

1. Open `Admin`.
2. Open `DebugView`.
3. Activeer desnoods GTM/GA debug-extensie of gebruik browser debug mode.
4. Klik een marketing-CTA op productie.
5. Controleer dat `cta_click` binnenkomt met de verwachte parameters.

### 4. Voorbeeld event payload

```json
{
  "event": "cta_click",
  "cta_text": "Start gratis",
  "cta_location": "hero",
  "destination_url": "https://app.garagebook.nl/start?utm_source=mailerlite&utm_medium=email&utm_campaign=test-mei",
  "page_path": "/motor-onderhoud-bijhouden/",
  "page_title": "Motor onderhoud bijhouden? Zo doe je dat overzichtelijk"
}
```

## Testresultaat van deze wijziging

Statisch gecontroleerd op 13 mei 2026:

- marketingsite Measurement ID bevestigd als `G-55BFEXZGMC`
- app Measurement ID bevestigd als `G-6KJM1W5N63`
- bestaande dubbele GA4-loaders op dezelfde pagina niet aangetroffen
- productie-only gating toegevoegd aan alle actieve marketingpagina's
- centrale `cta_click` payload aangepast naar de gevraagde velden
- UTM-doorvoer naar `app.garagebook.nl` toegevoegd in [script.js](/mnt/raid1/GarageBook/Website/GarageBook/script.js)

Niet live geverifieerd vanuit GA4 zelf:

- geen directe toegang tot GA4 DebugView in deze workspace
- geen end-to-end validatie van redirects op de app-server uitgevoerd

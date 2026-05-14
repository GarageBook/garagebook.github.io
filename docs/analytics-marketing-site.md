# Analytics marketing site

> Verouderde auditnotitie. De actuele marketingwebsite-tracking staat in [analytics-marketing.md](/mnt/raid1/GarageBook/Website/GarageBook/docs/analytics-marketing.md) en gebruikt de events `clicked_start_gratis`, `blog_cta_clicked`, `outbound_click`, `scroll_depth` en `landing_page_engaged`.

Laatste controle uitgevoerd op 14 mei 2026.

## Implementatie

- De marketingsite laadt GA4 rechtstreeks in de `<head>` van actieve publieke pagina's.
- De centrale GA4 Measurement ID is `G-6KJM1W5N63`.
- Events en UTM-preservation draaien centraal via [script.js](/mnt/raid1/GarageBook/Website/GarageBook/script.js).
- Analytics wordt alleen verzonden op `garagebook.nl` en `www.garagebook.nl`.
- Lokale preview, localhost en geblokkeerde analytics scripts mogen geen JavaScript errors veroorzaken.

## Actuele events

- `clicked_start_gratis`
- `blog_cta_clicked`
- `outbound_click`
- `scroll_depth`
- `landing_page_engaged`

Zie [analytics-marketing.md](/mnt/raid1/GarageBook/Website/GarageBook/docs/analytics-marketing.md) voor triggers, parameters, privacy-afspraken, lokale teststappen en GA4 DebugView-controle.

# Analytics marketing site

> Verouderde auditnotitie. De actuele implementatie staat in [analytics-marketing.md](/mnt/raid1/GarageBook/Website/GarageBook/docs/analytics-marketing.md).

Laatste controle uitgevoerd op 31 mei 2026.

## Huidige status

- GA4 Measurement ID: `G-6KJM1W5N63`
- De site gebruikt nu Google Consent Mode met standaard `analytics_storage: denied`
- Klaro zet analytics na acceptatie naar `analytics_storage: granted`
- Pas daarna verstuurt de site exact één `page_view` en replayt eventuele gequeue'de events
- De marketing-site hoort in de property `GarageBook` binnen te komen. De tijdelijke wissel naar `G-HZE3QJPSBR` op 21 mei 2026 is teruggedraaid.
- Lokale publieke pagina's laden geen losse inline GA4-snippets meer

# Analytics marketing site

> Verouderde auditnotitie. De actuele implementatie staat in [analytics-marketing.md](/mnt/raid1/GarageBook/Website/GarageBook/docs/analytics-marketing.md).

Laatste controle uitgevoerd op 31 mei 2026.

## Huidige status

- GA4 Measurement ID: `G-HZE3QJPSBR`
- De site gebruikt nu Google Consent Mode met standaard `analytics_storage: denied`
- Klaro zet analytics na acceptatie naar `analytics_storage: granted`
- Pas daarna verstuurt de site exact één `page_view` en replayt eventuele gequeue'de events
- De oude property `G-6KJM1W5N63` is niet teruggezet; een nul-lijn vanaf 21 of 22 mei 2026 kan ook betekenen dat daar in de verkeerde property wordt gekeken
- Lokale publieke pagina's laden geen losse inline GA4-snippets meer

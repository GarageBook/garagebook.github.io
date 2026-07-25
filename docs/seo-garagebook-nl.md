# SEO quality gate voor garagebook.nl

Garagebook.nl gebruikt een harde trailing-slash canonical strategie voor de statische marketing- en blogsite. De quality gate staat in `./seo-check.sh` en wordt verplicht gedraaid door `publish-commit.sh` en `publish-release.sh`. Een fout stopt het script met exitcode 1.

## Trailing-slash beleid

- Canonical pagina-URLs eindigen met een trailing slash.
- De homepage is `https://garagebook.nl/`.
- Interne pagina-URLs zonder slash zijn redirectvarianten en mogen niet in HTML-links, sitemap of canonical tags staan.
- Links naar `/index.html` zijn niet toegestaan. Link altijd naar de route, bijvoorbeeld `/blog/` of `/motor-onderhoud-app/`.

## Canonical regels

Elke normale `index.html` pagina moet een canonical tag hebben. De canonical moet exact overeenkomen met de fysieke route:

- `index.html` -> `https://garagebook.nl/`
- `blog/index.html` -> `https://garagebook.nl/blog/`
- `motor-onderhoud-app/index.html` -> `https://garagebook.nl/motor-onderhoud-app/`

Canonical tags mogen geen querystring, anchor, non-slash variant, andere host of `http://` gebruiken.

## Sitemap regels

`sitemap.xml` moet bestaan en alleen canonical URLs bevatten:

- alleen `https://garagebook.nl/...`
- normale pagina-URLs eindigen met `/`
- geen querystrings
- geen anchors
- geen duplicates
- focuspagina's moeten aanwezig blijven

De vaste focuspagina's zijn onder andere homepage, blog, digitaal onderhoudsboekje, motor onderhoud app, auto onderhoud app, voertuighistorie bij verkoop, onderhoudsboekje oldtimer en de oldtimer-historie blog.

## Openbare garages en sitemaps

De marketingsite publiceert op dit moment een sitemap: de statische `sitemap.xml` als gewone `<urlset>` via GitHub Pages. Productie gebruikt nu geen sitemap-index en `https://garagebook.nl/sitemap-garages.xml` bestaat momenteel niet op de apex-host.

Individuele publieke garagepagina's staan daarom niet in de statische marketingsitemap. Voeg geen losse `/garage/...` URLs toe aan `sitemap.xml` en selecteer of scrape geen voertuigen vanuit deze codebase.

Wanneer publieke garagepagina's later via een sitemap aangeboden worden, moet `sitemap-garages.xml` als statisch bestand naar GitHub Pages worden gepubliceerd. De privacyveilige bron daarvan moet uit de Laravel-app komen en minimaal expliciet aangeven dat een voertuig publiek, indexeerbaar en geschikt voor opname is. Deze statische codebase mag geen directe databaseverbinding, runtime API-call of eigen voertuigselectie introduceren.

## Interne-link regels

Interne links naar HTML-pagina's moeten de canonical slash-versie gebruiken. Toegestaan zijn:

- `/`
- `/blog/`
- `/motor-onderhoud-app/`
- `/blog/artikelnaam/`
- anchors binnen de pagina, zoals `#main-content`

Niet toegestaan zijn:

- `/blog`
- `/motor-onderhoud-app`
- `/blog/index.html`
- `https://garagebook.nl/blog`

`mailto:`, `tel:`, externe links en assets worden genegeerd door de canonical page-link controle.

## Structured-data regels

JSON-LD moet parsebaar zijn. `Product` schema is niet toegestaan op de marketing/blog pagina's, zodat het niet per ongeluk terugkomt. Veelgebruikte toegestane types zijn:

- `Organization`
- `WebSite`
- `WebPage`
- `BreadcrumbList`
- `FAQPage`
- `BlogPosting`
- `SoftwareApplication`
- `HowTo`

## Basic SEO regels

Elke canonical HTML-pagina moet hebben:

- een niet-lege `<title>`
- een niet-lege meta description
- exact één `<h1>`
- een canonical tag
- geen `noindex`, tenzij de pagina expliciet op een allowlist staat

De huidige `noindex` allowlist in `seo-check.sh` is bewust beperkt tot bestaande routes die wel gesynct worden maar niet als normale indexeerbare SEO-pagina in de sitemap staan:

- `geratel/index.html`
- `ktm-390-duke-onderhoud/index.html`
- `triumph-bonneville-t120-onderhoud/index.html`

Nieuwe pagina's mogen niet op deze allowlist worden gezet zonder expliciet SEO-besluit.

## Checklist voor nieuwe pagina's en blogs

1. Maak de pagina als `route/index.html`.
2. Zet canonical op `https://garagebook.nl/route/`.
3. Gebruik alleen interne links met trailing slash.
4. Voeg de pagina toe aan `sitemap.xml` met trailing slash.
5. Voeg de pagina toe aan `publish-sync.sh` en `publish-commit.sh` als die route gepubliceerd moet worden.
6. Voeg relevante interne links toe vanaf hubpagina's of blogoverzicht.
7. Controleer title, meta description en exact één H1.
8. Gebruik alleen parsebare JSON-LD en geen `Product` schema.
9. Draai `./seo-check.sh` voordat je commit of publiceert.

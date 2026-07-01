# Motortype-pagina's: schema en workflow

Laatste bijgewerkt: 2026-07-01.

## Wat zijn motortype-pagina's?

Motortype-pagina's zijn modelspecifieke landingspagina's met het officiële onderhoudsschema van een bepaald motormodel. Voorbeelden: `yamaha-mt-07-onderhoud/`, `bmw-r1250gs-onderhoud/`.

Ze zijn onderdeel van Fase 6 van het SEO-plan en bedoeld voor zoekopdrachten zoals "Yamaha MT-07 onderhoud" en "BMW R1250GS onderhoudsschema".

## Bestandsstructuur

```
data/
  motortypes.json              ← brondata voor alle modellen
scripts/
  generate-motortype-pages.js  ← generator
yamaha-mt-07-onderhoud/
  index.html                   ← gegenereerde pagina (noindex totdat goedgekeurd)
bmw-r1250gs-onderhoud/
  index.html
honda-cbr1000rr-fireblade-onderhoud/
  index.html
ktm-390-duke-onderhoud/
  index.html
triumph-bonneville-t120-onderhoud/
  index.html
```

## Brondata: data/motortypes.json

Het bestand is een JSON-array. Elk object beschrijft één motormodel volledig. De generator leest dit bestand en genereert voor elk model een `index.html`.

### Schema per model

```json
{
  "slug":      "yamaha-mt-07-onderhoud",
  "merk":      "Yamaha",
  "model":     "MT-07",
  "bouwjaren": "2015 tot heden",
  "categorie": "Naked middleweight",

  "meta": {
    "title":       "...",
    "description": "...",
    "ogImage":     "https://garagebook.nl/assets/motor-onderhoud-garagebook.webp"
  },

  "hero": {
    "h1":         "...",
    "subtitle":   "...",
    "paragraphs": ["...", "..."],
    "points":     ["...", "...", "..."]
  },

  "kortAntwoord": {
    "heading": "...",
    "lead":    "...",
    "body":    "..."
  },

  "intro": {
    "label":      "Model en doelgroep",
    "heading":    "...",
    "paragraphs": ["...", "..."]
  },

  "onderhoud": {
    "heading":      "Officieel onderhoudsschema ...",
    "bouwjaarNote": null,
    "bron_url":     "https://maintenanceschedule.com/...",
    "bron_naam":    "maintenanceschedule.com (gebaseerd op handboek)",
    "items": [
      {
        "werkzaamheid": "Olieverversing",
        "interval":     "10.000 km of 1 jaar",
        "toelichting":  "..."
      }
    ]
  },

  "aandachtspunten": {
    "heading": "...",
    "items": [
      { "titel": "...", "tekst": "..." }
    ]
  },

  "garageSection": {
    "heading":    "...",
    "paragraphs": ["...", "..."]
  },

  "relatedSection": {
    "heading": "Gerelateerde pagina's",
    "prose":   "Lees ook meer over <a href=\"/...\">...</a>..."
  },

  "faq": [
    { "vraag": "...", "antwoord": "..." }
  ],

  "ctaText": "Start gratis met je ... onderhoudshistorie",

  "stats": null
}
```

### Verplichte velden

De generator weigert een pagina te genereren als een van deze velden ontbreekt:

- `slug`, `merk`, `model`, `bouwjaren`, `categorie`
- `meta.title`, `meta.description`, `meta.ogImage`
- `hero.h1`, `hero.subtitle`, `hero.paragraphs` (minimaal 2), `hero.points` (minimaal 3)
- `kortAntwoord.heading`, `kortAntwoord.lead`, `kortAntwoord.body`
- `intro.label`, `intro.heading`, `intro.paragraphs` (minimaal 2)
- `onderhoud.heading`, `onderhoud.bron_url`, `onderhoud.bron_naam`, `onderhoud.items` (minimaal 4)
- `aandachtspunten.heading`, `aandachtspunten.items` (minimaal 2)
- `garageSection.heading`, `garageSection.paragraphs` (minimaal 1)
- `relatedSection.prose`
- `faq` (minimaal 4 items)
- `ctaText`

### Het `stats`-veld (Bonus-fase)

Het veld `stats` is nu `null` voor alle modellen. Dit is gereserveerd voor de toekomstige Bonus-fase: data-gedreven publieke onderhoudspagina's op basis van geanonimiseerde GarageBook-gebruikersdata (bijv. "van de 143 Honda CBR1000RR-eigenaren in GarageBook wisselen de meesten olie rond 5.500 km").

Wanneer app.garagebook.nl een API biedt voor dergelijke aggregatiedata, voeg je de gegevens toe aan het `stats`-veld per model en herbouw je de pagina's via de generator. De generator is al voorbereid om dit blok te verwerken zodra het schema beschikbaar is.

## Generator draaien

```bash
node scripts/generate-motortype-pages.js
```

De generator:

1. Leest `data/motortypes.json`
2. Valideert alle verplichte velden per model
3. Schrijft `{slug}/index.html` voor elk geldig model
4. Drukt een overzicht af van gegenereerde en overgeslagen pagina's

Bij een ontbrekend verplicht veld wordt het model overgeslagen met een foutmelding en sluit het script met exit code 1.

## Noindex-workflow

Alle gegenereerde pagina's starten met:

```html
<meta name="robots" content="noindex, follow" />
```

Dit is een vangnet tegen dunne content bij een eerste publicatie. Pas een pagina aan naar `index` als:

1. De pagina inhoudelijk voldoende uniek is (differentiatievelden gevuld, FAQ relevant, aandachtspunten specifiek).
2. Jij expliciet akkoord hebt gegeven voor dat specifieke model.

Om een pagina te indexeren:

1. Pas de meta-tag aan in `{slug}/index.html`:
   ```html
   <meta name="robots" content="index, follow, max-image-preview:large" />
   ```
2. Voeg de URL toe aan `sitemap.xml`:
   ```xml
   <url><loc>https://garagebook.nl/{slug}/</loc><lastmod>YYYY-MM-DD</lastmod></url>
   ```
3. Publiceer via `publish-release.sh`.

Pagina's met `noindex` worden niet aan `sitemap.xml` toegevoegd, maar worden wel gewoon meegenomen in de publish-flow zodat ze live zijn (bereikbaar via directe URL, maar niet geindexeerd).

## Een nieuw model toevoegen

1. Voeg een nieuw object toe aan `data/motortypes.json` met alle verplichte velden.
2. Draai `node scripts/generate-motortype-pages.js`.
3. Voeg de slug toe aan `publish-sync.sh` (PAGE_FILES-array en show_summary).
4. Voeg de slug toe aan `publish-commit.sh` (git add-lijst).
5. Publiceer en beoordeel de pagina voor je `noindex` aanpast.
6. Wanneer je akkoord geeft: pas `noindex` aan en voeg URL toe aan `sitemap.xml`.

## Huidige pilotset (2026-07-01)

| Model | Slug | Categorie | Status |
|-------|------|-----------|--------|
| Yamaha MT-07 | `yamaha-mt-07-onderhoud` | Naked middleweight | noindex (piloot) |
| BMW R1250GS | `bmw-r1250gs-onderhoud` | Adventure touring | noindex (piloot) |
| Honda CBR1000RR Fireblade (2017-2019) | `honda-cbr1000rr-fireblade-onderhoud` | Supersport | noindex (piloot) |
| KTM 390 Duke (2013-2023) | `ktm-390-duke-onderhoud` | Entry naked | noindex (piloot) |
| Triumph Bonneville T120 (2016-2020) | `triumph-bonneville-t120-onderhoud` | Retro klassiek | noindex (piloot) |

## Databronnen en verificatie

Alle interval-data is geverifieerd via [maintenanceschedule.com](https://maintenanceschedule.com) op basis van fabriekshandboeken, met expliciete bronvermelding per pagina. Aandachtspunten (community-gerapporteerde issues) zijn geformuleerd als "rijders melden regelmatig..." om ze te onderscheiden van fabrikantsinformatie.

Controleer bij twijfel altijd het originele fabriekshandboek van het betreffende bouwjaar.

## Relatie tot Bonus-fase

De Bonus-fase voorziet in data-gedreven pagina's op basis van echte geanonimiseerde GarageBook-data. De `stats: null`-structuur in het JSON-schema is al voorbereid op die uitbreiding. Wanneer de Bonus-fase wordt geactiveerd:

1. De app.garagebook.nl API levert aggregatiedata per model.
2. De generator wordt uitgebreid met een `--fetch-stats`-optie die de API raadpleegt.
3. Het `stats`-veld wordt gevuld met echte data.
4. De generator herbouwt de pagina's met rijkere, modelspecifieke inhoud.

Tot die tijd functioneren de pagina's op basis van handmatige brondata en zijn ze al volledig gestructureerd voor de uitbreiding.

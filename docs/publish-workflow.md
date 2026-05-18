# GarageBook Publish Workflow

Laatste bijgewerkt op 13 mei 2026.

## Overzicht

De GarageBook website werkt met twee verschillende mappen:

- Source/workspace: `/mnt/raid1/GarageBook/Website/GarageBook`
- Echte Git-repository: `/tmp/garagebook.github.io`

De Git remote van de echte repository is:

- `git@github.com:GarageBook/garagebook.github.io.git`

Belangrijk:

- de source-map is **geen** git repository
- wijzigingen worden **eerst** gemaakt in de source-map
- de publish-flow synchroniseert daarna alleen de goedgekeurde websitebestanden naar `/tmp/garagebook.github.io`
- commits en pushes gebeuren **alleen** vanuit `/tmp/garagebook.github.io`

## Architectuur

### Source/workspace

Pad:

- `/mnt/raid1/GarageBook/Website/GarageBook`

Dit is de werkmap voor:

- HTML van landingspagina's
- `styles.css`
- `script.js`
- geselecteerde `docs/` bestanden
- assets die op de website gebruikt worden
- publish-scripts

Deze map is leidend voor inhoudelijke wijzigingen, maar heeft zelf geen `.git` directory.

### Echte Git-repository

Pad:

- `/tmp/garagebook.github.io`

Dit is de echte GitHub Pages clone voor `garagebook.nl`.

Hier gebeuren:

- `git status`
- `git add`
- `git commit`
- `git push origin main`

### Richting van de workflow

De richting is altijd:

```text
/mnt/raid1/GarageBook/Website/GarageBook
        ↓
 publish-sync.sh
        ↓
/tmp/garagebook.github.io
        ↓
 git commit
        ↓
 git push origin main
```

## Publish flow stap voor stap

### 1. Wijzigingen maken in de source-map

Werk altijd in:

- `/mnt/raid1/GarageBook/Website/GarageBook`

Daar pas je de bronbestanden aan.

### 2. Sync naar de echte Git-repo

Script:

- [publish-sync.sh](/mnt/raid1/GarageBook/Website/GarageBook/publish-sync.sh)

Gebruik:

```bash
./publish-sync.sh /tmp/garagebook.github.io
```

Wat dit script doet:

- gebruikt de source-map als `SOURCE_DIR`
- gebruikt `/tmp/garagebook.github.io` als `TARGET_DIR`
- cloneert de GitHub Pages repo als die nog niet bestaat
- kopieert alleen de curated lijst met toegestane bestanden
- update `sitemap.xml` `lastmod`
- toont daarna `git status` in `/tmp/garagebook.github.io`

Belangrijk:

- de sync gaat van source naar Git-repo
- niet andersom
- er wordt niet blind de hele map gekopieerd
- nieuwe routes of blogs gaan alleen mee als ze expliciet in de curated arrays van `publish-sync.sh` staan

### 3. Lokale commit maken in de echte Git-repo

Script:

- [publish-commit.sh](/mnt/raid1/GarageBook/Website/GarageBook/publish-commit.sh)

Gebruik:

```bash
./publish-commit.sh /tmp/garagebook.github.io "Beschrijvende commit message"
```

Wat dit script doet:

- draait eerst `publish-sync.sh`
- staged alleen de curated lijst met goedgekeurde bestanden
- maakt daarna de commit in `/tmp/garagebook.github.io`
- pusht nog niet

Belangrijk:

- als een nieuw bestand niet expliciet in `publish-commit.sh` staat, wordt het ook niet gestaged voor de commit

### 4. Push naar GitHub

Script:

- [publish-release.sh](/mnt/raid1/GarageBook/Website/GarageBook/publish-release.sh)

Gebruik:

```bash
./publish-release.sh /tmp/garagebook.github.io "Beschrijvende commit message"
```

Wat dit script doet:

- draait eerst `publish-commit.sh`
- vraagt om expliciete bevestiging met `PUSH`
- voert daarna `git push origin main` uit vanuit `/tmp/garagebook.github.io`

## Welke bestanden wel en niet meegaan

### Wel meegenomen

Alleen bestanden die expliciet in de publish-scripts zijn opgenomen, zoals:

- rootbestanden zoals `index.html`, `styles.css`, `script.js`, `sitemap.xml`
- geselecteerde `docs/` bestanden
- goedgekeurde website-assets
- actieve blogpagina's
- actieve SEO-landingspagina's

### Verplicht bij nieuwe routes

Als je een nieuwe landingspagina of blog toevoegt, werk dan meteen ook deze plekken bij:

- `publish-sync.sh`
- `publish-commit.sh`
- `sitemap.xml`
- `blog/index.html` als het een blog is

Doe je dat niet, dan kan een pagina lokaal wel bestaan maar alsnog niet live komen.

### Niet blind meenemen

Niet automatisch meenemen:

- willekeurige lokale testbestanden
- caches
- tijdelijke exportbestanden
- oude of experimentele bestanden
- alles wat niet expliciet in de curated publish-lijst staat

Voorbeelden van bestanden die niet automatisch leidend zijn voor publish:

- `AGENTS.md`
- `.phcode.json`
- `_oud/`
- lokale `.old` of `alternatief` bestanden, tenzij expliciet toegevoegd aan de publish-flow

## Veilig werken

### Harde regels

- **Niet committen vanuit de source-map.**
- **Altijd eerst controleren waar `pwd` staat.**
- **Altijd eerst controleren of `git rev-parse --show-toplevel` werkt.**
- **Niet blind `rsync`, `cp -R` of bulk-copy gebruiken buiten de curated publish-flow.**
- **Altijd eerst `git status` controleren in `/tmp/garagebook.github.io`.**

### Praktische interpretatie

Als `git rev-parse --show-toplevel` faalt in je huidige map, dan zit je niet in de echte Git-repository. In dat geval:

- niet committen
- niet pushen
- eerst de publish-flow gebruiken

## Debug checklist

Gebruik bij elke wijziging deze checklist:

1. `pwd`
2. `git rev-parse --show-toplevel`
3. `git status`
4. Bevestig: source-map is `/mnt/raid1/GarageBook/Website/GarageBook`
5. Bevestig: echte Git-repo is `/tmp/garagebook.github.io`
6. Draai `./publish-sync.sh /tmp/garagebook.github.io`
7. Controleer of nieuwe routes of blogs echt in `git status` verschijnen
8. Controleer `git -C /tmp/garagebook.github.io status --short`
9. Maak commit via `./publish-commit.sh /tmp/garagebook.github.io "..."` of handmatig in `/tmp/garagebook.github.io`
10. Push via `./publish-release.sh /tmp/garagebook.github.io "..."` of `git -C /tmp/garagebook.github.io push origin main`
11. Controleer eindstatus met `git -C /tmp/garagebook.github.io status --short`

## Analytics-specifieke waarschuwing

Analytics-documentatie moet ook expliciet meegenomen worden in de publish-flow.

Minimaal:

- `docs/analytics-events.md`
- `docs/analytics-marketing-site.md`

Let ook op toekomstige analytics-documentatie onder `docs/`, bijvoorbeeld:

- toekomstige `docs/*analytics*`
- andere analytics- of tracking-notities die op GitHub Pages mee in versiebeheer moeten komen

Als een analytics-doc wel in de source-map bestaat maar niet in de curated publish-lijst staat, dan:

- komt die niet in `/tmp/garagebook.github.io`
- verschijnt die niet in `git status`
- wordt die niet gecommit of gepusht

Controleer daarom bij nieuwe analytics-documentatie altijd ook de publish-scripts.

## Samenvatting

De juiste werkwijze is:

1. wijzigen in `/mnt/raid1/GarageBook/Website/GarageBook`
2. syncen met `publish-sync.sh`
3. committen in `/tmp/garagebook.github.io`
4. pushen naar `origin/main`

Werk dus niet direct in de bronmap alsof dat de Git-repository is, en werk niet blind direct in `/tmp/garagebook.github.io` zonder de source-map als bron te behandelen.

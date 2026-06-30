# First-touch attributie

## Principe en levensduur

Bij het allereerste bezoek van een gebruiker aan garagebook.nl legt `assets/js/attribution.js`
vier velden vast en slaat ze op in `localStorage` onder de sleutel `gb_first_touch`.
De gegevens vervallen na 90 dagen.

Zodra deze waarden zijn opgeslagen, worden ze nooit meer overschreven (first-touch
attributie). Terugkerende bezoekers, andere landingspagina's en nieuwe UTM-campagnes
binnen dezelfde 90 dagen wijzigen de opgeslagen waarden niet.

## Vastgelegde velden

| Veld | Bron | Omschrijving |
|---|---|---|
| `first_source` | `utm_source` of referrer-hostname | Kanaal of domein dat het bezoek genereerde |
| `first_medium` | `utm_medium`, "referral" of "direct" | Medium van het eerste bezoek |
| `first_referrer` | `document.referrer` | Volledige referrer-URL (leeg bij direct bezoek) |
| `first_landing_page` | `window.location.pathname` | Pad van de eerste bezochte pagina |

Prioriteit: UTM-parameters uit de URL gaan voor `document.referrer`. Als geen van beide
beschikbaar is, worden source en medium als `"direct"` geregistreerd.

## URL-parameters die app.garagebook.nl ontvangt

Bij elke klik op een CTA naar `https://app.garagebook.nl/start` voegt `analytics-events.js`
de opgeslagen attributiewaarden toe als query-parameters aan de redirect-URL.
De bestaande UTM-parameters (`utm_source`, `utm_medium`, `utm_campaign`) blijven onaangetast.

De vier extra parameters die `app.garagebook.nl/start` kan ontvangen:

| Parameter | Waarde |
|---|---|
| `attr_source` | Waarde van `first_source` |
| `attr_medium` | Waarde van `first_medium` |
| `attr_referrer` | Waarde van `first_referrer` (URL-encoded, kan leeg zijn) |
| `attr_landing` | Waarde van `first_landing_page` (bijv. `/motor-onderhoud-app/`) |

Voorbeeld van een volledige CTA-URL na attributie-verrijking:

```
https://app.garagebook.nl/start
  ?utm_source=garagebook.nl
  &utm_medium=website
  &utm_campaign=organic_cta
  &attr_source=motorfreaks.nl
  &attr_medium=referral
  &attr_referrer=https%3A%2F%2Fwww.motorfreaks.nl%2Fartikel%2Fdigitaal-onderhoudsboekje
  &attr_landing=%2Fmotor-onderhoud-app%2F
```

## Testinstructies (handmatig, lokaal)

1. Open de browser developer tools (DevTools), tabblad Console.
2. Verwijder eventuele opgeslagen waarden: `localStorage.removeItem('gb_first_touch')`.
3. Open een landingspagina met een UTM-URL, bijv.:
   `index.html?utm_source=motorfreaks.nl&utm_medium=referral&utm_campaign=test`
4. Controleer in DevTools: `JSON.parse(localStorage.getItem('gb_first_touch'))`
   Verwacht: object met `first_source: "motorfreaks.nl"`, `first_medium: "referral"`,
   `first_landing_page: "/"`, en een `expires` waarde ~90 dagen in de toekomst.
5. Navigeer naar een andere pagina (bijv. `motor-onderhoud-app/index.html`).
   Controleer dat de opgeslagen waarden ongewijzigd zijn (first-touch).
6. Hover over een CTA-knop of klik met rechtermuisknop en kopieer de link.
   Verwacht: de URL bevat `attr_source=motorfreaks.nl&attr_medium=referral&attr_landing=%2F`.
7. Herhaal stap 2-4 zonder UTM-params en met een externe referrer in de browser:
   source en medium worden dan respectievelijk het referrer-domein en "referral".
8. Herhaal stap 2-4 zonder UTM-params en zonder referrer:
   source en medium worden respectievelijk "direct" en "direct".

---

## TODO: te implementeren in app.garagebook.nl repo

De volgende wijzigingen zijn nodig in de `app.garagebook.nl` codebase om de attributiedata
op te slaan bij gebruikersregistratie.

### Database migratie

Voeg vier nullable kolommen toe aan de `users` tabel (of de tabel die het gebruikersaccount
opslaat). Schrijf hiervoor een migratie passend bij het bestaande migratiesysteem van de app.

```sql
ALTER TABLE users
  ADD COLUMN first_attr_source    VARCHAR(255) DEFAULT NULL,
  ADD COLUMN first_attr_medium    VARCHAR(255) DEFAULT NULL,
  ADD COLUMN first_attr_referrer  VARCHAR(2048) DEFAULT NULL,
  ADD COLUMN first_attr_landing   VARCHAR(2048) DEFAULT NULL;
```

### Registratielogica

Lees op de `/start`-registratiepagina de vier `attr_*` query-parameters uit de request-URL:

- `attr_source`
- `attr_medium`
- `attr_referrer`
- `attr_landing`

Sla ze op bij het aanmaken van het gebruikersaccount. Schrijf alleen als de kolommen
nog `NULL` zijn (first-touch, nooit overschrijven):

```
IF users.first_attr_source IS NULL THEN
  users.first_attr_source  = params["attr_source"]
  users.first_attr_medium  = params["attr_medium"]
  users.first_attr_referrer = params["attr_referrer"]
  users.first_attr_landing  = params["attr_landing"]
END IF
```

Valideer de parameterwaarden voor opslag: begrens `attr_source` en `attr_medium` op
255 tekens, `attr_referrer` en `attr_landing` op 2048 tekens. Sla lege strings op als
`NULL`.

### Tests

Schrijf of update tests die controleren dat:

1. Bij een nieuwe registratie met `attr_*` params worden de vier kolommen gevuld.
2. Bij een registratie zonder `attr_*` params blijven alle vier kolommen `NULL`.
3. Bij een tweede registratiepoging (of accountupdate) worden de kolommen niet
   overschreven als ze al een waarde bevatten.

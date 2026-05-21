# Biolectric Commissioning Checklist App

A lightweight, mobile-friendly web application for creating, filling in, and exporting commissioning checklists. Built as a static site hosted on **GitHub Pages**, with **Supabase** as the backend (database, auth, file storage).

---

## Features

### Invullen
- **Multi-template homepage** — overzicht van alle actieve templates met directe startknop
- **Rijke vraagtypes** — checkbox, ja/nee, statuscheck, radio, tekst, getal, datum, foto, handtekening, checkgroep
- **Conditionele logica** — vragen tonen/verbergen op basis van een eerder antwoord
- **Vervolg-velden** — verduidelijkingsveld + optionele foto bij een specifiek antwoord (bv. bij "Niet OK")
- **Pre-fill vorige invulling** — status/radio/ja-nee antwoorden worden automatisch overgenomen van de vorige invulling van dezelfde template
- **Auto-opslaan** — elke 1,5 s debounce + elke 2 min interval, opgeslagen in Supabase
- **PDF export** — branded PDF met logo, klantinfo, alle antwoorden, foto's en handtekening
- **Word export** — zelfde layout als PDF, als .docx
- **Verstuur per mail** — PDF als bijlage via EmailJS (zonder eigen mailserver)
- **QR-code** — genereer een QR-code die rechtstreeks naar een specifieke template linkt

### Geschiedenis & beheer
- **Historiek** — alle ingevulde checklists doorzoeken, filteren op status/categorie, archiveren, verwijderen
- **Rapporten** — wizard voor het samenstellen van rapporten over meerdere submissions:
  - Rapporttype: Overzichtstabel / Afkeuringen / Volledig
  - Filters: template(s), periode, submissionstatus
  - Metadata: datum, ingevuld door, klant, locatie, referentie, opmerkingen
  - Export: PDF (print-venster), Word (.docx), CSV

### Admin
- **Template builder** — secties en vragen bouwen met drag-en-drop volgorde
- **Vertalingen** — export alle sjabloonteksten naar CSV, vertaal EN/FR/DE kolommen extern, importeer terug
- **Gebruikersbeheer** — gebruikers uitnodigen, rollen (admin/technieker) instellen
- **Branding** — bedrijfsnaam, accentkleur, logo en favicon instellen; direct zichtbaar op alle pagina's

### Instellingen
- **Taalvoorkeur** — NL / EN / FR / DE (UI + PDF-export)
- **Branding preview** — live preview van kleur en logo voor opslaan

---

## Pagina's

| Bestand | Beschrijving | Toegang |
|---|---|---|
| `index.html` | Homepage — templateoverzicht + recente submissions | Ingelogd |
| `fill.html` | Checklist invullen (`?template=ID` of `?submission=ID`) | Ingelogd |
| `history.html` | Alle ingevulde checklists — zoeken, filteren, archiveren | Ingelogd |
| `reports.html` | Rapportwizard — samenstellen + exporteren | Ingelogd |
| `admin.html` | Templatebeheer + gebruikersbeheer + vertaal-CSV | Admin |
| `settings.html` | Taal, branding (kleur/logo/favicon) | Ingelogd |
| `help.html` | In-app gebruikershandleiding | Ingelogd |
| `login.html` | Login / wachtwoord vergeten | Openbaar |
| `config.js` | Supabase + EmailJS credentials (nooit committen) | — |
| `branding.js` | Gedeelde branding helper (CSS vars, logo, favicon) | — |
| `auth.js` | Supabase auth wrapper — `AUTH.init()`, `AUTH.isAdmin()` | — |

---

## Tech Stack

| Laag | Technologie |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript (geen framework) |
| Hosting | GitHub Pages (statisch, geen server) |
| Database | Supabase (PostgreSQL + PostgREST) |
| Auth | Supabase Auth (email/wachtwoord) |
| Bestandsopslag | Supabase Storage |
| PDF | [jsPDF](https://github.com/parallax/jsPDF) + print-venster |
| Word | [html-docx-js](https://github.com/evidenceprime/html-docx-js) |
| E-mail | [EmailJS](https://emailjs.com) |
| Fonts | Google Fonts — DM Serif Display + DM Sans |

---

## Gebruikersrollen

| Rol | Wat kan de gebruiker? |
|---|---|
| **Admin** | Alle submissions van alle gebruikers, templatebeheer, gebruikersbeheer, vertaal-CSV, branding |
| **Technieker** | Enkel eigen submissions invullen, bekijken, exporteren |

Rollen worden beheerd via **Admin → Gebruikers**. De `is_admin` vlag staat in de `roles` tabel in Supabase.

Een gebruiker promoveren tot admin via SQL Editor:
```sql
update roles set is_admin = true
where user_id = (select id from auth.users where email = 'admin@biolectric.com');
```

Nieuwe gebruikers worden uitgenodigd via **Admin → Gebruikers → Gebruiker uitnodigen**. Ze ontvangen een magic link per e-mail en stellen hun wachtwoord in bij de eerste login.

---

## Setup

### 1. Supabase project

1. Ga naar [supabase.com](https://supabase.com) en maak een nieuw project aan
2. Open de **SQL Editor** en voer de volledige inhoud van `supabase_setup.sql` uit
3. Ga naar **Storage → New bucket**, naam: `checklist-photos`, zet op **Public**
4. Ga naar **Authentication → Users → Invite user** en maak een admin-account aan

### 2. App configureren

Open `config.js` en vul je Supabase-gegevens in:

```js
const SUPABASE_URL   = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON  = 'YOUR-ANON-PUBLIC-KEY';
const STORAGE_BUCKET = 'checklist-photos';
```

Credentials te vinden via **Supabase → Project Settings → API**.

### 3. EmailJS (optioneel — voor "Verstuur per mail")

1. Maak een account op [emailjs.com](https://emailjs.com)
2. Voeg een e-mailservice toe (Gmail, Outlook of SMTP)
3. Maak een e-mailtemplate aan (zie sectie *E-mail* hieronder)
4. Kopieer **Service ID**, **Template ID** en **Public Key** naar `config.js`

### 4. Deploy naar GitHub Pages

1. Push alle bestanden naar de `main` branch van je repository
2. Ga naar **Settings → Pages → Deploy from branch → main → / (root)**
3. De app is live op `https://YOUR-USERNAME.github.io/REPO-NAME/`

> ⚠️ Voeg `config.js` toe aan `.gitignore` als de repo publiek is — de file bevat API-sleutels.

---

## Supabase tabellen

| Tabel | Beschrijving |
|---|---|
| `templates` | Checklist templates met JSON schema |
| `submissions` | Ingevulde checklists + alle antwoorden als JSON |
| `photos` | Metadata van geüploade foto's (verwijst naar Storage) |
| `user_profiles` | Naam, organisatie, taalvoorkeur per gebruiker |
| `roles` | `is_admin` vlag per gebruiker (FK op `auth.users`) |

Belangrijke kolommen van `submissions`:

| Kolom | Type | Beschrijving |
|---|---|---|
| `id` | uuid | Primaire sleutel |
| `template_id` | uuid | FK naar `templates` |
| `template_name` | text | Naam op moment van invullen (snapshot) |
| `status` | text | `open` / `completed` / `archived` |
| `answers` | jsonb | Alle antwoorden geïndexeerd op `item.id` |
| `filled_by` | text | Naam invuller |
| `customer` | text | Klantnaam |
| `location` | text | Locatie |
| `reference` | text | Referentie / dossiernummer |
| `organisation` | text | Organisatie invuller |
| `notes` | text | Algemene opmerkingen |
| `lang` | text | Taal bij export (`nl`/`en`/`fr`/`de`) |
| `user_id` | uuid | FK naar `auth.users` |
| `created_at` | timestamptz | Aanmaakdatum |

---

## Vraagtypes

| Type | Beschrijving |
|---|---|
| `check` | Checkbox — aanvinken om te bevestigen |
| `yesno` | Drie opties: Ja / Nee / N.v.t. |
| `statuscheck` | Aanpasbare statusopties (standaard: OK / Niet OK / Onderdelen nodig / Niet gecheckt) |
| `radio` | Vrije meerkeuze (eigen opties instellen) |
| `text` | Vrij tekstveld |
| `number` | Numeriek invoerveld met optionele eenheid (kg, °C, mm…) |
| `date` | Datumpicker |
| `photo` | Foto uploaden (één of meerdere) |
| `signature` | Handtekening tekenen op scherm (muis of touch) |
| `checkgroup` | Groep van subitems, elk afzonderlijk aan te vinken |

---

## Conditionele logica

Elke vraag kan in de admin-editor worden ingesteld met:

- **"Toon alleen als"** — koppeling aan een eerdere vraag + triggerwaarde. De vraag blijft verborgen tot aan die voorwaarde is voldaan.
- **"Vervolg-veld bij"** — onthult een verduidelijkingsveld (+ optionele foto) bij een specifiek antwoord (bv. toon notitieveld als "Niet OK" gekozen wordt).

Conditionele vragen die verborgen waren, worden **niet** opgenomen in de PDF-export.

---

## Vertalingen (i18n)

Templates ondersteunen vier talen: **NL** (canonical), **EN**, **FR**, **DE**.

Werkwijze:
1. **Admin → CSV exporteren** — downloadt een spreadsheet met alle sjabloonteksten (sectistitels, vraaglabels, hints, opties, statuswaarden)
2. Vul de EN/FR/DE kolommen in — bv. in Excel of Google Sheets
3. **Admin → CSV importeren** — laadt de vertalingen terug in de templates

De NL-waarden blijven de canonical opgeslagen waarden voor antwoorden en condities. De vertaalde teksten worden alleen gebruikt voor weergave.

---

## Branding

Via **Instellingen** kan elke gebruiker (of admin) instellen:

- **Bedrijfsnaam** — verschijnt in de header naast het logo
- **Accentkleur** — past alle knoppen, pills en highlights aan (CSS custom properties)
- **Logo** — geüpload als afbeelding, overschrijft het standaard logo in de header
- **Favicon** — browsericon

Branding wordt opgeslagen in `localStorage` en direct toegepast op alle pagina's via `branding.js`.

---

## PDF export

De gegenereerde PDF bevat:

- Branded header met bedrijfslogo, documenttitel en datum
- Info-blok: ingevuld door, organisatie, klant, locatie, referentie
- Alle secties en antwoorden
- Status-pills, datumwaarden, foto's en handtekeningen inline
- Verborgen (conditionele) vragen worden **uitgesloten**
- Automatische bestandsnaam: `TemplateName_Klant_Referentie.pdf`

---

## E-mail (EmailJS)

Template-variabelen beschikbaar in je EmailJS-template:

| Variabele | Inhoud |
|---|---|
| `{{to_email}}` | Ontvanger |
| `{{cc_email}}` | CC (optioneel) |
| `{{subject}}` | Onderwerp |
| `{{doc_title}}` | Volledige documenttitel |
| `{{filled_by}}` | Naam invuller |
| `{{location}}` | Locatie |
| `{{date}}` | Datum |
| `{{message}}` | Optioneel bericht van verzender |
| `{{from_name}}` | Naam afzender |
| `{{pdf_base64}}` | PDF als base64-bijlage |
| `{{pdf_filename}}` | Bestandsnaam PDF |

---

## Repository structuur

```
├── index.html          # Homepage
├── fill.html           # Checklist invulpagina
├── history.html        # Ingevulde checklists
├── reports.html        # Rapportwizard
├── admin.html          # Templatebeheer (admin)
├── settings.html       # Instellingen
├── help.html           # In-app gebruikershandleiding
├── login.html          # Loginpagina
├── config.js           # Credentials — NIET committen als repo publiek is
├── auth.js             # Supabase auth wrapper
├── branding.js         # Gedeelde branding helper
├── branding.css        # (optioneel) extra branding stijlen
├── supabase_setup.sql  # Databaseschema + RLS-policies
└── README.md
```

---

## Beveiliging

- De adminpagina en alle data-endpoints zijn beveiligd via Supabase Auth
- **Row Level Security (RLS)** is actief op alle tabellen — techniekers zien enkel hun eigen submissions
- De `anon`-sleutel in `config.js` is veilig in de frontend — hij heeft enkel de rechten die in RLS zijn gedefinieerd
- `config.js` staat in `.gitignore` voor publieke repositories

---

## Licentie

Dit project is eigendom van **Biolectric**. Zie `LICENSE` voor details.

# Biolectric Commissioning Checklist App

A lightweight, mobile-friendly web application for creating, filling in, and exporting commissioning checklists as PDF. Built as a static site hosted on **GitHub Pages**, with **Supabase** as the backend.

---

## Features

- **Template builder** — create reusable checklist templates with sections and multiple question types
- **Multi-language** — full UI and question translations in 🇧🇪 NL / 🇬🇧 EN / 🇫🇷 FR / 🇩🇪 DE
- **Rich question types** — checkbox, yes/no, status check (OK/Not OK/Parts needed/Not checked), text, number, date, photo upload, and signature
- **Conditional logic** — show/hide questions based on the answer to a previous question
- **Follow-up fields** — automatically reveal a clarification field (+ optional photo) when a specific answer is chosen
- **Photo uploads** — attach photos per question, stored in Supabase Storage
- **Signature capture** — draw a signature directly on screen (mouse or touch)
- **PDF export** — branded PDF with company logo, header info, and all answers
- **Auto-save** — answers are saved to Supabase in real time
- **History** — browse, search, filter, and reopen all submitted checklists
- **Admin panel** — protected by login, manage all templates

---

## Pages

| File | Description |
|---|---|
| `index.html` | Homepage — template overview and recent submissions |
| `fill.html` | Fill in a checklist (`?template=ID` or `?submission=ID`) |
| `history.html` | All submitted checklists — search, filter, archive, delete |
| `admin.html` | Template builder — login required |
| `config.js` | Supabase connection settings |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Hosting | GitHub Pages (static, no server) |
| Database | Supabase (PostgreSQL + REST API) |
| Auth | Supabase Auth (email/password) |
| File storage | Supabase Storage |
| PDF generation | [jsPDF](https://github.com/parallax/jsPDF) |

---

## User Roles (Model B)

| Role | Access |
|---|---|
| **Admin** | All submissions from all users, template management, user invitations |
| **Technieker** | Only their own submissions |

Roles are set via Supabase user metadata (`role: 'admin'` or `role: 'technician'`).

To promote a user to admin, run in the Supabase SQL Editor:
```sql
update auth.users
  set raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'::jsonb
  where email = 'admin@biolectric.com';
```

New users are invited via **Admin → Gebruikers → Gebruiker uitnodigen**. They receive a magic link by email and can set their password on first login.

---

## Setup

### 1. Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** and run the full contents of `supabase_setup.sql`
3. Go to **Storage → New bucket**, name it `checklist-photos`, set it to **Public**
4. Go to **Authentication → Users → Invite user** and create an admin account

### 2. Configure the app

Open `config.js` and fill in your Supabase credentials:

```js
const SUPABASE_URL  = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON = 'YOUR-ANON-PUBLIC-KEY';
const STORAGE_BUCKET = 'checklist-photos';
```

Your credentials can be found in **Supabase → Project Settings → API**.

### 3. Deploy to GitHub Pages

1. Push all files to the `main` branch of your repository
2. Go to **Settings → Pages → Deploy from branch → main → / (root)**
3. Your app will be live at `https://YOUR-USERNAME.github.io/REPO-NAME/`

### 4. Existing database migration

If you already have a Supabase database from an earlier version, run the migration queries at the bottom of `supabase_setup.sql` to add any new columns.

---

## Question Types

| Type | Description |
|---|---|
| `check` | Simple checkbox — tick to confirm |
| `yesno` | Three-option pill: Yes / No / N/A |
| `statuscheck` | Four-option status: OK / Not OK / Parts needed / Not checked |
| `radio` | Custom multiple choice (comma-separated options) |
| `text` | Free text field |
| `number` | Numeric input with optional unit (kg, °C, mm…) |
| `date` | Date picker |
| `photo` | Photo upload (one or more images) |
| `signature` | On-screen signature capture |

---

## Conditional Logic

In the admin template builder, each question can have:

- **"Show only if"** — links to a previous question and a trigger value. The question is hidden until that condition is met.
- **"Follow-up field at"** — reveals a text clarification field (and optional photo) when a specific answer is chosen (e.g. show extra field when "Not OK" is selected).

---

## PDF Export

The exported PDF includes:

- Branded header with company logo, document title (`Template · Customer · Reference`), and date
- Info block: filled by, organisation, customer, location, reference
- All sections and answers, with checkboxes right-aligned for check-type questions
- Status pills, date values, photos, and signatures inline
- Conditional questions that were hidden are excluded from the PDF
- Auto-generated filename: `TemplateName_CustomerName_Reference.pdf`

---

## Repository Structure

```
├── index.html          # Homepage
├── fill.html           # Checklist fill-in page
├── history.html        # Submission history
├── admin.html          # Template builder (login required)
├── config.js           # Supabase credentials (not committed — see below)
├── supabase_setup.sql  # Database schema + RLS policies
├── assets/
│   └── logo.png        # Company logo
└── README.md
```

> ⚠️ **Never commit `config.js` with real credentials to a public repository.**  
> Add it to `.gitignore` and use environment variables or GitHub Secrets for production deployments.

---

## Security Notes

- The admin panel is protected by Supabase email/password authentication
- Row Level Security (RLS) is enabled on all tables — anonymous users can read and create submissions, but only authenticated users can modify templates
- The `anon` key in `config.js` is safe to expose in a frontend app — it only grants the permissions defined in your RLS policies
- For a production environment, consider restricting submission creation to authenticated users as well

---

## PDF per mail versturen

De app integreert met **EmailJS** om de gegenereerde PDF als bijlage te mailen zonder eigen server.

### Setup EmailJS

1. Maak een gratis account op [emailjs.com](https://emailjs.com)
2. Ga naar **Email Services** → voeg een service toe (Gmail, Outlook, of SMTP)
3. Ga naar **Email Templates** → maak een nieuw template aan

**Template variabelen** die beschikbaar zijn in je EmailJS template:

| Variabele | Inhoud |
|---|---|
| `{{to_email}}` | Ontvanger |
| `{{cc_email}}` | CC-adres (optioneel) |
| `{{subject}}` | Onderwerp (bv. `Checklist: WKK — Visser — IT049`) |
| `{{doc_title}}` | Volledige documenttitel |
| `{{filled_by}}` | Naam invuller |
| `{{location}}` | Locatie |
| `{{date}}` | Datum |
| `{{message}}` | Optioneel bericht van de verzender |
| `{{from_name}}` | Naam afzender |
| `{{pdf_base64}}` | PDF als base64 bijlage |
| `{{pdf_filename}}` | Bestandsnaam van de PDF |

**Voorbeeld template body:**
```
Beste,

Hierbij de ingevulde checklist {{doc_title}}.

Ingevuld door: {{filled_by}}
Locatie: {{location}}
Datum: {{date}}

{{message}}

Met vriendelijke groeten,
{{from_name}}
```

4. Kopieer je **Service ID**, **Template ID** en **Public Key** naar `config.js`

> ⚠️ `config.js` staat in `.gitignore` — push deze file nooit naar een publieke repo.

### Gebruik

In de invulpagina verschijnen twee knoppen naast "Download PDF":
- **Download PDF** — download lokaal
- **Verstuur per mail** — opent een modal met ontvanger, CC en bericht

---

## Template beheer

Templates kunnen worden **geactiveerd of gedeactiveerd** via de knop in de template-lijst. Inactieve templates verschijnen doorgestreept en zijn niet beschikbaar voor invullen vanuit de homepage.

## Statuscheck type

Het statuscheck vraagttype heeft standaard 4 opties: **OK / Niet OK / Onderdelen nodig / Niet gecheckt**. In de admin kunnen de benamingen worden aangepast. Per optie kan worden ingesteld of er een verduidelijkingsveld (+ optionele foto) verschijnt als die optie gekozen wordt.

## Auto-opslaan

Zowel de template-editor (admin) als de invulpagina slaan automatisch op elke **2 minuten** op. In de invulpagina wordt bovendien ook opgeslagen na elke wijziging (1,5 seconden debounce).

---

## License

This project is proprietary software owned by **Biolectric**. See `LICENSE` for details.

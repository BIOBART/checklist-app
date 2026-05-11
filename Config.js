// ============================================================
//  config.js — Pas deze twee waarden aan met jouw Supabase project
//  Te vinden in: Supabase Dashboard → Project Settings → API
// ============================================================

const SUPABASE_URL  = 'https://acjrrizcgwukkzpmalgr.supabase.co';
const SUPABASE_ANON = 'sb_publishable_BbyvJdfvaAfOHdbArbb6dg_keFWJS3w';

// Storage bucket naam (aanmaken in Supabase → Storage → New bucket)
const STORAGE_BUCKET = 'checklist-photos';

// App versie / naam
const APP_NAME = 'Checklist App';

// ============================================================
//  EmailJS — voor PDF versturen per mail
//  Maak een gratis account op https://emailjs.com
//  1. Voeg een Email Service toe (Gmail, Outlook, SMTP…)
//  2. Maak een Email Template aan (zie README voor variabelen)
//  3. Vul hieronder je credentials in
// ============================================================
const EMAILJS_SERVICE_ID  = 'service_m1d37q4';   // bv. 'service_abc123'
const EMAILJS_TEMPLATE_ID = 'template_uci4k3v';  // bv. 'template_xyz789'
const EMAILJS_PUBLIC_KEY  = 'f9FM3dgtiNe4KCdzW';   // bv. 'AbCdEfGhIjKlMnOp'

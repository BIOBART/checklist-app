-- migration_delete_account.sql
-- Voer dit eenmalig uit in Supabase → SQL Editor
-- Maakt de "Account verwijderen" functie beschikbaar in de admin pagina.
--
-- De functie verwijdert: photos, submissions, templates,
-- user_profiles, roles EN alle auth.users.
-- Vereist dat de aanroeper een admin-rol heeft (is_admin = true in roles tabel).

CREATE OR REPLACE FUNCTION public.delete_all_data_and_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Controleer of de aanroeper een admin is
  IF NOT EXISTS (
    SELECT 1 FROM roles WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Verwijder applicatiedata
  DELETE FROM photos;
  DELETE FROM submissions;
  DELETE FROM templates;
  DELETE FROM user_profiles;
  DELETE FROM roles;

  -- Verwijder alle auth-gebruikers (inclusief de aanroeper zelf)
  -- Dit maakt alle actieve sessies ongeldig
  DELETE FROM auth.users;
END;
$$;

-- Geef authenticated gebruikers toestemming om de functie aan te roepen
-- (de functie zelf controleert of de aanroeper admin is)
GRANT EXECUTE ON FUNCTION public.delete_all_data_and_users() TO authenticated;

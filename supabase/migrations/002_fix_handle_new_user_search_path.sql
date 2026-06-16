-- Fix: handle_new_user() failed with "Database error saving new user"
-- Cause: the trigger fires in a context where the search_path doesn't include
-- "public", so the unqualified "profiles" table reference couldn't be found.
-- Fix: schema-qualify the table name.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

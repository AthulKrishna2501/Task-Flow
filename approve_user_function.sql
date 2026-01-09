-- Create a function to confirm user email when admin approves them
-- This function needs to be run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION approve_user_and_confirm_email(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Update the profile to set is_approved = true
  UPDATE public.profiles
  SET is_approved = true
  WHERE id = target_user_id;

  -- Confirm the email in auth.users
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = target_user_id;

  -- Return success
  result := json_build_object(
    'success', true,
    'user_id', target_user_id
  );

  RETURN result;
END;
$$;

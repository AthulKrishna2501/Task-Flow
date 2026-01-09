-- Run this in Supabase SQL Editor to manually confirm a user's email
-- Replace 'user@example.com' with the actual email address

UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';

-- Verify the update
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'user@example.com';

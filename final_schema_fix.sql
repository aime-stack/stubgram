-- Force fix for meetings type constraint
-- logic: drop the old one, add a permissive one
BEGIN;

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_type_check;

ALTER TABLE public.meetings
    ADD CONSTRAINT meetings_type_check 
    CHECK (type IN ('1-on-1', 'group', 'public', 'private', 'scheduled', 'broadcast', 'audio_space'));

COMMIT;

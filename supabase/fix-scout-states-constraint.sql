-- Fix scout_states table to handle upserts properly
ALTER TABLE scout_states DROP CONSTRAINT IF EXISTS scout_states_user_id_key;
ALTER TABLE scout_states ADD CONSTRAINT scout_states_user_id_key UNIQUE (user_id);

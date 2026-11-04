-- Who decides the people on a task: whoever creates it, or the team lead later.
-- Existing teams keep today's behaviour ('creator'), so nothing changes on live
-- until a team is switched over from Workspace admin.
ALTER TABLE teams
  ADD COLUMN assign_mode ENUM('creator', 'lead') NOT NULL DEFAULT 'creator' AFTER lead_id;

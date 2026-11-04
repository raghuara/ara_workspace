ALTER TABLE team_members
  ADD COLUMN role ENUM('worker', 'supervisor') NOT NULL DEFAULT 'worker' AFTER employee_id;

UPDATE team_members tm
JOIN teams t ON t.id = tm.team_id
SET tm.role = 'supervisor'
WHERE t.lead_id = tm.employee_id;

-- Who hands the work out when a team creates tasks unassigned. Not always the
-- team lead — it can be an executive or anyone else in the workspace. NULL
-- means nobody is named yet, and the lead is shown instead.
ALTER TABLE teams
  ADD COLUMN assigner_id VARCHAR(20) NULL AFTER assign_mode,
  ADD CONSTRAINT fk_teams_assigner FOREIGN KEY (assigner_id) REFERENCES employees(employee_id) ON DELETE SET NULL;

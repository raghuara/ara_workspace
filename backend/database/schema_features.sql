CREATE TABLE features (
  feature_key VARCHAR(40) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO features (feature_key, enabled) VALUES
  ('workspaces', TRUE),
  ('view.board', TRUE),
  ('view.list', TRUE),
  ('view.table', TRUE),
  ('task.weightage', TRUE),
  ('task.automations', TRUE),
  ('clients', TRUE),
  ('employees', TRUE),
  ('reports', TRUE),
  ('activity', TRUE),
  ('performance', TRUE),
  ('recruitment', FALSE),
  ('compensation', FALSE);

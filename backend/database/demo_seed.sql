-- Demo Studio: 30 people, 2 groups, 4 teams, 8 clients, 1,050 tasks over the last 14 days.
-- Local testing only. Remove everything with demo_cleanup.sql.
-- Every demo login uses the password  Demo@1234

START TRANSACTION;

INSERT INTO employees
  (employee_id, first_name, last_name, email, phone, department, designation, joining_date, status, employment_type, work_location)
VALUES
  ('EMP-D001', 'Arun', 'Kumar', 'arun.kumar@demo.ara.test', '+94 77 100 0001', 'Management', 'Studio Manager', '2023-01-09', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D002', 'Priya', 'Nair', 'priya.nair@demo.ara.test', '+94 77 100 0002', 'Video Production', 'Production Head', '2023-02-13', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D003', 'Visva', 'Raj', 'visva.raj@demo.ara.test', '+94 77 100 0003', 'Video Production', 'Team Lead', '2023-03-06', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D004', 'Ghuan', 'Lee', 'ghuan.lee@demo.ara.test', '+94 77 100 0004', 'Video Production', 'Video Editor', '2023-06-12', 'Active', 'Full-time', 'Hybrid'),
  ('EMP-D005', 'Santhosh', 'Kumar', 'santhosh.kumar@demo.ara.test', '+94 77 100 0005', 'Video Production', 'Video Editor', '2023-08-21', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D006', 'Karan', 'Mehta', 'karan.mehta@demo.ara.test', '+94 77 100 0006', 'Video Production', 'Video Editor', '2024-01-15', 'Active', 'Full-time', 'Remote'),
  ('EMP-D007', 'Divya', 'Shankar', 'divya.shankar@demo.ara.test', '+94 77 100 0007', 'Video Production', 'Video Editor', '2024-03-04', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D008', 'Rahul', 'Verma', 'rahul.verma@demo.ara.test', '+94 77 100 0008', 'Video Production', 'Video Editor', '2024-05-20', 'Probation', 'Full-time', 'Hybrid'),
  ('EMP-D009', 'Meena', 'Perera', 'meena.perera@demo.ara.test', '+94 77 100 0009', 'Video Production', 'Video Editor', '2024-07-01', 'Active', 'Full-time', 'Kandy Office'),
  ('EMP-D010', 'Farhan', 'Ali', 'farhan.ali@demo.ara.test', '+94 77 100 0010', 'Video Production', 'Video Editor', '2025-02-10', 'Active', 'Contract', 'Remote'),
  ('EMP-D011', 'Kavya', 'Iyer', 'kavya.iyer@demo.ara.test', '+94 77 100 0011', 'Video Production', 'Team Lead', '2023-04-17', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D012', 'Nikhil', 'Das', 'nikhil.das@demo.ara.test', '+94 77 100 0012', 'Video Production', 'Motion Designer', '2023-09-11', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D013', 'Anjali', 'Fernando', 'anjali.fernando@demo.ara.test', '+94 77 100 0013', 'Video Production', 'Motion Designer', '2024-02-05', 'Active', 'Full-time', 'Hybrid'),
  ('EMP-D014', 'Rohan', 'Silva', 'rohan.silva@demo.ara.test', '+94 77 100 0014', 'Video Production', 'Motion Designer', '2024-09-16', 'Active', 'Full-time', 'Kandy Office'),
  ('EMP-D015', 'Sneha', 'Pillai', 'sneha.pillai@demo.ara.test', '+94 77 100 0015', 'Video Production', 'Motion Designer', '2025-04-07', 'Probation', 'Intern', 'Colombo HQ'),
  ('EMP-D016', 'Deepak', 'Menon', 'deepak.menon@demo.ara.test', '+94 77 100 0016', 'Design', 'Design Head', '2023-01-23', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D017', 'Lakshmi', 'Rao', 'lakshmi.rao@demo.ara.test', '+94 77 100 0017', 'Design', 'Team Lead', '2023-05-08', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D018', 'Arjun', 'Reddy', 'arjun.reddy@demo.ara.test', '+94 77 100 0018', 'Design', 'Graphic Designer', '2023-07-17', 'Active', 'Full-time', 'Hybrid'),
  ('EMP-D019', 'Nisha', 'Gupta', 'nisha.gupta@demo.ara.test', '+94 77 100 0019', 'Design', 'Graphic Designer', '2023-10-02', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D020', 'Vikram', 'Joshi', 'vikram.joshi@demo.ara.test', '+94 77 100 0020', 'Design', 'Graphic Designer', '2024-01-29', 'Active', 'Full-time', 'Remote'),
  ('EMP-D021', 'Pooja', 'Jayasinghe', 'pooja.jayasinghe@demo.ara.test', '+94 77 100 0021', 'Design', 'Graphic Designer', '2024-04-22', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D022', 'Sanjay', 'Bose', 'sanjay.bose@demo.ara.test', '+94 77 100 0022', 'Design', 'Graphic Designer', '2024-08-12', 'Notice Period', 'Full-time', 'Hybrid'),
  ('EMP-D023', 'Tharushi', 'Wickrama', 'tharushi.wickrama@demo.ara.test', '+94 77 100 0023', 'Design', 'Graphic Designer', '2025-01-06', 'Active', 'Part-time', 'Kandy Office'),
  ('EMP-D024', 'Imran', 'Khan', 'imran.khan@demo.ara.test', '+94 77 100 0024', 'Marketing', 'Team Lead', '2023-06-05', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D025', 'Aisha', 'Fathima', 'aisha.fathima@demo.ara.test', '+94 77 100 0025', 'Marketing', 'Content Creator', '2023-11-13', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D026', 'Manoj', 'Kumar', 'manoj.kumar@demo.ara.test', '+94 77 100 0026', 'Marketing', 'Content Creator', '2024-03-18', 'Active', 'Full-time', 'Remote'),
  ('EMP-D027', 'Ruwan', 'Bandara', 'ruwan.bandara@demo.ara.test', '+94 77 100 0027', 'Marketing', 'Social Media Executive', '2024-06-24', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D028', 'Shreya', 'Das', 'shreya.das@demo.ara.test', '+94 77 100 0028', 'Marketing', 'Content Creator', '2025-03-03', 'Probation', 'Full-time', 'Hybrid'),
  ('EMP-D029', 'Gokul', 'Ramesh', 'gokul.ramesh@demo.ara.test', '+94 77 100 0029', 'Video Production', 'Video Editor', '2025-06-02', 'Active', 'Full-time', 'Colombo HQ'),
  ('EMP-D030', 'Hema', 'Latha', 'hema.latha@demo.ara.test', '+94 77 100 0030', 'Design', 'Graphic Designer', '2025-06-16', 'Active', 'Full-time', 'Colombo HQ');

INSERT INTO workspaces (id, name, short_name, description, tone, fiscal_year_start_month, owner_id)
VALUES ('WS-DEMO', 'Demo Studio', 'DEMO', 'Test data — video, motion, design and social teams.', 'teal', 4, 'EMP-D001');

UPDATE employees SET workspace_id = 'WS-DEMO' WHERE employee_id LIKE 'EMP-D%';

INSERT IGNORE INTO departments (workspace_id, name) VALUES
  ('WS-DEMO', 'Management'), ('WS-DEMO', 'Video Production'), ('WS-DEMO', 'Design'), ('WS-DEMO', 'Marketing');

INSERT IGNORE INTO designations (workspace_id, name) VALUES
  ('WS-DEMO', 'Studio Manager'), ('WS-DEMO', 'Production Head'), ('WS-DEMO', 'Design Head'), ('WS-DEMO', 'Team Lead'),
  ('WS-DEMO', 'Video Editor'), ('WS-DEMO', 'Motion Designer'), ('WS-DEMO', 'Graphic Designer'),
  ('WS-DEMO', 'Content Creator'), ('WS-DEMO', 'Social Media Executive');

INSERT INTO users (employee_id, email, password_hash, user_type_id, is_active, must_change_password)
SELECT
  employee_id,
  email,
  '$2b$10$QejKAAykv4.3hn7Bwr.oh.UJK4iEzzmDWVX1SvZhcyJ5xt5N8RnUK',
  CASE
    WHEN employee_id = 'EMP-D001' THEN 2
    WHEN employee_id IN ('EMP-D002', 'EMP-D003', 'EMP-D011', 'EMP-D016', 'EMP-D017', 'EMP-D024') THEN 4
    ELSE 3
  END,
  TRUE,
  FALSE
FROM employees
WHERE employee_id LIKE 'EMP-D%';

INSERT INTO workspace_admins (workspace_id, employee_id) VALUES ('WS-DEMO', 'EMP-D001');

INSERT INTO status_columns (id, workspace_id, name, kind, tone, sort_order, wip_limit, is_default) VALUES
  ('COL-DEMO1', 'WS-DEMO', 'To Do', 'todo', 'slate', 0, NULL, TRUE),
  ('COL-DEMO2', 'WS-DEMO', 'Processing', 'processing', 'blue', 1, NULL, TRUE),
  ('COL-DEMO3', 'WS-DEMO', 'Review', 'review', 'amber', 2, NULL, TRUE),
  ('COL-DEMO4', 'WS-DEMO', 'Correction', 'correction', 'rose', 3, NULL, TRUE),
  ('COL-DEMO5', 'WS-DEMO', 'Completed', 'completed', 'green', 4, NULL, TRUE);

INSERT INTO workspace_groups (id, workspace_id, name, tone, lead_id) VALUES
  ('GRP-DEMO1', 'WS-DEMO', 'Video Production', 'blue', 'EMP-D002'),
  ('GRP-DEMO2', 'WS-DEMO', 'Design & Social', 'violet', 'EMP-D016');

INSERT INTO teams (id, group_id, name, lead_id) VALUES
  ('TEAM-DEMO1', 'GRP-DEMO1', 'Video Editing', 'EMP-D003'),
  ('TEAM-DEMO2', 'GRP-DEMO1', 'Motion Graphics', 'EMP-D011'),
  ('TEAM-DEMO3', 'GRP-DEMO2', 'Graphic Design', 'EMP-D017'),
  ('TEAM-DEMO4', 'GRP-DEMO2', 'Social Media', 'EMP-D024');

INSERT INTO team_members (team_id, employee_id, role) VALUES
  ('TEAM-DEMO1', 'EMP-D003', 'supervisor'),
  ('TEAM-DEMO1', 'EMP-D004', 'worker'), ('TEAM-DEMO1', 'EMP-D005', 'worker'), ('TEAM-DEMO1', 'EMP-D006', 'worker'),
  ('TEAM-DEMO1', 'EMP-D007', 'worker'), ('TEAM-DEMO1', 'EMP-D008', 'worker'), ('TEAM-DEMO1', 'EMP-D009', 'worker'),
  ('TEAM-DEMO1', 'EMP-D010', 'worker'),
  ('TEAM-DEMO2', 'EMP-D011', 'supervisor'),
  ('TEAM-DEMO2', 'EMP-D012', 'worker'), ('TEAM-DEMO2', 'EMP-D013', 'worker'), ('TEAM-DEMO2', 'EMP-D014', 'worker'),
  ('TEAM-DEMO2', 'EMP-D015', 'worker'),
  ('TEAM-DEMO3', 'EMP-D017', 'supervisor'),
  ('TEAM-DEMO3', 'EMP-D018', 'worker'), ('TEAM-DEMO3', 'EMP-D019', 'worker'), ('TEAM-DEMO3', 'EMP-D020', 'worker'),
  ('TEAM-DEMO3', 'EMP-D021', 'worker'), ('TEAM-DEMO3', 'EMP-D022', 'worker'), ('TEAM-DEMO3', 'EMP-D023', 'worker'),
  ('TEAM-DEMO4', 'EMP-D024', 'supervisor'),
  ('TEAM-DEMO4', 'EMP-D025', 'worker'), ('TEAM-DEMO4', 'EMP-D026', 'worker'), ('TEAM-DEMO4', 'EMP-D027', 'worker'),
  ('TEAM-DEMO4', 'EMP-D028', 'worker'),
  ('TEAM-DEMO1', 'EMP-D002', 'supervisor'),
  ('TEAM-DEMO2', 'EMP-D002', 'supervisor'),
  ('TEAM-DEMO3', 'EMP-D016', 'supervisor'),
  ('TEAM-DEMO4', 'EMP-D016', 'supervisor'),
  ('TEAM-DEMO1', 'EMP-D001', 'supervisor'),
  ('TEAM-DEMO2', 'EMP-D001', 'supervisor'),
  ('TEAM-DEMO3', 'EMP-D001', 'supervisor'),
  ('TEAM-DEMO4', 'EMP-D001', 'supervisor');

INSERT INTO workspace_members (workspace_id, employee_id, user_type_id, group_id, team_id) VALUES
  ('WS-DEMO', 'EMP-D001', 2, NULL, NULL),
  ('WS-DEMO', 'EMP-D002', 4, 'GRP-DEMO1', NULL),
  ('WS-DEMO', 'EMP-D016', 4, 'GRP-DEMO2', NULL),
  ('WS-DEMO', 'EMP-D003', 4, 'GRP-DEMO1', 'TEAM-DEMO1'),
  ('WS-DEMO', 'EMP-D011', 4, 'GRP-DEMO1', 'TEAM-DEMO2'),
  ('WS-DEMO', 'EMP-D017', 4, 'GRP-DEMO2', 'TEAM-DEMO3'),
  ('WS-DEMO', 'EMP-D024', 4, 'GRP-DEMO2', 'TEAM-DEMO4'),
  ('WS-DEMO', 'EMP-D029', 3, NULL, NULL),
  ('WS-DEMO', 'EMP-D030', 3, NULL, NULL);

INSERT INTO workspace_members (workspace_id, employee_id, user_type_id, group_id, team_id)
SELECT 'WS-DEMO', tm.employee_id, 3, t.group_id, tm.team_id
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.team_id LIKE 'TEAM-DEMO%' AND tm.role = 'worker';

INSERT INTO workspace_access (workspace_id, employee_id, scope_type, scope_id, level) VALUES
  ('WS-DEMO', 'EMP-D002', 'group', 'GRP-DEMO1', 'edit'),
  ('WS-DEMO', 'EMP-D016', 'group', 'GRP-DEMO2', 'edit');

INSERT INTO workspace_access (workspace_id, employee_id, scope_type, scope_id, level)
SELECT 'WS-DEMO', employee_id, 'team', team_id, 'edit'
FROM team_members
WHERE team_id LIKE 'TEAM-DEMO%';

INSERT INTO clients (id, workspace_id, name, company, tone, contact_name, email, phone, status) VALUES
  ('CLI-DEMO1', 'WS-DEMO', 'Spice Route', 'Spice Route Restaurants', 'orange', 'Ravi Shan', 'ravi@spiceroute.test', '+94 11 200 0001', 'Active'),
  ('CLI-DEMO2', 'WS-DEMO', 'Lanka Motors', 'Lanka Motors PLC', 'blue', 'Nimal Perera', 'nimal@lankamotors.test', '+94 11 200 0002', 'Active'),
  ('CLI-DEMO3', 'WS-DEMO', 'Bloom Skincare', 'Bloom Beauty Pvt Ltd', 'pink', 'Sara Ahmed', 'sara@bloom.test', '+94 11 200 0003', 'Active'),
  ('CLI-DEMO4', 'WS-DEMO', 'Peak Fitness', 'Peak Fitness Studios', 'green', 'Dinesh Raj', 'dinesh@peakfit.test', '+94 11 200 0004', 'Active'),
  ('CLI-DEMO5', 'WS-DEMO', 'Ocean Breeze', 'Ocean Breeze Resorts', 'teal', 'Amaya Silva', 'amaya@oceanbreeze.test', '+94 11 200 0005', 'Active'),
  ('CLI-DEMO6', 'WS-DEMO', 'TechNova', 'TechNova Labs', 'violet', 'Kevin Paul', 'kevin@technova.test', '+94 11 200 0006', 'Active'),
  ('CLI-DEMO7', 'WS-DEMO', 'Green Leaf', 'Green Leaf Organics', 'green', 'Fathima Rizvi', 'fathima@greenleaf.test', '+94 11 200 0007', 'Active'),
  ('CLI-DEMO8', 'WS-DEMO', 'Urban Threads', 'Urban Threads Clothing', 'slate', 'Jason Mendis', 'jason@urbanthreads.test', '+94 11 200 0008', 'On hold');

CREATE TEMPORARY TABLE demo_workers (
  idx INT PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  group_id VARCHAR(20) NOT NULL,
  lead_id VARCHAR(20) NOT NULL,
  kind VARCHAR(10) NOT NULL
);

INSERT INTO demo_workers (idx, employee_id, team_id, group_id, lead_id, kind) VALUES
  (1, 'EMP-D003', 'TEAM-DEMO1', 'GRP-DEMO1', 'EMP-D002', 'video'),
  (2, 'EMP-D004', 'TEAM-DEMO1', 'GRP-DEMO1', 'EMP-D003', 'video'),
  (3, 'EMP-D005', 'TEAM-DEMO1', 'GRP-DEMO1', 'EMP-D003', 'video'),
  (4, 'EMP-D006', 'TEAM-DEMO1', 'GRP-DEMO1', 'EMP-D003', 'video'),
  (5, 'EMP-D007', 'TEAM-DEMO1', 'GRP-DEMO1', 'EMP-D003', 'video'),
  (6, 'EMP-D008', 'TEAM-DEMO1', 'GRP-DEMO1', 'EMP-D003', 'video'),
  (7, 'EMP-D009', 'TEAM-DEMO1', 'GRP-DEMO1', 'EMP-D003', 'video'),
  (8, 'EMP-D010', 'TEAM-DEMO1', 'GRP-DEMO1', 'EMP-D003', 'video'),
  (9, 'EMP-D011', 'TEAM-DEMO2', 'GRP-DEMO1', 'EMP-D002', 'motion'),
  (10, 'EMP-D012', 'TEAM-DEMO2', 'GRP-DEMO1', 'EMP-D011', 'motion'),
  (11, 'EMP-D013', 'TEAM-DEMO2', 'GRP-DEMO1', 'EMP-D011', 'motion'),
  (12, 'EMP-D014', 'TEAM-DEMO2', 'GRP-DEMO1', 'EMP-D011', 'motion'),
  (13, 'EMP-D015', 'TEAM-DEMO2', 'GRP-DEMO1', 'EMP-D011', 'motion'),
  (14, 'EMP-D017', 'TEAM-DEMO3', 'GRP-DEMO2', 'EMP-D016', 'design'),
  (15, 'EMP-D018', 'TEAM-DEMO3', 'GRP-DEMO2', 'EMP-D017', 'design'),
  (16, 'EMP-D019', 'TEAM-DEMO3', 'GRP-DEMO2', 'EMP-D017', 'design'),
  (17, 'EMP-D020', 'TEAM-DEMO3', 'GRP-DEMO2', 'EMP-D017', 'design'),
  (18, 'EMP-D021', 'TEAM-DEMO3', 'GRP-DEMO2', 'EMP-D017', 'design'),
  (19, 'EMP-D022', 'TEAM-DEMO3', 'GRP-DEMO2', 'EMP-D017', 'design'),
  (20, 'EMP-D023', 'TEAM-DEMO3', 'GRP-DEMO2', 'EMP-D017', 'design'),
  (21, 'EMP-D024', 'TEAM-DEMO4', 'GRP-DEMO2', 'EMP-D016', 'social'),
  (22, 'EMP-D025', 'TEAM-DEMO4', 'GRP-DEMO2', 'EMP-D024', 'social'),
  (23, 'EMP-D026', 'TEAM-DEMO4', 'GRP-DEMO2', 'EMP-D024', 'social'),
  (24, 'EMP-D027', 'TEAM-DEMO4', 'GRP-DEMO2', 'EMP-D024', 'social'),
  (25, 'EMP-D028', 'TEAM-DEMO4', 'GRP-DEMO2', 'EMP-D024', 'social');

INSERT INTO client_assignees (client_id, employee_id, is_primary, assigned_at)
SELECT
  CONCAT('CLI-DEMO', c.no),
  w.employee_id,
  MOD(w.idx + c.no, 6) = 0,
  NOW() - INTERVAL (20 + MOD(w.idx * c.no, 30)) DAY
FROM demo_workers w
JOIN (
  SELECT 1 AS no UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
) c ON MOD(w.idx + c.no, 3) = 0;

INSERT IGNORE INTO client_assignees (client_id, employee_id, is_primary, assigned_at)
SELECT CONCAT('CLI-DEMO', c.no), t.lead_id, TRUE, NOW() - INTERVAL 60 DAY
FROM teams t
JOIN (SELECT 1 AS no UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) c
WHERE t.id LIKE 'TEAM-DEMO%';

CREATE TEMPORARY TABLE demo_numbers (n INT PRIMARY KEY);

INSERT INTO demo_numbers (n)
SELECT a.d + b.d * 10 + c.d * 100 + e.d * 1000 + 1
FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c
CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1) e
WHERE a.d + b.d * 10 + c.d * 100 + e.d * 1000 + 1 <= 1050;

CREATE TEMPORARY TABLE demo_plan AS
SELECT
  z.*,
  CASE z.status_key
    WHEN 'completed' THEN LEAST(z.arrival + INTERVAL MOD(z.n, 3) DAY, CURDATE())
    ELSE LEAST(z.arrival + INTERVAL MOD(z.n, 2) DAY, CURDATE())
  END AS step_day,
  CASE WHEN z.status_key = 'completed' THEN LEAST(z.arrival + INTERVAL MOD(z.n, 3) DAY, CURDATE()) END AS completed_on,
  (z.status_key = 'correction' OR (z.status_key = 'completed' AND MOD(z.n, 5) = 0)) AS had_correction
FROM (
  SELECT
    y.*,
    CASE
      WHEN y.r < y.cut THEN 'completed'
      WHEN y.r < y.cut + 2 THEN 'review'
      WHEN y.r < y.cut + 3 THEN 'correction'
      WHEN y.r < y.cut + 5 THEN 'processing'
      ELSE 'todo'
    END AS status_key
  FROM (
    SELECT
      x.n,
      CONCAT('TSK-DM', LPAD(x.n, 4, '0')) AS task_id,
      w.idx, w.employee_id, w.team_id, w.group_id, w.lead_id, w.kind,
      x.d,
      MOD(x.n * 7 + x.d * 3, 20) AS r,
      CASE x.d WHEN 0 THEN 6 WHEN 1 THEN 10 ELSE 14 END AS cut,
      CURDATE() - INTERVAL x.d DAY AS arrival,
      MOD(x.n * 3 + w.idx, 8) + 1 AS client_no,
      CONCAT(
        CASE w.kind
          WHEN 'video' THEN ELT(MOD(x.n, 6) + 1, 'Reel edit', 'YouTube long-form edit', 'Podcast cut-down', 'Product demo video', 'Testimonial edit', 'Event highlight reel')
          WHEN 'motion' THEN ELT(MOD(x.n, 6) + 1, 'Logo animation', 'Explainer scene', 'Lower-thirds pack', 'Intro bumper', 'Kinetic typography', 'Transition pack')
          WHEN 'design' THEN ELT(MOD(x.n, 6) + 1, 'Instagram carousel', 'Thumbnail set', 'Brand poster', 'Banner ads set', 'Brochure layout', 'Menu card redesign')
          ELSE ELT(MOD(x.n, 6) + 1, 'Weekly content calendar', 'Caption pack', 'Story set', 'Campaign copy', 'Hashtag research', 'Community replies')
        END,
        ' - ',
        ELT(MOD(x.n * 3 + w.idx, 8) + 1, 'Spice Route', 'Lanka Motors', 'Bloom Skincare', 'Peak Fitness', 'Ocean Breeze', 'TechNova', 'Green Leaf', 'Urban Threads'),
        ' #', x.n
      ) AS title,
      ELT(MOD(x.n, 7) + 1, 'Urgent', 'High', 'Normal', 'Normal', 'High', 'Normal', 'Low') AS priority,
      ELT(MOD(x.n, 5) + 1, 'XS', 'S', 'M', 'L', 'M') AS size_key,
      CAST(ELT(MOD(x.n, 5) + 1, '1', '2', '5', '8', '5') AS UNSIGNED) AS points,
      MOD(x.n, 3) + 1 AS due_after
    FROM (SELECT n, MOD(FLOOR((n - 1) / 25), 14) AS d FROM demo_numbers) x
    JOIN demo_workers w ON w.idx = MOD(x.n - 1, 25) + 1
  ) y
) z;

INSERT INTO tasks
  (id, workspace_id, group_id, team_id, client_id, status_id, title, description, priority, size_key, points,
   tags, created_by_id, created_at, due_date, completed_at, completed_by_id)
SELECT
  task_id,
  'WS-DEMO',
  group_id,
  team_id,
  CONCAT('CLI-DEMO', client_no),
  ELT(FIELD(status_key, 'todo', 'processing', 'review', 'correction', 'completed'),
      'COL-DEMO1', 'COL-DEMO2', 'COL-DEMO3', 'COL-DEMO4', 'COL-DEMO5'),
  title,
  CONCAT('Demo task for ', title, '. Follow the brand guide and share a draft for review.'),
  priority,
  size_key,
  points,
  NULL,
  lead_id,
  arrival,
  arrival + INTERVAL due_after DAY,
  completed_on,
  CASE WHEN status_key = 'completed' THEN employee_id END
FROM demo_plan;

INSERT INTO task_assignees (task_id, employee_id)
SELECT task_id, employee_id FROM demo_plan;

INSERT INTO task_history (task_id, task_title, workspace_id, actor_id, action, summary, detail, at)
SELECT task_id, title, 'WS-DEMO', lead_id, 'created', 'created this task', NULL, TIMESTAMP(arrival, '09:30:00')
FROM demo_plan;

INSERT INTO task_history (task_id, task_title, workspace_id, actor_id, action, summary, detail, at)
SELECT task_id, title, 'WS-DEMO', employee_id, 'moved', 'moved this task',
       JSON_OBJECT('from', 'To Do', 'to', 'Processing'), TIMESTAMP(arrival, '10:30:00')
FROM demo_plan
WHERE status_key IN ('processing', 'review', 'correction', 'completed');

INSERT INTO task_history (task_id, task_title, workspace_id, actor_id, action, summary, detail, at)
SELECT task_id, title, 'WS-DEMO', employee_id, 'moved', 'moved this task',
       JSON_OBJECT('from', 'Processing', 'to', 'Review'), TIMESTAMP(step_day, '13:00:00')
FROM demo_plan
WHERE status_key IN ('review', 'correction', 'completed');

INSERT INTO task_history (task_id, task_title, workspace_id, actor_id, action, summary, detail, at)
SELECT task_id, title, 'WS-DEMO', lead_id, 'moved', 'moved this task',
       JSON_OBJECT('from', 'Review', 'to', 'Correction'), TIMESTAMP(step_day, '14:00:00')
FROM demo_plan
WHERE had_correction;

INSERT INTO task_history (task_id, task_title, workspace_id, actor_id, action, summary, detail, at)
SELECT task_id, title, 'WS-DEMO', lead_id, 'completed', 'marked this complete',
       JSON_OBJECT('from', IF(had_correction, 'Correction', 'Review'), 'to', 'Completed'), TIMESTAMP(step_day, '17:00:00')
FROM demo_plan
WHERE status_key = 'completed';

INSERT INTO client_tickets
  (id, workspace_id, client_id, kind, title, description, status, priority, collected_on, due_date,
   raised_by_id, owner_id, reopen_count, resolved_at, closed_at, created_at)
VALUES
  ('TKT-DEMO01', 'WS-DEMO', 'CLI-DEMO1', 'Complaint', 'Logo looks stretched on the menu reel', 'Client noticed the logo ratio is off in the last reel.', 'In progress', 'High', CURDATE(), CURDATE() + INTERVAL 1 DAY, 'EMP-D001', 'EMP-D004', 0, NULL, NULL, TIMESTAMP(CURDATE(), '10:15:00')),
  ('TKT-DEMO02', 'WS-DEMO', 'CLI-DEMO2', 'Complaint', 'Wrong car model shown in the ad', 'Ad shows the 2023 model instead of 2025.', 'New', 'Urgent', CURDATE(), CURDATE(), 'EMP-D001', 'EMP-D005', 0, NULL, NULL, TIMESTAMP(CURDATE(), '11:40:00')),
  ('TKT-DEMO03', 'WS-DEMO', 'CLI-DEMO3', 'Complaint', 'Colours too dark on the carousel', 'Brand pink is rendering too dark.', 'With client', 'Normal', CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 2 DAY, 'EMP-D016', 'EMP-D018', 0, NOW() - INTERVAL 2 HOUR, NULL, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '09:50:00')),
  ('TKT-DEMO04', 'WS-DEMO', 'CLI-DEMO4', 'Complaint', 'Music licence issue on the gym promo', 'Track was flagged on Instagram.', 'Reopened', 'High', CURDATE() - INTERVAL 2 DAY, CURDATE(), 'EMP-D002', 'EMP-D006', 1, NULL, NULL, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '14:20:00')),
  ('TKT-DEMO05', 'WS-DEMO', 'CLI-DEMO5', 'Requirement', 'Resort walkthrough video - 60s cut', 'Need a 60 second version for ads.', 'Completed', 'Normal', CURDATE() - INTERVAL 3 DAY, CURDATE() - INTERVAL 1 DAY, 'EMP-D002', 'EMP-D007', 0, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '15:00:00'), TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '16:30:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '10:00:00')),
  ('TKT-DEMO06', 'WS-DEMO', 'CLI-DEMO6', 'Requirement', 'Launch event poster set', 'Three poster sizes for the launch.', 'Completed', 'High', CURDATE() - INTERVAL 2 DAY, CURDATE(), 'EMP-D016', 'EMP-D019', 0, TIMESTAMP(CURDATE(), '11:00:00'), TIMESTAMP(CURDATE(), '12:15:00'), TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '09:30:00')),
  ('TKT-DEMO07', 'WS-DEMO', 'CLI-DEMO7', 'Requirement', 'Weekly social calendar for November', 'Plan 12 posts with captions.', 'Completed', 'Normal', CURDATE() - INTERVAL 4 DAY, CURDATE() - INTERVAL 2 DAY, 'EMP-D024', 'EMP-D025', 0, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '14:00:00'), TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '17:45:00'), TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '11:10:00')),
  ('TKT-DEMO08', 'WS-DEMO', 'CLI-DEMO1', 'Requirement', 'New dish photo edits', 'Retouch 15 dish photos.', 'Completed', 'Low', CURDATE() - INTERVAL 1 DAY, CURDATE(), 'EMP-D017', 'EMP-D021', 0, TIMESTAMP(CURDATE(), '10:00:00'), TIMESTAMP(CURDATE(), '13:30:00'), TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '16:00:00')),
  ('TKT-DEMO09', 'WS-DEMO', 'CLI-DEMO2', 'Change', 'Swap voice-over in showroom video', 'Client wants a different VO artist.', 'In progress', 'Normal', CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 3 DAY, 'EMP-D002', 'EMP-D008', 0, NULL, NULL, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '12:30:00')),
  ('TKT-DEMO10', 'WS-DEMO', 'CLI-DEMO6', 'Complaint', 'Explainer subtitles out of sync', 'Subtitles drift after 0:45.', 'Completed', 'High', CURDATE() - INTERVAL 3 DAY, CURDATE() - INTERVAL 2 DAY, 'EMP-D011', 'EMP-D012', 0, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '11:00:00'), TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '12:00:00'), TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '15:30:00'));

INSERT INTO client_ticket_events (ticket_id, workspace_id, actor_id, action, summary, detail, at)
SELECT id, workspace_id, raised_by_id, 'created', 'raised this ticket', NULL, created_at
FROM client_tickets
WHERE workspace_id = 'WS-DEMO';

DROP TEMPORARY TABLE demo_plan;
DROP TEMPORARY TABLE demo_numbers;
DROP TEMPORARY TABLE demo_workers;

COMMIT;

SELECT 'employees' AS what, COUNT(*) AS total FROM employees WHERE employee_id LIKE 'EMP-D%'
UNION ALL SELECT 'logins', COUNT(*) FROM users WHERE employee_id LIKE 'EMP-D%'
UNION ALL SELECT 'groups', COUNT(*) FROM workspace_groups WHERE workspace_id = 'WS-DEMO'
UNION ALL SELECT 'teams', COUNT(*) FROM teams WHERE id LIKE 'TEAM-DEMO%'
UNION ALL SELECT 'team members', COUNT(*) FROM team_members WHERE team_id LIKE 'TEAM-DEMO%'
UNION ALL SELECT 'clients', COUNT(*) FROM clients WHERE workspace_id = 'WS-DEMO'
UNION ALL SELECT 'client assignments', COUNT(*) FROM client_assignees WHERE client_id LIKE 'CLI-DEMO%'
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks WHERE workspace_id = 'WS-DEMO'
UNION ALL SELECT 'task history', COUNT(*) FROM task_history WHERE workspace_id = 'WS-DEMO'
UNION ALL SELECT 'tickets', COUNT(*) FROM client_tickets WHERE workspace_id = 'WS-DEMO';

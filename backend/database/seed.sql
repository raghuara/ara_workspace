INSERT INTO employees
  (employee_id, first_name, last_name, email, phone, department, designation, joining_date, status, employment_type, work_location, reporting_manager_id)
VALUES
  ('EMP-0001', 'Shanika', 'Peiris', 'shanika.peiris@araworkspace.com', '+94 71 201 4107', 'Human Resources', 'HR Manager', '2018-09-03', 'Active', 'Full-time', 'Colombo HQ', NULL),
  ('EMP-0002', 'Dinuka', 'Madushanka', 'dinuka.madushanka@araworkspace.com', '+94 72 202 4114', 'Quality Assurance', 'QA Engineer', '2024-01-08', 'Active', 'Full-time', 'Remote', 'EMP-0001'),
  ('EMP-0003', 'Chalana', 'Dias', 'chalana.dias@araworkspace.com', '+94 73 203 4121', 'Engineering', 'Intern Software Engineer', '2025-08-15', 'Probation', 'Intern', 'Colombo HQ', 'EMP-0001');

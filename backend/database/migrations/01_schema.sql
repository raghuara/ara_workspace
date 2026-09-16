CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30),
  department VARCHAR(50) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  joining_date DATE NOT NULL,
  status ENUM('Active', 'Probation', 'Notice Period', 'Inactive') NOT NULL DEFAULT 'Active',
  employment_type ENUM('Full-time', 'Part-time', 'Contract', 'Intern') NOT NULL DEFAULT 'Full-time',
  work_location ENUM('Colombo HQ', 'Kandy Office', 'Remote', 'Hybrid') NOT NULL DEFAULT 'Colombo HQ',
  reporting_manager_id VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

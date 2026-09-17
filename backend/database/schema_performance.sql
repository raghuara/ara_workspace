CREATE TABLE performance_reviews (
  id VARCHAR(20) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL,
  reviewer_id VARCHAR(20) NULL,
  review_period VARCHAR(40) NOT NULL,
  status ENUM('Draft', 'In Progress', 'Pending Employee', 'Completed') NOT NULL DEFAULT 'Draft',
  overall_rating DECIMAL(2,1) NULL,
  strengths JSON NULL,
  improvement_areas JSON NULL,
  manager_comments TEXT NULL,
  employee_comments TEXT NULL,
  completed_at DATE NULL,
  created_by_id VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  INDEX idx_reviews_employee (employee_id, updated_at),
  INDEX idx_reviews_status (status, updated_at)
);

CREATE TABLE performance_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('On Track', 'At Risk', 'Completed') NOT NULL DEFAULT 'On Track',
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (review_id) REFERENCES performance_reviews(id) ON DELETE CASCADE,
  INDEX idx_goals_review (review_id, sort_order)
);

INSERT INTO features (feature_key, enabled) VALUES ('performance', TRUE)
  ON DUPLICATE KEY UPDATE enabled = VALUES(enabled);

UPDATE user_types
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'review.view', '$', 'review.update')
WHERE id IN (1, 2, 4) AND NOT JSON_CONTAINS(permissions, '"review.view"');

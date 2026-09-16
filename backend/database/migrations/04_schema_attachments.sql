
CREATE TABLE attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_type VARCHAR(30) NOT NULL,
  owner_id VARCHAR(40) NOT NULL,
  category VARCHAR(50) NULL,
  file_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attachments_owner (owner_type, owner_id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

ALTER TABLE client_tickets
  MODIFY status ENUM('New', 'In progress', 'Waiting on client', 'With client', 'Resolved', 'Completed', 'Closed', 'Reopened')
  NOT NULL DEFAULT 'New';

UPDATE client_tickets SET status = 'With client' WHERE status = 'Waiting on client';
UPDATE client_tickets SET status = 'Completed' WHERE status IN ('Resolved', 'Closed');

ALTER TABLE client_tickets
  MODIFY status ENUM('New', 'In progress', 'With client', 'Completed', 'Reopened')
  NOT NULL DEFAULT 'New';

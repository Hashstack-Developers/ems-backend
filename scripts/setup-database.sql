-- MySQL Workbench mein ye script chalayein (apna password/credentials adjust karein)
-- Sirf database banana hai — tables NestJS automatically bana dega

CREATE DATABASE IF NOT EXISTS employee_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Optional: alag user banana ho to (warna apna existing root/user .env mein use karein)
-- CREATE USER IF NOT EXISTS 'ems_user'@'localhost' IDENTIFIED BY 'your_password';
-- GRANT ALL PRIVILEGES ON employee_management.* TO 'ems_user'@'localhost';
-- FLUSH PRIVILEGES;

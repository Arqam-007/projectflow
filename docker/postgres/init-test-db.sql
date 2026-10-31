-- Create dedicated test database for ProjectFlow integration tests
-- Ensures development database (projectflow) and test database (projectflow_test)
-- are completely isolated.
SELECT 'CREATE DATABASE projectflow_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'projectflow_test')\gexec

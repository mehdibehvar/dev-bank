# Bank DB initialization scripts (run on first startup)
-- This file is run by postgres entrypoint on first container start
-- Tables are created by the application migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
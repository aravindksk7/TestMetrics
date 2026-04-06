-- =============================================================
-- V1.0.0 — Dimension Tables
-- =============================================================

CREATE TABLE IF NOT EXISTS dim_release (
  release_id      SERIAL PRIMARY KEY,
  release_name    VARCHAR(20)  NOT NULL UNIQUE,
  release_version VARCHAR(20),
  release_date    DATE,
  status          VARCHAR(30)  NOT NULL DEFAULT 'Active'
                  CHECK (status IN ('Planning','Active','Completed','Cancelled')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dim_program (
  program_id   SERIAL PRIMARY KEY,
  program_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS dim_application (
  app_id      SERIAL PRIMARY KEY,
  app_name    VARCHAR(100) NOT NULL,
  program_id  INT NOT NULL REFERENCES dim_program(program_id) ON DELETE CASCADE,
  UNIQUE (app_name, program_id)
);

CREATE TABLE IF NOT EXISTS dim_environment (
  env_id    SERIAL PRIMARY KEY,
  env_name  VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS dim_test (
  test_id       SERIAL PRIMARY KEY,
  test_key      VARCHAR(30) NOT NULL UNIQUE,
  test_summary  TEXT,
  test_type     VARCHAR(30) CHECK (test_type IN ('Manual','Automated','Cucumber','Generic')),
  priority      VARCHAR(20) CHECK (priority IN ('High','Medium','Low'))
);

CREATE TABLE IF NOT EXISTS dim_requirement (
  req_id       SERIAL PRIMARY KEY,
  req_key      VARCHAR(30) NOT NULL UNIQUE,
  req_summary  TEXT,
  priority     VARCHAR(20) CHECK (priority IN ('High','Medium','Low'))
);

CREATE TABLE IF NOT EXISTS dim_date (
  date_id     SERIAL PRIMARY KEY,
  full_date   DATE         NOT NULL UNIQUE,
  week_num    INT          NOT NULL,
  month_num   INT          NOT NULL,
  year        INT          NOT NULL,
  week_label  VARCHAR(10)  NOT NULL
);

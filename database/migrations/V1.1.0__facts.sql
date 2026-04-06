-- =============================================================
-- V1.1.0 — Fact Tables
-- =============================================================

CREATE TABLE IF NOT EXISTS fact_test_execution (
  exec_id         SERIAL PRIMARY KEY,
  test_id         INT NOT NULL REFERENCES dim_test(test_id),
  release_id      INT NOT NULL REFERENCES dim_release(release_id),
  program_id      INT NOT NULL REFERENCES dim_program(program_id),
  env_id          INT NOT NULL REFERENCES dim_environment(env_id),
  app_id          INT NOT NULL REFERENCES dim_application(app_id),
  date_id         INT NOT NULL REFERENCES dim_date(date_id),
  status          VARCHAR(20) NOT NULL
                  CHECK (status IN ('PASS','FAIL','BLOCKED','IN_PROGRESS')),
  execution_date  DATE NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (test_id, release_id, env_id, execution_date)
);

CREATE INDEX IF NOT EXISTS idx_fte_release   ON fact_test_execution(release_id);
CREATE INDEX IF NOT EXISTS idx_fte_program   ON fact_test_execution(program_id);
CREATE INDEX IF NOT EXISTS idx_fte_env       ON fact_test_execution(env_id);
CREATE INDEX IF NOT EXISTS idx_fte_app       ON fact_test_execution(app_id);
CREATE INDEX IF NOT EXISTS idx_fte_date      ON fact_test_execution(date_id);
CREATE INDEX IF NOT EXISTS idx_fte_status    ON fact_test_execution(status);

CREATE TABLE IF NOT EXISTS fact_requirement_coverage (
  coverage_id  SERIAL PRIMARY KEY,
  req_id       INT     NOT NULL REFERENCES dim_requirement(req_id),
  test_id      INT     NOT NULL REFERENCES dim_test(test_id),
  release_id   INT     NOT NULL REFERENCES dim_release(release_id),
  is_covered   BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (req_id, test_id, release_id)
);

CREATE INDEX IF NOT EXISTS idx_frc_release ON fact_requirement_coverage(release_id);
CREATE INDEX IF NOT EXISTS idx_frc_req     ON fact_requirement_coverage(req_id);

CREATE TABLE IF NOT EXISTS fact_defect (
  defect_id      SERIAL PRIMARY KEY,
  release_id     INT         NOT NULL REFERENCES dim_release(release_id),
  program_id     INT         NOT NULL REFERENCES dim_program(program_id),
  severity       VARCHAR(20) NOT NULL
                 CHECK (severity IN ('Critical','High','Medium','Low')),
  status         VARCHAR(20) NOT NULL
                 CHECK (status IN ('Open','In Progress','Resolved','Closed')),
  created_date   DATE        NOT NULL,
  resolved_date  DATE
);

CREATE INDEX IF NOT EXISTS idx_fd_release  ON fact_defect(release_id);
CREATE INDEX IF NOT EXISTS idx_fd_severity ON fact_defect(severity);
CREATE INDEX IF NOT EXISTS idx_fd_status   ON fact_defect(status);

CREATE TABLE IF NOT EXISTS fact_weekly_metrics (
  week_id       SERIAL PRIMARY KEY,
  date_id       INT            NOT NULL REFERENCES dim_date(date_id),
  release_id    INT            NOT NULL REFERENCES dim_release(release_id),
  pass_rate     NUMERIC(5,2),
  fail_rate     NUMERIC(5,2),
  blocked_rate  NUMERIC(5,2),
  rri_score     NUMERIC(6,2),
  UNIQUE (date_id, release_id)
);

CREATE INDEX IF NOT EXISTS idx_fwm_date    ON fact_weekly_metrics(date_id);
CREATE INDEX IF NOT EXISTS idx_fwm_release ON fact_weekly_metrics(release_id);

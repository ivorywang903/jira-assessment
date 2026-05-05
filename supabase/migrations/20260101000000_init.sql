-- ============================================================
-- 季度考核分析系統 — Initial Migration
-- ============================================================

-- 1. profiles：成員資料
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  en_name      TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  team         TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. auth_info：系統帳號 + 外部系統設定
--    service = 'app_user'  → 系統登入帳號（token 為 SHA-256 密碼）
--    service = 'jira'      → Jira 連線設定（username = 'default'）
--    service = 'bitbucket' → Bitbucket 連線設定（username = 'default'）
CREATE TABLE IF NOT EXISTS auth_info (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service    TEXT NOT NULL,
  base_url   TEXT NOT NULL DEFAULT '',
  username   TEXT NOT NULL,
  token      TEXT NOT NULL,
  extra      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service, username)
);

-- 3. assessment_records：考核記錄
CREATE TABLE IF NOT EXISTS assessment_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  en_name              TEXT NOT NULL REFERENCES profiles(en_name),
  period               TEXT NOT NULL,
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL,
  total_tickets        INT NOT NULL DEFAULT 0,
  avg_lead_time        NUMERIC(6,2),
  total_code_changes   INT NOT NULL DEFAULT 0,
  total_pr_comments    INT NOT NULL DEFAULT 0,
  pr_quality_metrics   JSONB,
  delayed_tickets_json JSONB,
  output_score         NUMERIC(5,2),
  efficiency_score     NUMERIC(5,2),
  quality_score        NUMERIC(5,2),
  final_score          NUMERIC(5,2),
  rank                 INT,
  raw_tickets_json     JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (en_name, period)
);

CREATE INDEX IF NOT EXISTS idx_assessment_en_name ON assessment_records(en_name);
CREATE INDEX IF NOT EXISTS idx_assessment_period  ON assessment_records(period);

CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token VARCHAR(10) UNIQUE NOT NULL,
  form_data JSONB NOT NULL,
  industry VARCHAR(100),
  company_size VARCHAR(100),
  process_type VARCHAR(100),
  project_archetype VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_token ON models(share_token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_created_at ON models(created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  industry VARCHAR(100),
  company_size VARCHAR(100),
  source VARCHAR(50) DEFAULT 'report_download',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

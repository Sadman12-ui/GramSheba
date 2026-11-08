BEGIN;

-- 1. Create Union Parishad table
CREATE TABLE IF NOT EXISTS unions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Register the demo Union Parishad
INSERT INTO unions (name, code)
VALUES ('Test Union', 'TEST-UNION-001')
ON CONFLICT (code) DO NOTHING;

-- 3. Add tenant and role columns to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS union_id INTEGER;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'citizen';

-- 4. Link existing demo users to Test Union
UPDATE users
SET union_id = (
    SELECT id FROM unions WHERE code = 'TEST-UNION-001'
)
WHERE union_id IS NULL;

-- 5. Add tenant column to birth applications
ALTER TABLE birth_applications
ADD COLUMN IF NOT EXISTS union_id INTEGER;

-- 6. Link existing applications to their applicants' Union
UPDATE birth_applications AS applications
SET union_id = users.union_id
FROM users
WHERE applications.applicant_user_id = users.id
  AND applications.union_id IS NULL;

-- 7. Add foreign keys safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_union_id_fkey'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_union_id_fkey
        FOREIGN KEY (union_id) REFERENCES unions(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'birth_applications_union_id_fkey'
    ) THEN
        ALTER TABLE birth_applications
        ADD CONSTRAINT birth_applications_union_id_fkey
        FOREIGN KEY (union_id) REFERENCES unions(id);
    END IF;
END $$;

-- 8. Add indexes for tenant filtering
CREATE INDEX IF NOT EXISTS ix_users_union_id
ON users(union_id);

CREATE INDEX IF NOT EXISTS ix_birth_applications_union_id
ON birth_applications(union_id);

COMMIT;
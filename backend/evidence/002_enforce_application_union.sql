
BEGIN;

-- Ensure a user's ID and Union ID form a valid referenced pair.
ALTER TABLE users
    ADD CONSTRAINT uq_users_id_union_id
    UNIQUE (id, union_id);

-- Ensure each application belongs to its applicant's Union.
ALTER TABLE birth_applications
    ADD CONSTRAINT fk_application_applicant_union
    FOREIGN KEY (applicant_user_id, union_id)
    REFERENCES users (id, union_id);

COMMIT;

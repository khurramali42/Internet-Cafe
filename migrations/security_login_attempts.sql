-- Run against an existing speedy_cafe database before deploying the protected API.
-- Backup the database first. Password migrations require CLI bootstrap and staff resets.
CREATE TABLE IF NOT EXISTS login_attempts (
    identityHash CHAR(64) PRIMARY KEY,
    failures INT NOT NULL DEFAULT 0,
    updatedAt BIGINT NOT NULL
);

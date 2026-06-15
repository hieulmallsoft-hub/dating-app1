-- Create temporary zip sync request table for device-to-device restore flow.
-- Run once on production before using /sync-requests endpoints.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sync_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "coupleId" uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    "requesterId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "providerId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status varchar(30) NOT NULL DEFAULT 'pending',
    note text NULL,
    "originalFileName" varchar(255) NULL,
    "mimeType" varchar(80) NULL,
    "fileSize" integer NULL,
    "storageKey" varchar(512) NULL,
    "uploadedAt" timestamp NULL,
    "downloadedAt" timestamp NULL,
    "confirmedAt" timestamp NULL,
    "payloadDeletedAt" timestamp NULL,
    "expiresAt" timestamp NULL,
    "cancelledAt" timestamp NULL,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_sync_requests_couple_status"
    ON sync_requests ("coupleId", status);

CREATE INDEX IF NOT EXISTS "IDX_sync_requests_requester_status"
    ON sync_requests ("requesterId", status);

CREATE INDEX IF NOT EXISTS "IDX_sync_requests_provider_status"
    ON sync_requests ("providerId", status);

-- PostGIS extension for geospatial queries at scale
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Partitioned posts table for billions of rows
-- Partition by range on created_at (monthly partitions)
CREATE TABLE IF NOT EXISTS posts (
    id BIGSERIAL,
    image_url VARCHAR(500) NOT NULL,
    caption TEXT,
    filter VARCHAR(50) DEFAULT 'none',
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for the next 12 months
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..11 LOOP
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'posts_' || TO_CHAR(start_date, 'YYYY_MM');
        EXECUTE FORMAT(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF posts FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        start_date := end_date;
    END LOOP;
END $$;

-- Partitioned reactions table
CREATE TABLE IF NOT EXISTS reactions (
    id BIGSERIAL,
    emoji VARCHAR(10) NOT NULL,
    user_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at),
    UNIQUE (user_id, post_id, emoji, created_at)
) PARTITION BY RANGE (created_at);

DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..11 LOOP
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'reactions_' || TO_CHAR(start_date, 'YYYY_MM');
        EXECUTE FORMAT(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF reactions FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        start_date := end_date;
    END LOOP;
END $$;

-- Users table with geospatial column
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'verified',
    verification_score INTEGER NOT NULL DEFAULT 0,
    verification_reasons VARCHAR(500),
    is_discoverable BOOLEAN NOT NULL DEFAULT TRUE,
    verified_at TIMESTAMPTZ,
    location GEOGRAPHY(POINT, 4326),
    location_name VARCHAR(255),
    location_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_users_verification_status CHECK (verification_status IN ('verified', 'pending_review'))
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_display_name_trgm ON users USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_location ON users USING gist (location);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_discoverable ON users (is_discoverable, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_post ON reactions (user_id, post_id);

-- Materialized view for reaction counts (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_reaction_counts AS
SELECT
    post_id,
    emoji,
    COUNT(*) AS count
FROM reactions
GROUP BY post_id, emoji;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_reaction_counts ON mv_reaction_counts (post_id, emoji);

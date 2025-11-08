-- Initialize asana_receiver database
-- This script runs automatically when the container is first created

-- Create webhooks table to store webhook secrets
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    webhook_gid VARCHAR(255) UNIQUE NOT NULL,
    resource_gid VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    target_url TEXT NOT NULL,
    secret TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_event_at TIMESTAMP,
    event_count INTEGER DEFAULT 0
);

-- Create index for faster lookups
CREATE INDEX idx_webhooks_gid ON webhooks(webhook_gid);
CREATE INDEX idx_webhooks_resource ON webhooks(resource_gid);
CREATE INDEX idx_webhooks_active ON webhooks(active);

-- Create events table to store webhook events history
CREATE TABLE IF NOT EXISTS webhook_events (
    id SERIAL PRIMARY KEY,
    webhook_gid VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_gid VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    user_gid VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payload JSONB NOT NULL,
    signature_verified BOOLEAN DEFAULT false
);

-- Create indexes for events
CREATE INDEX idx_events_webhook ON webhook_events(webhook_gid);
CREATE INDEX idx_events_resource ON webhook_events(resource_gid);
CREATE INDEX idx_events_created ON webhook_events(created_at DESC);
CREATE INDEX idx_events_received ON webhook_events(received_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for webhooks table
CREATE TRIGGER update_webhooks_updated_at 
    BEFORE UPDATE ON webhooks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (optional, but good practice)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO asana_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO asana_admin;

-- Insert sample comment
COMMENT ON TABLE webhooks IS 'Stores Asana webhook subscriptions and their secrets';
COMMENT ON TABLE webhook_events IS 'Stores all received webhook events for audit trail';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully!';
    RAISE NOTICE 'Tables created: webhooks, webhook_events';
END $$;


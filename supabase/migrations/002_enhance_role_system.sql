-- Enhanced Role System Migration
-- This migration adds notifications, user metrics, team settings, and improved user management

-- =============================================
-- 1. ENHANCE USERS TABLE
-- =============================================

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Set existing users as approved (for backward compatibility)
UPDATE users SET is_approved = true WHERE is_approved IS NULL OR is_approved = false;

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(is_approved);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);

-- =============================================
-- 2. NOTIFICATIONS SYSTEM
-- =============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'approval_request', 'approval_approved', 'approval_rejected',
        'team_invitation', 'team_update', 'contact_assigned',
        'metric_milestone', 'system_announcement'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- =============================================
-- 3. USER METRICS SYSTEM
-- =============================================

-- Create user_metrics table for daily performance tracking
CREATE TABLE IF NOT EXISTS user_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    contacts_created INTEGER DEFAULT 0,
    contacts_updated INTEGER DEFAULT 0,
    contacts_converted INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    meetings_scheduled INTEGER DEFAULT 0,
    meetings_completed INTEGER DEFAULT 0,
    revenue_generated DECIMAL(12,2) DEFAULT 0,
    pipeline_value DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Indexes for user_metrics
CREATE INDEX IF NOT EXISTS idx_user_metrics_user_id ON user_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_metrics_team_id ON user_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_user_metrics_date ON user_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_user_metrics_revenue ON user_metrics(revenue_generated DESC);
CREATE INDEX IF NOT EXISTS idx_user_metrics_user_date ON user_metrics(user_id, date);

-- =============================================
-- 4. TEAM SETTINGS SYSTEM
-- =============================================

-- Create team_settings table for configurable team parameters
CREATE TABLE IF NOT EXISTS team_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, setting_key)
);

-- Indexes for team_settings
CREATE INDEX IF NOT EXISTS idx_team_settings_team_id ON team_settings(team_id);
CREATE INDEX IF NOT EXISTS idx_team_settings_key ON team_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_team_settings_updated_at ON team_settings(updated_at DESC);

-- =============================================
-- 5. FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_metrics_updated_at ON user_metrics;
CREATE TRIGGER update_user_metrics_updated_at BEFORE UPDATE ON user_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_settings_updated_at ON team_settings;
CREATE TRIGGER update_team_settings_updated_at BEFORE UPDATE ON team_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification for approval requests
CREATE OR REPLACE FUNCTION notify_approval_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify all administrators about new approval request
    INSERT INTO notifications (user_id, type, title, message, data, priority)
    SELECT 
        id,
        'approval_request',
        'Nueva solicitud de aprobación',
        'Un usuario ha solicitado ser promovido a ' || NEW.requested_role,
        json_build_object(
            'approval_id', NEW.id,
            'user_id', NEW.user_id,
            'requested_role', NEW.requested_role
        ),
        'high'
    FROM users 
    WHERE role = 'admin' AND is_approved = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for approval notifications
DROP TRIGGER IF EXISTS approval_notification_trigger ON approvals;
CREATE TRIGGER approval_notification_trigger
    AFTER INSERT ON approvals
    FOR EACH ROW
    EXECUTE FUNCTION notify_approval_request();

-- Function to notify approval results
CREATE OR REPLACE FUNCTION notify_approval_result()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if status changed to approved or rejected
    IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
        INSERT INTO notifications (user_id, type, title, message, data, priority)
        VALUES (
            NEW.user_id,
            CASE 
                WHEN NEW.status = 'approved' THEN 'approval_approved'
                ELSE 'approval_rejected'
            END,
            CASE 
                WHEN NEW.status = 'approved' THEN 'Solicitud aprobada'
                ELSE 'Solicitud rechazada'
            END,
            CASE 
                WHEN NEW.status = 'approved' THEN 'Tu solicitud para ser ' || NEW.requested_role || ' ha sido aprobada'
                ELSE 'Tu solicitud para ser ' || NEW.requested_role || ' ha sido rechazada'
            END,
            json_build_object(
                'approval_id', NEW.id,
                'requested_role', NEW.requested_role,
                'status', NEW.status,
                'comments', NEW.comments
            ),
            'high'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for approval result notifications
DROP TRIGGER IF EXISTS approval_result_notification_trigger ON approvals;
CREATE TRIGGER approval_result_notification_trigger
    AFTER UPDATE ON approvals
    FOR EACH ROW
    EXECUTE FUNCTION notify_approval_result();

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;

-- Notifications policies
-- Users can only see their own notifications
CREATE POLICY "notifications_own" ON notifications
    FOR ALL USING (user_id = auth.uid());

-- User metrics policies
-- Users can see their own metrics
CREATE POLICY "user_metrics_own" ON user_metrics
    FOR SELECT USING (user_id = auth.uid());

-- Managers can see metrics of their team members
CREATE POLICY "user_metrics_team_manager" ON user_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            JOIN users u ON u.id = auth.uid()
            WHERE tm.team_id = user_metrics.team_id
            AND tm.user_id = auth.uid()
            AND u.role IN ('manager', 'admin')
            AND u.is_approved = true
        )
    );

-- Admins can see all metrics
CREATE POLICY "user_metrics_admin" ON user_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND is_approved = true
        )
    );

-- Team settings policies
-- Team members can read team settings
CREATE POLICY "team_settings_read" ON team_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_settings.team_id
            AND tm.user_id = auth.uid()
        )
    );

-- Managers and admins can modify team settings
CREATE POLICY "team_settings_modify" ON team_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            JOIN users u ON u.id = auth.uid()
            WHERE tm.team_id = team_settings.team_id
            AND tm.user_id = auth.uid()
            AND u.role IN ('manager', 'admin')
            AND u.is_approved = true
        )
    );

-- =============================================
-- 7. GRANT PERMISSIONS
-- =============================================

-- Grant permissions for anon role (public access)
GRANT SELECT ON notifications TO anon;
GRANT SELECT ON user_metrics TO anon;
GRANT SELECT ON team_settings TO anon;

-- Grant full permissions for authenticated users
GRANT ALL PRIVILEGES ON notifications TO authenticated;
GRANT ALL PRIVILEGES ON user_metrics TO authenticated;
GRANT ALL PRIVILEGES ON team_settings TO authenticated;

-- =============================================
-- 8. DEFAULT TEAM SETTINGS
-- =============================================

-- Insert default team settings for existing teams
INSERT INTO team_settings (team_id, setting_key, setting_value, description)
SELECT 
    id,
    'auto_assign_contacts',
    'true'::jsonb,
    'Asignación automática de contactos'
FROM teams
WHERE NOT EXISTS (
    SELECT 1 FROM team_settings 
    WHERE team_id = teams.id 
    AND setting_key = 'auto_assign_contacts'
);

INSERT INTO team_settings (team_id, setting_key, setting_value, description)
SELECT 
    id,
    'daily_report_enabled',
    'true'::jsonb,
    'Reportes diarios habilitados'
FROM teams
WHERE NOT EXISTS (
    SELECT 1 FROM team_settings 
    WHERE team_id = teams.id 
    AND setting_key = 'daily_report_enabled'
);

INSERT INTO team_settings (team_id, setting_key, setting_value, description)
SELECT 
    id,
    'conversion_goal',
    '20'::jsonb,
    'Meta de conversiones mensuales'
FROM teams
WHERE NOT EXISTS (
    SELECT 1 FROM team_settings 
    WHERE team_id = teams.id 
    AND setting_key = 'conversion_goal'
);

INSERT INTO team_settings (team_id, setting_key, setting_value, description)
SELECT 
    id,
    'revenue_goal',
    '50000'::jsonb,
    'Meta de ingresos mensuales'
FROM teams
WHERE NOT EXISTS (
    SELECT 1 FROM team_settings 
    WHERE team_id = teams.id 
    AND setting_key = 'revenue_goal'
);

-- =============================================
-- 9. CLEANUP AND OPTIMIZATION
-- =============================================

-- Analyze tables for query optimization
ANALYZE notifications;
ANALYZE user_metrics;
ANALYZE team_settings;
ANALYZE users;
ANALYZE teams;

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_metrics_team_date ON user_metrics(team_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_users_role_approved ON users(role, is_approved) WHERE is_approved = true;

-- Migration completed successfully
COMMENT ON TABLE notifications IS 'System notifications for users including approval requests and status updates';
COMMENT ON TABLE user_metrics IS 'Daily performance metrics for users including contacts, conversions, and revenue';
COMMENT ON TABLE team_settings IS 'Configurable settings for teams including goals and automation preferences';
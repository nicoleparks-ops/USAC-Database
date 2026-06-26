-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  webconnex_id UUID UNIQUE NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  age_group VARCHAR(50),
  gender VARCHAR(50),
  school VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_sync TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_participant_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participant_webconnex_id ON participants(webconnex_id);

-- Registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  webconnex_id UUID UNIQUE NOT NULL,
  participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  event_date DATE,
  registration_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'registered', -- registered, checked_in, cancelled
  registration_type VARCHAR(100),
  fee_amount DECIMAL(10, 2),
  fee_paid BOOLEAN DEFAULT FALSE,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registration_participant_id ON registrations(participant_id);
CREATE INDEX IF NOT EXISTS idx_registration_event_name ON registrations(event_name);
CREATE INDEX IF NOT EXISTS idx_registration_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registration_event_date ON registrations(event_date);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  webconnex_id UUID UNIQUE NOT NULL,
  participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
  registration_id INTEGER REFERENCES registrations(id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  hours_attended DECIMAL(5, 2),
  attendance_status VARCHAR(50) DEFAULT 'present', -- present, absent, excused
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_participant_id ON attendance(participant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_registration_id ON attendance(registration_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_name ON attendance(event_name);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON attendance(check_in_time);

-- Webhook events log
CREATE TABLE IF NOT EXISTS webconnex_events (
  id SERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  event_type VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processed, error
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_id ON webconnex_events(event_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON webconnex_events(event_type);
CREATE INDEX IF NOT EXISTS idx_event_status ON webconnex_events(status);
CREATE INDEX IF NOT EXISTS idx_event_received_at ON webconnex_events(received_at);

-- Create views for reporting
CREATE OR REPLACE VIEW participant_summary AS
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.school,
  COUNT(DISTINCT r.id) as registration_count,
  COUNT(DISTINCT a.id) as attendance_count,
  COALESCE(SUM(CASE WHEN a.attendance_status = 'present' THEN a.hours_attended ELSE 0 END), 0) as total_hours
FROM participants p
LEFT JOIN registrations r ON p.id = r.participant_id
LEFT JOIN attendance a ON p.id = a.participant_id
GROUP BY p.id;

CREATE OR REPLACE VIEW event_summary AS
SELECT 
  r.event_name,
  r.event_date,
  COUNT(DISTINCT r.participant_id) as total_registered,
  COUNT(DISTINCT CASE WHEN r.status = 'checked_in' THEN r.participant_id END) as checked_in,
  COUNT(DISTINCT a.participant_id) as attended,
  COALESCE(SUM(r.fee_amount), 0) as total_fees,
  COALESCE(SUM(CASE WHEN r.fee_paid THEN r.fee_amount ELSE 0 END), 0) as fees_paid
FROM registrations r
LEFT JOIN attendance a ON r.id = a.registration_id
GROUP BY r.event_name, r.event_date;

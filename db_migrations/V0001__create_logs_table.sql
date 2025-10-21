-- Create logs table for eKomKassa API calls
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    function_name VARCHAR(50) NOT NULL,
    log_level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    request_data JSONB,
    response_data JSONB,
    request_id VARCHAR(100),
    duration_ms INTEGER,
    status_code INTEGER
);

-- Create index for faster queries by function_name and created_at
CREATE INDEX idx_logs_function_created ON logs(function_name, created_at DESC);
CREATE INDEX idx_logs_request_id ON logs(request_id);
CREATE INDEX idx_logs_level ON logs(log_level);
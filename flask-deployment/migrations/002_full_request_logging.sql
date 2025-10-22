-- Создаём таблицу для полного логирования запросов
CREATE TABLE IF NOT EXISTS request_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Информация о запросе
    method VARCHAR(10) NOT NULL,
    url TEXT NOT NULL,
    path TEXT NOT NULL,
    
    -- Откуда пришёл запрос
    source_ip VARCHAR(45),
    user_agent TEXT,
    
    -- Заголовки и тело запроса
    request_headers JSONB,
    request_body JSONB,
    
    -- Куда отправили (для проксирования)
    target_url TEXT,
    target_method VARCHAR(10),
    target_headers JSONB,
    target_body JSONB,
    
    -- Ответ от целевого сервиса
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    
    -- Ответ клиенту (может отличаться от ответа целевого сервиса)
    client_response_status INTEGER,
    client_response_body JSONB,
    
    -- Производительность
    duration_ms INTEGER,
    
    -- Дополнительная информация
    error_message TEXT,
    request_id VARCHAR(100)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_path ON request_logs(path);
CREATE INDEX IF NOT EXISTS idx_request_logs_request_id ON request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_source_ip ON request_logs(source_ip);
CREATE INDEX IF NOT EXISTS idx_request_logs_response_status ON request_logs(response_status);

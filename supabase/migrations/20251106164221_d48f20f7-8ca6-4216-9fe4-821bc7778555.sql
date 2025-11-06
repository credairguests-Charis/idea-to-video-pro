-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the cron job to check generation failures every 10 minutes
SELECT cron.schedule(
  'check-generation-failures-every-10-min',
  '*/10 * * * *', -- Every 10 minutes
  $$
  SELECT
    net.http_post(
        url:='https://kopclhksdjbheypwsvxz.supabase.co/functions/v1/check-generation-failures',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvcGNsaGtzZGpiaGV5cHdzdnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDgzMDYsImV4cCI6MjA3MzYyNDMwNn0._e_cWqsWbWqtlb3bQlW9G6PgPKW_ibTivdUs1kXxGYo"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
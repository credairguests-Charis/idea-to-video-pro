-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule health checks to run every 5 minutes
SELECT cron.schedule(
  'health-check-every-5-minutes',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://kopclhksdjbheypwsvxz.supabase.co/functions/v1/health-check-cron',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvcGNsaGtzZGpiaGV5cHdzdnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDgzMDYsImV4cCI6MjA3MzYyNDMwNn0._e_cWqsWbWqtlb3bQlW9G6PgPKW_ibTivdUs1kXxGYo"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

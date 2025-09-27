-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to poll OmniHuman status every 2 minutes
SELECT cron.schedule(
  'poll-omnihuman-status',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://kopclhksdjbheypwsvxz.supabase.co/functions/v1/poll-omnihuman-status',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvcGNsaGtzZGpiaGV5cHdzdnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDgzMDYsImV4cCI6MjA3MzYyNDMwNn0._e_cWqsWbWqtlb3bQlW9G6PgPKW_ibTivdUs1kXxGYo"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);
-- Update the cron job to poll OmniHuman status every minute instead of every 2 minutes

-- First, unschedule the existing cron job
SELECT cron.unschedule('poll-omnihuman-status');

-- Create a new cron job to poll OmniHuman status every minute
SELECT cron.schedule(
  'poll-omnihuman-status',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://kopclhksdjbheypwsvxz.supabase.co/functions/v1/poll-omnihuman-status',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvcGNsaGtzZGpiaGV5cHdzdnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDgzMDYsImV4cCI6MjA3MzYyNDMwNn0._e_cWqsWbWqtlb3bQlW9G6PgPKW_ibTivdUs1kXxGYo"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);
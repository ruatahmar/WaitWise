-- add database level constraints to respect invairants

ALTER TABLE "Queue"
ADD CONSTRAINT "queue_max_active_users_positive"
CHECK ("maxActiveUsers" IS NULL OR "maxActiveUsers" > 0);

ALTER TABLE "Queue"
ADD CONSTRAINT "queue_turn_expiry_minutes_positive"
CHECK ("turnExpiryMinutes" IS NULL OR "turnExpiryMinutes" > 0);

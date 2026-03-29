-- Denormalized growth signal for fast roster display (set during profile upsert)
ALTER TABLE student_profiles ADD COLUMN growth_signal TEXT;

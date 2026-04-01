-- Migration: add night_time column to report_config
ALTER TABLE report_config ADD COLUMN IF NOT EXISTS night_time TEXT NOT NULL DEFAULT '20:00';

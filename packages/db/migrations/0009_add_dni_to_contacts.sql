-- Migration: Add DNI field to contacts table
-- Description: Adds optional DNI field for contact identification

ALTER TABLE contacts ADD COLUMN dni TEXT;



-- Migration: Add Action Plan Date and Status
ALTER TABLE checklist_answers
ADD COLUMN IF NOT EXISTS action_plan_due_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS action_plan_status text DEFAULT 'PENDING'::text;

-- Update existing where action_plan is set to PENDING
UPDATE checklist_answers
SET action_plan_status = 'PENDING'
WHERE action_plan IS NOT NULL AND action_plan_status IS NULL;

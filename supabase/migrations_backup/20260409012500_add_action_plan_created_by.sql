-- Migration: Add created_by_user_id to track who created the action plan
ALTER TABLE checklist_answers
ADD COLUMN IF NOT EXISTS action_plan_created_by uuid REFERENCES auth.users(id);

-- Backfill: set created_by to the submission's user_id for existing action plans
UPDATE checklist_answers ca
SET action_plan_created_by = cs.user_id
FROM checklist_submissions cs
WHERE ca.submission_id = cs.id
  AND ca.action_plan IS NOT NULL
  AND ca.action_plan_created_by IS NULL;

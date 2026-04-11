-- Enhancing quiz_questions with more metadata for the AI Agent
ALTER TABLE public.quiz_questions 
ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'OBJECTIVE' CHECK (question_type IN ('OBJECTIVE', 'DISCURSIVE')),
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Médio',
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS source_excerpt TEXT;

-- Update RLS or other constraints if needed (none required for these simple columns)

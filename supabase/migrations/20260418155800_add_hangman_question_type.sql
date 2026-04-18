-- Add HANGMAN and FILE to the allowed question types
ALTER TABLE course_phase_questions
  DROP CONSTRAINT IF EXISTS course_phase_questions_question_type_check;

ALTER TABLE course_phase_questions
  ADD CONSTRAINT course_phase_questions_question_type_check
  CHECK (question_type = ANY (ARRAY[
    'MULTIPLE_CHOICE'::text,
    'WORD_SEARCH'::text,
    'ORDERING'::text,
    'HOTSPOT'::text,
    'FILE'::text,
    'HANGMAN'::text
  ]));

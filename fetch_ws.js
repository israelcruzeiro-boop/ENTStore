import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rmvfegihpkogdvwmmvpj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdmZlZ2locGtvZ2R2d21tdnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjYxODUsImV4cCI6MjA4ODk0MjE4NX0.eWOG4HFqdFZ5KtsdUi4tFMSTvrdARcPdwz4udlEhxaw'
);

async function main() {
  const { data, error } = await supabase
    .from('course_phase_questions')
    .select('configuration')
    .eq('question_type', 'WORD_SEARCH')
    .limit(1);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

main();

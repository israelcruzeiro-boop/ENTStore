import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rmvfegihpkogdvwmmvpj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdmZlZ2locGtvZ2R2d21tdnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjYxODUsImV4cCI6MjA4ODk0MjE4NX0.eWOG4HFqdFZ5KtsdUi4tFMSTvrdARcPdwz4udlEhxaw'
);

async function main() {
  const { data, error } = await supabase
    .from('course_phase_questions')
    .select('id, question_text, configuration')
    .eq('question_type', 'WORD_SEARCH');
    
  if (error) {
    console.error('Error:', error);
    return;
  }

  const matches = data.filter(q => {
    const config = q.configuration;
    return config && config.words && config.words.some(w => w.toUpperCase().includes('COMPUTADOR'));
  });

  console.log('Found', matches.length, 'questions with COMPUTADOR');
  if (matches.length > 0) {
    console.log(JSON.stringify(matches[0], null, 2));
  }
}

main();

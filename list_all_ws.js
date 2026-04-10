import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rmvfegihpkogdvwmmvpj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdmZlZ2locGtvZ2R2d21tdnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjYxODUsImV4cCI6MjA4ODk0MjE4NX0.eWOG4HFqdFZ5KtsdUi4tFMSTvrdARcPdwz4udlEhxaw'
);

async function main() {
  const { data, error } = await supabase
    .from('course_phase_questions')
    .select('id, question_text, configuration, question_type');
    
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total questions found:', data.length);
  data.forEach((q, idx) => {
    console.log(`[${idx}] Type: ${q.question_type} | Text: ${q.question_text.substring(0, 30)}...`);
    if (q.question_type === 'WORD_SEARCH' && q.configuration) {
        console.log(`    Words: ${JSON.stringify(q.configuration.words)}`);
    }
  });
}

main();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rmvfegihpkogdvwmmvpj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdmZlZ2locGtvZ2R2d21tdnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjYxODUsImV4cCI6MjA4ODk0MjE4NX0.eWOG4HFqdFZ5KtsdUi4tFMSTvrdARcPdwz4udlEhxaw'
);

async function main() {
  const { data, error } = await supabase.from('companies').select('*');
  if (error) { console.error(error); return; }
  console.log('Companies:', data);
  
  const { data: q, error: e2 } = await supabase.from('course_phase_questions').select('count');
  console.log('Total Questions Count:', q, e2);
}

main();

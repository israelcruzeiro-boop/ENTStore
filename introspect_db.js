import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rmvfegihpkogdvwmmvpj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdmZlZ2locGtvZ2R2d21tdnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjYxODUsImV4cCI6MjA4ODk0MjE4NX0.eWOG4HFqdFZ5KtsdUi4tFMSTvrdARcPdwz4udlEhxaw'
);

async function main() {
  console.log('--- INTROSPECTION START ---');
  // Listar tabelas via RPC se possível, ou via query direta no schema
  const { data: tables, error } = await supabase
    .from('pg_catalog.pg_tables')
    .select('tablename')
    .eq('schemaname', 'public');
    
  if (error) {
    console.log('Error listing via pg_tables (normal for anon):', error.message);
    
    // Tentar de forma cega nas tabelas que o código usa
    const commonTables = [
        'companies', 'courses', 'course_modules', 'course_phase_questions', 
        'checklists', 'checklist_submissions', 'checklist_answers', 'profiles'
    ];
    
    for (const table of commonTables) {
        const { count, error: e2 } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (e2) {
            console.log(`Table [${table}]: FAILED (${e2.message})`);
        } else {
            console.log(`Table [${table}]: EXISTS (${count} rows)`);
        }
    }
  } else {
    console.log('Tables in public:', tables.map(t => t.tablename));
  }
}

main();

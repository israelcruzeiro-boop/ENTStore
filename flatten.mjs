import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function flatten(functionName) {
  const indexPath = path.join(__dirname, 'supabase/functions', functionName, 'index.ts');
  let code = fs.readFileSync(indexPath, 'utf-8');

  // Find all imports from ../_shared/
  const importRegex = /import\s+{[^}]+}\s+from\s+['"]\.\.\/_shared\/([^'"]+)\.ts['"];/g;
  
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const sharedFile = match[1];
    
    // Read the shared file
    const sharedPath = path.join(__dirname, 'supabase/functions/_shared', `${sharedFile}.ts`);
    let sharedCode = fs.readFileSync(sharedPath, 'utf-8');
    
    // Remove export keywords from the shared code so it can be inlined safely
    sharedCode = sharedCode.replace(/^export\s+/gm, '');
    
    // Replace the import statement with the inlined code
    // We put it at the top (after Deno/serve imports)
    code = code.replace(match[0], `// --- INLINED FROM ${sharedFile}.ts ---\n${sharedCode}\n// --- END INLINED ---`);
  }

  // Save the flattened file
  const outDir = path.join(__dirname, 'supabase/flattened');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${functionName}.ts`), code);
  console.log(`Flattened ${functionName} -> supabase/flattened/${functionName}.ts`);
}

flatten('process-course-content');
flatten('generate-quiz');
flatten('generate-quiz-vertex');

// Simulação do gerador de grid do CourseDetails.tsx
function generateGrid(wordsForGrid, difficulty) {
    const longestWord = Math.max(...wordsForGrid.map(w => w.length));
    const baseSize = difficulty === 'HARD' ? 12 : difficulty === 'MEDIUM' ? 10 : 8;
    const size = Math.max(baseSize, longestWord + 2);
    const grid = Array(size).fill(null).map(() => Array(size).fill(''));
    
    const directionsByDifficulty = {
      EASY: [[0, 1], [1, 0]], 
      MEDIUM: [[0, 1], [1, 0], [1, 1], [-1, 1]], 
      HARD: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] 
    };
    const directions = directionsByDifficulty[difficulty];

    const placedWords = [];
    for (const word of wordsForGrid) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 500) {
        const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);
        
        let fits = true;
        if (r + dr * (word.length - 1) < 0 || r + dr * (word.length - 1) >= size) fits = false;
        if (c + dc * (word.length - 1) < 0 || c + dc * (word.length - 1) >= size) fits = false;
        
        if (fits) {
          for (let i = 0; i < word.length; i++) {
            const currChar = grid[r + i * dr][c + i * dc];
            if (currChar !== '' && currChar !== word[i]) {
              fits = false;
              break;
            }
          }
        }

        if (fits) {
          for (let i = 0; i < word.length; i++) {
            grid[r + i * dr][c + i * dc] = word[i];
          }
          placed = true;
          placedWords.push(word);
        }
        attempts++;
      }
      if (!placed) console.log(`FAILED TO PLACE WORD: ${word}`);
    }
    return { size, placedWords };
}

console.log('--- TEST 1: EASY ---');
console.log(generateGrid(['COMPUTADOR', 'TECLADO', 'MOUSE'], 'EASY'));

console.log('--- TEST 2: MEDIUM ---');
console.log(generateGrid(['COMPUTADOR', 'TECLADO', 'MOUSE', 'MONITOR', 'ESTABILIZADOR'], 'MEDIUM'));

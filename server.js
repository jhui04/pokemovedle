import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;

// app.use(cors());
app.use(cors({
  origin: ['https://justinhui.dev', 'https://www.justinhui.dev'],
  credentials: true
}));
app.use(express.json());

// Load JSON files into memory
const pokemonList = JSON.parse(fs.readFileSync('./pokemon_list.json', 'utf-8'));
const pokemonMoves = JSON.parse(fs.readFileSync('./pokemon_moves.json', 'utf-8'));

let currentMoveKey = null;
let currentRandomMove = null;
let previousMoves = [];

app.post('/api/send', (req, res) => {
  const { text } = req.body;
  if (typeof text === 'undefined') {
    // Initial page load: pick and store a random key and move
    const moveKeys = Object.keys(pokemonMoves);
    let foundValidInitialMove = false;
    let attempts = 0;
    while (!foundValidInitialMove && attempts < 1000) {
      attempts++;
      currentMoveKey = moveKeys[Math.floor(Math.random() * moveKeys.length)];
      const moveArray = pokemonMoves[currentMoveKey];
      let move;
      let previousPool = Object.keys(pokemonMoves);
      let foundReducingMove = false;
      for (let candidate of moveArray) {
        const testMoves = [candidate];
        const newPool = previousPool.filter(key => testMoves.every(m => pokemonMoves[key].includes(m)));
        if (newPool.length < previousPool.length) {
          move = candidate;
          foundReducingMove = true;
          break;
        }
      }
      if (!foundReducingMove && moveArray.length > 0) {
        // fallback: pick any move
        move = moveArray[Math.floor(Math.random() * moveArray.length)];
      }
      previousMoves = [move];
      currentRandomMove = move;
      // Find all keys whose values contain all previousMoves
      const matchingKeys = Object.keys(pokemonMoves).filter(key => previousMoves.every(m => pokemonMoves[key].includes(m)));
      if (matchingKeys.length >= 600) {
        foundValidInitialMove = true;
        const matchingPokemon = matchingKeys.map(key => key);
        const count = matchingPokemon.length;
        res.json({ move: currentRandomMove, count, pokemon: matchingPokemon });
        break;
      }
      // else, try again
    }
    if (!foundValidInitialMove) {
      res.status(500).json({ error: 'Could not find a valid initial move with at least 600 Pokémon.' });
    }
  } else {
    // User submitted a guess: check if the guess is correct, then pick another move
    if (currentMoveKey) {
      // Check if the guess is correct
      let guessPasses = false;
      let missingMoves = [];
      let endMessage = null;
      if (currentMoveKey === text) {
        endMessage = `Congratulations! It was ${text}. You guessed the right Pokémon!`;
      }

      if (text && pokemonMoves[text]) {
        // The guess is correct if the guessed Pokémon can learn all previousMoves
        guessPasses = previousMoves.every(m => pokemonMoves[text].includes(m));
        missingMoves = previousMoves.filter(m => !pokemonMoves[text].includes(m));
      }


      // ...existing code for picking next move...
      const moveArray = pokemonMoves[currentMoveKey];
      let previousPool = Object.keys(pokemonMoves).filter(key => previousMoves.every(m => pokemonMoves[key].includes(m)));
      let newRandomMove = currentRandomMove;
      let foundReducingMove = false;
      for (let candidate of moveArray) {
        if (previousMoves.includes(candidate)) continue;
        const testMoves = [...previousMoves, candidate];
        const newPool = previousPool.filter(key => testMoves.every(m => pokemonMoves[key].includes(m)));
        if (newPool.length < previousPool.length) {
          newRandomMove = candidate;
          previousMoves.push(newRandomMove);
          foundReducingMove = true;
          break;
        }
      }
      if (!foundReducingMove && moveArray.length > 0) {
        // fallback: pick any move not previously picked
        const availableMoves = moveArray.filter(m => !previousMoves.includes(m));
        if (availableMoves.length > 0) {
          newRandomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
          previousMoves.push(newRandomMove);
        }
      }
      currentRandomMove = newRandomMove;
      console.log('Received text:', text);
      // Find all keys whose values contain all previousMoves
      const matchingKeys = Object.keys(pokemonMoves).filter(key => previousMoves.every(m => pokemonMoves[key].includes(m)));
      const matchingPokemon = matchingKeys.map(key => key);
      const count = matchingPokemon.length;
      res.json({ move: currentRandomMove, count, pokemon: matchingPokemon, guessPasses, missingMoves, endMessage });
    } else {
      res.status(400).json({ error: 'No move key set. Please reload the page.' });
    }
  }
});

app.get('/api/autocomplete', (req, res) => {
  const query = req.query.query?.toLowerCase() || '';
  if (!query) return res.json({ options: [] });
  // Search all Pokémon names in pokemonList
  const options = Object.keys(pokemonMoves).filter(name => name.toLowerCase().includes(query));
  res.json({ options });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

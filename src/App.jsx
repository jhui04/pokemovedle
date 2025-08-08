import { useEffect, useState } from 'react'
import './App.css'
import './style.css'

function App() {
  const [count, setCount] = useState(0)
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [moveRows, setMoveRows] = useState([]);
  const [endMessage, setEndMessage] = useState("");
  const [giveUpMessage, setGiveUpMessage] = useState("");
  const handleGiveUp = () => {
    if (moveRows.length > 0 && moveRows[0]?.pokemon?.[0]) {
      setGiveUpMessage(`The Pokémon was: ${moveRows[0].pokemon[0]}`);
    } else {
      setGiveUpMessage("No Pokémon to reveal.");
    }
  };

  useEffect(() => {
    const fetchRandomMove = async () => {
      try {
        const response = await fetch("https://justinhui.dev/api/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Initial data from backend:', data);
          console.log([{ move: data.move, count: data.count, pokemon: data.pokemon }])
          setMoveRows([{ move: data.move, count: data.count, pokemon: data.pokemon }]);
        } else {
          console.error('Backend returned error:', response.status);
        }
      } catch (err) {
        console.error('Error fetching random move:', err);
      }
    };
    fetchRandomMove();
  }, []);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    fetchAutocomplete(e.target.value);
  };

  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [previousGuesses, setPreviousGuesses] = useState([]);

  const fetchAutocomplete = async (query) => {
    if (!query) {
      setAutocompleteOptions([]);
      return;
    }
    try {
      const response = await fetch(`https://justinhui.dev/api/autocomplete?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out previous guesses
        const filteredOptions = data.options.filter(opt => !previousGuesses.includes(opt));
        setAutocompleteOptions(filteredOptions);
      } else {
        setAutocompleteOptions([]);
      }
    } catch (err) {
      setAutocompleteOptions([]);
    }
  };

  const sendToBackend = async () => {
    if (!autocompleteOptions.includes(input)) {
      return;
    }
    try {
      const response = await fetch("https://justinhui.dev/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: input })
      });
      if (response.ok) {
        const data = await response.json();
        setMoveRows((prev) => {
          // Add the new clue row
          const newRows = [...prev, { move: data.move, count: data.count, pokemon: data.pokemon }];
          console.log(newRows);
          // If this is a guess, update the previous row (not the new clue row)
          if (newRows.length > 1) {
            const guessIdx = newRows.length - 2;
            newRows[guessIdx] = {
              ...newRows[guessIdx],
              guessPasses: data.guessPasses,
              missingMoves: data.missingMoves,
              guessedPokemon: input
            };
          }
          console.log('Updated moveRows:', newRows);
          return newRows;
        });
        // Add the guess to previousGuesses
        setPreviousGuesses(prev => [...prev, input]);
        // Show end message only if the guess is valid AND matches the initial Pokémon
        if (data.endMessage && input === moveRows[0]?.pokemon?.[0] && moveRows.length > 0) {
          setEndMessage(data.endMessage);
        }
      } else {
        setStatus("Error sending");
        console.error('Backend returned error:', response.status);
      }
    } catch (err) {
      setStatus("Network error");
      console.error('Error sending to backend:', err);
    }
  };

  return (
    <>
      <div className="card">
        {endMessage && (
          <div className="end-message" style={{ color: 'green', fontWeight: 'bold', marginBottom: '1em' }}>
            {endMessage}
          </div>
        )}
        {giveUpMessage && (
          <div className="giveup-message" style={{ color: 'orange', fontWeight: 'bold', marginBottom: '1em' }}>
            {giveUpMessage}
          </div>
        )}
        {moveRows && moveRows.length > 0 && (
          <table className="random-move-table">
            <thead>
              <tr>
                <th style={{ minWidth: '200px' }}>Random Move</th>
                <th>Count</th>
                {/* <th>Pokemon</th> */}
                <th>Guessed Pokémon</th>
                <th style={{ minWidth: '220px' }}>Missing Moves</th>
              </tr>
            </thead>
            <tbody>
              {moveRows.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ minWidth: '200px' }}>{row.move}</td>
                  <td>{row.count}</td>
                  {/* <td>{row.pokemon && row.pokemon.join(', ')}</td> */}
                  <td>
                    {typeof row.guessPasses === 'boolean' ? (
                      <span style={{ color: row.guessPasses ? 'green' : 'red', fontWeight: 'bold' }}>
                        {row.guessedPokemon}
                      </span>
                    ) : null}
                  </td>
                  <td style={{ minWidth: '220px' }}>
                    {typeof row.guessPasses === 'boolean' && !row.guessPasses && row.missingMoves && row.missingMoves.length > 0 ? (
                      <span style={{ color: 'red', fontWeight: 'bold' }}>
                        {row.missingMoves.join(', ')}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="random-move-container" style={{ display: 'flex', alignItems: 'center', gap: '1em' }}>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type something..."
            className="random-move-input"
            autoComplete="off"
            list="pokemon-autocomplete"
            onKeyDown={e => { if (e.key === 'Enter') sendToBackend(); }}
          />
          <button onClick={sendToBackend} className="random-move-button">
            Send
          </button>
          <button onClick={handleGiveUp} className="giveup-button" style={{ backgroundColor: 'orange', color: 'white', fontWeight: 'bold', padding: '0.5em 1em', border: 'none', borderRadius: '4px' }}>
            Give Up
          </button>
          <datalist id="pokemon-autocomplete">
            {autocompleteOptions.map((option, idx) => (
              <option key={idx} value={option} />
            ))}
          </datalist>
        </div>
        {status && <div className="random-move-status">{status}</div>}
      </div>
    </>
  )
 // ...existing code...
}

export default App

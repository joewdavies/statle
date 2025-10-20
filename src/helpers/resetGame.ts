import { GameStatus, MAX_GUESSES } from '../constants';
import { Country } from '../data/countries/countries';
import { getRandomCountry } from '../helpers/getRandomCountry';

type ResetArgs = {
  // state setters from App.tsx
  setCountry: (c: Country) => void;
  setGuesses: (g: string[]) => void;
  setGuessCount: (n: number) => void;
  setGameStatus: (s: GameStatus) => void;
  setInputValue?: (v: string) => void; // optional, if you control an input

  // config (optional)
  maxGuesses?: number;

  // if you seed elsewhere, you can pass your own RNG
  rng?: () => Country;
};

/**
 * Fast, no-reload reset. Keeps the app mounted and just swaps state + storage.
 */
export function resetGame({
  setCountry,
  setGuesses,
  setGuessCount,
  setGameStatus,
  setInputValue,
  maxGuesses = MAX_GUESSES,
  rng = getRandomCountry,
}: ResetArgs) {
  const next = rng();

  // 1) Update React state
  setCountry(next);
  setGuesses(Array(maxGuesses).fill(''));
  setGuessCount(0);
  setGameStatus(GameStatus.Playing);
  if (setInputValue) setInputValue('');

  // 2) Sync localStorage so a later refresh resumes correctly
  localStorage.setItem('country', next.code);
  localStorage.setItem('guesses', JSON.stringify(Array(maxGuesses).fill('')));
  localStorage.setItem('guessCount', JSON.stringify(0));
  localStorage.setItem('gameStatus', JSON.stringify(GameStatus.Playing));

  // 3) Optional: broadcast a custom event if other parts care
  dispatchEvent(new CustomEvent('statle:reset', { detail: { country: next.code } }));
}

/**
 * Legacy hard reset (kept in case you still want a full reload somewhere).
 */
export function hardResetGame() {
  localStorage.removeItem('country');
  localStorage.removeItem('guesses');
  localStorage.removeItem('guessCount');
  localStorage.removeItem('gameStatus');
  window.location.reload();
}

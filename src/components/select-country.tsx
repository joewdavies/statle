// src/components/select-country.tsx
import { ActionIcon, Autocomplete, Button, Flex, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDice5Filled, IconSearch } from '@tabler/icons-react';
import { useCallback, useEffect, useRef } from 'react';
import ConfettiExplosion from 'react-confetti-explosion';
import { GameStatus, MAX_GUESSES } from '../constants';
import { Country } from '../data/countries/countries';
import useFocusOnKey from '../hooks/useFocusOnKey';

type SelectCountryProps = {
  countries: Country[];
  country: Country;
  value: string;
  setValue: (value: string) => void;
  guesses: string[];
  setGuesses: (guesses: string[]) => void;
  guessCount: number;
  setGuessCount: (guessCount: number) => void;
  gameStatus: GameStatus;
  setGameStatus: (gameStatus: GameStatus) => void;
};

// Put these near the top of the file (outside the component)
const normalize = (s: string) =>
  s
    .normalize('NFD')                // split accents
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase();

// Optional: aliases you want matched by typing (doesn't change what’s displayed/selected)
const COUNTRY_ALIASES: Record<string, string[]> = {
  Türkiye: ['Turkey', 'Turkiye', 'Republic of Türkiye'],
  Czechia: ['Czech Republic', 'Cesko'],
  Slovakia: ['Slovak Republic'],
  // add more as you like…
};

export function SelectCountry({
  countries,
  country,
  value,
  setValue,
  guesses,
  setGuesses,
  guessCount,
  setGuessCount,
  gameStatus,
  setGameStatus,
}: SelectCountryProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const autoCompleteRef = useRef<HTMLInputElement>(null);

  const handleCountrySubmit = useCallback(() => {
    if (!value) {
      notifications.show({
        color: 'red',
        title: 'No country selected',
        message: 'Please select a country',
      });
      return;
    }
    if (!countries.map((c) => c.name).includes(value)) {
      notifications.show({
        color: 'red',
        title: 'Country not found',
        message: 'Please select a valid country',
      });
      return;
    }
    if (guesses.includes(value)) {
      notifications.show({
        color: 'red',
        title: 'Already guessed',
        message: 'Please select a different country',
      });
      return;
    }
    if (guessCount < MAX_GUESSES) {
      const newGuesses = [...guesses];
      newGuesses[guessCount] = value;
      setGuesses(newGuesses);
      setGuessCount(guessCount + 1);
      setValue('');
    }
    // this is a guess so we need to add minus one
    if (country.name === value) {
      setGameStatus(GameStatus.Won);
      sendGoatEvent(`won-${guessCount + 1}`);
      notifications.show({
        color: 'green',
        message: 'Nice job!',
        position: 'top-center',
      });
      return;
    }
    if (guessCount === MAX_GUESSES - 1) {
      setGameStatus(GameStatus.Lost);
      sendGoatEvent(`failed`);
      notifications.show({
        color: 'red',
        message: 'Game over, try again tomorrow!',
        position: 'top-center',
      });
    }
  }, [
    value,
    countries,
    guesses,
    guessCount,
    country,
    setGameStatus,
    setGuessCount,
    setValue,
    setGuesses,
  ]);

  useEffect(() => {
    const autoComplete = autoCompleteRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (countries.map((c) => c.name).includes(value)) {
          handleCountrySubmit();
        }
      }
    };

    autoComplete?.addEventListener('keydown', handleKeyDown);
    return () => {
      autoComplete?.removeEventListener('keydown', handleKeyDown);
    };
  }, [value, countries, autoCompleteRef, handleCountrySubmit]);

  useFocusOnKey('/', autoCompleteRef);

  function handleKeyboardOptionSubmit(newValue: string) {
    setValue(newValue);
  }

  function sendGoatEvent(path: string) {
    //@ts-ignore
    if (window.goatcounter?.count) {
      //@ts-ignore
      window.goatcounter.count({ path, event: true });
    }
  }

  const autoItems = countries.map((c) => {
    const aliases = COUNTRY_ALIASES[c.name] ?? [];
    return {
      value: c.name, // what gets inserted on select
      // a hidden searchable field with normalized name + aliases + code
      keywords: [c.name, ...aliases, c.code ?? ''].map(normalize).join(' '),
    };
  });

  // ---------- NEW: roll-the-dice helper ----------
  function pickRandomCountryName(): string | null {
    // prefer countries not already guessed
    const remaining = countries
      .map((c) => c.name)
      .filter((n) => !guesses.includes(n));
    if (remaining.length === 0) return null;
    const idx = Math.floor(Math.random() * remaining.length);
    return remaining[idx];
  }

  function handleRollClick() {
    const pick = pickRandomCountryName();
    if (!pick) {
      notifications.show({
        color: 'yellow',
        title: 'No countries left',
        message: 'You have guessed everything!',
      });
      return;
    }

    setValue(pick);

    // focus the autocomplete input so the user can submit quickly
    setTimeout(() => {
      autoCompleteRef.current?.focus();
      // place caret at end — some browsers set caret on focus automatically,
      // but this helps if using keyboard users
      const input = autoCompleteRef.current;
      if (input?.setSelectionRange) {
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }, 0);

    notifications.show({
      position: 'top-center',
      color: 'blue',
      title: 'You rolled the dice!',
      message: `selection set to: ${pick}`,
      autoClose: 1800,
    });

    sendGoatEvent('rolled-dice');

    // If you want the roll to auto-submit as a guess (Wordle-style),
    // uncomment the next line:
    // handleCountrySubmit();
  }
  // ---------- end roll-the-dice ----------

  return (
    <>
      {gameStatus === GameStatus.Won && <ConfettiExplosion />}
      <Flex gap={16} align={'center'} justify={'center'} direction={'row'} w={'100%'}>
        <Autocomplete
          data={autoItems}
          aria-label="Country"
          placeholder="Select country"
          radius="md"
          size="md"
          onOptionSubmit={handleKeyboardOptionSubmit}
          value={value}
          onChange={setValue}
          ref={autoCompleteRef}
          withScrollArea={false}
          styles={{ dropdown: { maxHeight: 200, overflowY: 'auto' } }}
          flex={2}
          inputSize="md"
          leftSection={<IconSearch size={18} />}
          // key bit: custom filter that is accent/alias aware
          filter={({ options, search, limit }) => {
            const q = normalize(search.trim());

            const filtered = options.filter((item: any) => {
              return normalize(item.value).includes(q) || (item.keywords && item.keywords.includes(q));
            });

            // Respect Mantine’s built-in limit behavior
            return filtered.slice(0, limit);
          }}
          // (Optional) show more hits
          limit={200}
        />

        {/* Submit + Roll buttons */}
        {/* icon-only Roll button */}
        <Tooltip label="Roll suggestion" withArrow openDelay={100}>
          <ActionIcon
            size="xl"
            variant="outline"
            onClick={handleRollClick}
            aria-label="Roll a country suggestion"
            title="Roll a country suggestion"
          >
            <IconDice5Filled size={'90%'} />
          </ActionIcon>
        </Tooltip>

        <Button size="md" ref={btnRef} onClick={handleCountrySubmit}>
          Submit
        </Button>
      </Flex>
    </>
  );
}

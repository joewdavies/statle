// src/components/select-country.tsx
import { ActionIcon, Autocomplete, Button, Flex, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDice5Filled, IconSearch } from '@tabler/icons-react';
import { useCallback, useEffect, useRef } from 'react';
import ConfettiExplosion from 'react-confetti-explosion';
import { GameStatus, MAX_GUESSES } from '../../constants';
import { Country } from '../../data/countries/countries';
import useFocusOnKey from '../../hooks/useFocusOnKey';
import { fuzzyCountryFilter } from './country-search-filter';
import { animateDiceRoll, cleanupDiceRollTimer, DICE_ANIMATION_DURATION } from './dice-button';

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
  const diceRef = useRef<HTMLButtonElement>(null);
  const flickIntervalRef = useRef<number | null>(null);
  const flickTimeoutRef = useRef<number | null>(null);

  const handleCountrySubmit = useCallback(() => {
    const trimmed = value.trim();
    const normalized = trimmed.toLowerCase();

    // find the country regardless of capitalization
    const match = countries.find(
      (c) => c.name.toLowerCase() === normalized
    );

    if (!trimmed) {
      notifications.show({
        color: "red",
        title: "No country selected",
        message: "Please select a country",
      });
      return;
    }

    if (!match) {
      notifications.show({
        color: "red",
        title: "Country not found",
        message: "Please select a valid country",
      });
      return;
    }

    const selectedName = match.name; // always the canonical name


    if (guesses.includes(selectedName)) {
      notifications.show({
        color: 'red',
        title: 'Already guessed',
        message: 'Please select a different country',
      });
      return;
    }
    if (guessCount < MAX_GUESSES) {
      const newGuesses = [...guesses];
      newGuesses[guessCount] = selectedName;
      setGuesses(newGuesses);
      setGuessCount(guessCount + 1);
      setValue('');
    }
    // this is a guess so we need to add minus one
    if (country.name === selectedName) {
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
        const trimmed = value.trim();
        const normalized = trimmed.toLowerCase();
        const match = countries.find((c) => c.name.toLowerCase() === normalized);
        if (match) {
          // set the value to canonical name (optional) then submit
          setValue(match.name);
          handleCountrySubmit();
        }
      }
    };

    autoComplete?.addEventListener('keydown', handleKeyDown);
    return () => {
      autoComplete?.removeEventListener('keydown', handleKeyDown);
    };
  }, [value, countries, autoCompleteRef, handleCountrySubmit, setValue]);


  useFocusOnKey('/', autoCompleteRef);

  function handleKeyboardOptionSubmit(newValue: string) {
    // newValue comes from an option (should already be the canonical name),
    // but trim just in case and set the canonical form from countries list.
    const trimmed = newValue.trim();
    const normalized = trimmed.toLowerCase();
    const match = countries.find((c) => c.name.toLowerCase() === normalized);
    setValue(match ? match.name : trimmed);
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

  // ---------- roll-the-dice helper ----------
  function pickRandomCountryName(): string | null {
    const remaining = countries
      .map((c) => c.name)
      .filter((n) => !guesses.includes(n));
    if (remaining.length === 0) return null;
    const idx = Math.floor(Math.random() * remaining.length);
    return remaining[idx];
  }

  function handleRollClick() {
    // If button already animating, do nothing
    if (diceRef.current?.dataset.rolling === "true") return;

    // trigger the visual roll animation you already have
    animateDiceRoll(diceRef.current);

    const remaining = countries
      .map((c) => c.name)
      .filter((n) => !guesses.includes(n));

    if (remaining.length === 0) {
      notifications.show({
        color: "yellow",
        title: "No countries left",
        message: "You have guessed everything!",
      });
      return;
    }

    // pick final result now (deterministic)
    const finalPick = pickRandomCountryName();
    if (!finalPick) return;

    // Respect reduced-motion: avoid flicking if user prefers reduced motion
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // clear any previous flicking
    if (flickIntervalRef.current) {
      window.clearInterval(flickIntervalRef.current);
      flickIntervalRef.current = null;
    }
    if (flickTimeoutRef.current) {
      window.clearTimeout(flickTimeoutRef.current);
      flickTimeoutRef.current = null;
    }

    if (!prefersReduced) {
      // Create a shuffled copy so flick looks random
      const shuffled = remaining.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const tickMs = 80; // speed of flicking; smaller = faster
      let pos = 0;

      flickIntervalRef.current = window.setInterval(() => {
        setValue(shuffled[pos % shuffled.length]);
        pos += 1;
      }, tickMs);

      // stop flicking after the dice animation duration (use the exported constant)
      flickTimeoutRef.current = window.setTimeout(() => {
        if (flickIntervalRef.current) {
          window.clearInterval(flickIntervalRef.current);
          flickIntervalRef.current = null;
        }

        // finalise selection and focus input (keeps previous behaviour)
        setValue(finalPick);

        setTimeout(() => {
          autoCompleteRef.current?.focus();
          const input = autoCompleteRef.current;
          if (input?.setSelectionRange) {
            const len = input.value.length;
            input.setSelectionRange(len, len);
          }
        }, 0);

        notifications.show({
          position: "top-center",
          color: "blue",
          title: "You rolled the dice!",
          message: `selection set to: ${finalPick}`,
          autoClose: 1800,
        });

        sendGoatEvent("rolled-dice");
      }, DICE_ANIMATION_DURATION);
    } else {
      // reduced-motion: just set final pick and focus
      setValue(finalPick);
      setTimeout(() => {
        autoCompleteRef.current?.focus();
        const input = autoCompleteRef.current;
        if (input?.setSelectionRange) {
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      }, 0);

      notifications.show({
        position: "top-center",
        color: "blue",
        title: "You rolled the dice!",
        message: `selection set to: ${finalPick}`,
        autoClose: 1800,
      });

      sendGoatEvent("rolled-dice");
    }
  }
  // ---------- end roll-the-dice ----------

  // CLEANUP
  useEffect(() => {
    return () => {
      if (flickIntervalRef.current) {
        window.clearInterval(flickIntervalRef.current);
        flickIntervalRef.current = null;
      }
      if (flickTimeoutRef.current) {
        window.clearTimeout(flickTimeoutRef.current);
        flickTimeoutRef.current = null;
      }
      // also clear any timer internal to the dice util (robustness)
      if (typeof cleanupDiceRollTimer === 'function') {
        cleanupDiceRollTimer();
      }
    };
  }, []);

  return (
    <>
      {gameStatus === GameStatus.Won && <ConfettiExplosion />}
      <Flex gap={10} align={'center'} justify={'center'} direction={'row'} w={'100%'}>
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
          filter={fuzzyCountryFilter}
          // (Optional) show more hits
          limit={200}
          rightSectionWidth={44}                       // reserve space for the dice icon
          rightSection={
            <Tooltip label="Roll suggestion" withArrow openDelay={100}>
              <ActionIcon
                size="lg"
                variant="outline"
                onClick={handleRollClick}
                ref={diceRef}
                aria-label="Roll a country suggestion"
                title="Roll a country suggestion"
                tabIndex={0}
                style={{
                  border: 'none'
                }}
                onMouseDown={(e) => e.preventDefault()} // prevent input blur on click
              >
                <span className="dice-button-inner" aria-hidden>
                  <span className="dice-wrapper" aria-hidden>
                    <IconDice5Filled size={'100%'} />
                  </span>
                  <span className="dice-shadow" aria-hidden />
                </span>
              </ActionIcon>
            </Tooltip>
          }
        />

        <Button size="md" ref={btnRef} onClick={handleCountrySubmit}>
          Guess
        </Button>
      </Flex>

    </>
  );
}

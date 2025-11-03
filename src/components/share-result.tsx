// src/components/share-result.tsx
import { useMemo, useState } from 'react';
import {
  Button,
  Tooltip,
  Modal,
  Textarea,
  CopyButton,
  Group,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconShare3, IconClipboard, IconCheck } from '@tabler/icons-react';
import { MAX_GUESSES } from '../constants';
import { useUserStats } from '../hooks/useUserStats';
import { countries } from '../data/countries/countries';

// Prebuild a quick lookup by ISO code
const countriesByCode: Record<string, any> = Object.fromEntries(
  countries.map((c: any) => [c.code?.toUpperCase?.() ?? '', c])
);

// ----------------------------- small utilities -----------------------------
function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function formatDateDot(d = new Date()) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

// Haversine distance in kilometers
function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371; // km
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);

  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

// ----------------------------- visuals -----------------------------
// Green (🟩) + white (⬜) 5-cell bar based on proximity %.
// Round to nearest 20% so users clearly see it's "out of 5".
function proximityBar5(proximityPct: number) {
  const p = clamp(proximityPct, 0, 100);
  const greens = Math.round(p / 20); // 0..5
  const whites = 5 - greens;
  return '🟩'.repeat(greens) + '⬜'.repeat(whites);
}

function resolveCountry(token?: string) {
  if (!token) return null;
  const code = token.toUpperCase?.();
  const name = token.toLowerCase?.();

  // Prefer a code match
  if (code && countriesByCode[code]) return countriesByCode[code];

  // Otherwise try by name (case-insensitive)
  const byName = countries.find(
    (c: any) => c.name?.toLowerCase?.() === name
  );
  return byName || null;
}

// ----------------------------- component -----------------------------
export function ShareResult() {
  const { userStats } = useUserStats(MAX_GUESSES);
  const last = userStats?.lastGame;

  const text = useMemo(() => {
    const date = formatDateDot(new Date());
    const triesStr = last
      ? `${Math.max(1, last.guessCount ?? 0)}/${MAX_GUESSES}`
      : `${MAX_GUESSES}/${MAX_GUESSES}`;

    const streak = userStats?.currentStreak ?? 0;

    // Attempt lines + best proximity tracking
    const attemptLines: string[] = [];
    let bestProximity = 0; // we take the MAX achieved

    if (last?.countryCode || last?.countryName) {
      const target =
        resolveCountry(last.countryCode) ||
        resolveCountry(last.countryName);

      if (target?.latitude != null && target?.longitude != null && Array.isArray(last.guesses)) {
        for (const g of last.guesses as string[]) {
          const guess = resolveCountry(g);
          if (guess?.latitude != null && guess?.longitude != null) {
            const km = haversineKm(
              { latitude: guess.latitude, longitude: guess.longitude },
              { latitude: target.latitude, longitude: target.longitude }
            );
            // Worldle-style proximity: 0 km -> 100%, ~20,000 km -> 0%
            const proximity = clamp(100 - (km / 20000) * 100, 0, 100);
            bestProximity = Math.max(bestProximity, proximity);

            const bar = proximityBar5(proximity); // 🟩 and ⬜ only
            attemptLines.push(bar);
          } else {
            // Unresolvable guess → show 0/5
            attemptLines.push('⬜⬜⬜⬜⬜');
          }
        }
      }

      // Ensure exactly N lines: if won, replace final attempt with full greens + 🎉
      if (last?.result === 'won' && attemptLines.length > 0) {
        attemptLines[attemptLines.length - 1] = '🟩🟩🟩🟩🟩🎉';
        bestProximity = 100; // explicit
      }
    }

    // Header % is best proximity; if won it's 100%
    const headerPct = last?.result === 'won' ? 100 : Math.round(bestProximity);

    const header = `Statle (${date}) ${triesStr} (${headerPct}%)`;
    const streakLine = `🔥 Current Win Streak: ${streak}`;
    const footer = `https://joewdavies.github.io/statle`;

    return [
      header,
      streakLine,
      ...attemptLines,
      '',
      footer,
    ].join('\n');
  }, [last, userStats]);

  const [modalOpen, setModalOpen] = useState(false);

  const showCopiedToast = () =>
    notifications.show({
      color: 'green',
      message: 'Copied results to clipboard!',
      position: 'top-center',
    });

  const share = async () => {
    // 1) Native Share if supported (mostly mobile)
    const canNativeShare =
      typeof navigator.share === 'function' &&
      /Mobi|Android|iPhone/i.test(navigator.userAgent);

    if (canNativeShare) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // continue to clipboard/modal
      }
    }

    // 2) Clipboard API on secure contexts
    const canClipboard =
      typeof navigator.clipboard?.writeText === 'function' &&
      window.isSecureContext;

    if (canClipboard) {
      try {
        await navigator.clipboard.writeText(text);
        showCopiedToast();
        return;
      } catch {
        // continue to modal
      }
    }

    // 3) Fallback: show modal with the text + explicit copy button
    setModalOpen(true);
  };

  return (
    <>
      <Tooltip label="Share or copy result" withArrow>
        <Button onClick={share} leftSection={<IconShare3 size={18} />}>
          Share
        </Button>
      </Tooltip>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Copy your result"
        size="md"
        centered
      >
        <Textarea
          value={text}
          readOnly
          autosize
          minRows={6}
          maxRows={12}
          styles={{ input: { fontFamily: 'monospace' } }}
        />
        <Group justify="space-between" mt="sm">
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Tip: Select and press Ctrl/Cmd+C if the Copy button doesn’t work.
          </div>
          <CopyButton value={text} timeout={1500}>
            {({ copied, copy }) => (
              <Button
                onClick={() => {
                  copy();
                  showCopiedToast();
                }}
                variant="light"
                leftSection={copied ? <IconCheck size={16} /> : <IconClipboard size={16} />}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
          </CopyButton>
        </Group>
      </Modal>
    </>
  );
}

export default ShareResult;

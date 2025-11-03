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
function formatDate(d = new Date()) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
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

// Bearing (degrees 0..360 from North) from point A to B
function bearingDeg(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const λ1 = toRad(a.longitude);
  const λ2 = toRad(b.longitude);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  const deg = (toDeg(θ) + 360) % 360;
  return deg;
}

// 8-wind arrow by bearing
function bearingToArrow(deg: number) {
  // N, NE, E, SE, S, SW, W, NW centered on 0/45/90...
  const dirs = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'] as const;
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
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
    const date = formatDate(new Date());
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
        const tLL = { latitude: target.latitude, longitude: target.longitude };

        last.guesses.forEach((g, i) => {
          const guess = resolveCountry(g);
          if (guess?.latitude != null && guess?.longitude != null) {
            const gLL = { latitude: guess.latitude, longitude: guess.longitude };
            const km = haversineKm(gLL, tLL);
            // 0 km -> 100%, ~20,000 km -> 0%
            const proximity = clamp(100 - (km / 20000) * 100, 0, 100);
            bestProximity = Math.max(bestProximity, proximity);

            // Build bar
            let line = proximityBar5(proximity); // 🟩 and ⬜ only

            // If this is the winning guess, replace with full greens + 🎉 (no arrow)
            const isLastGuess = i === last.guessCount - 1;
            if (last.result === 'won' && isLastGuess) {
              line = '🟩🟩🟩🟩🟩🎉';
            } else {
              // For incorrect guesses, append a direction arrow towards the target
              const deg = bearingDeg(gLL, tLL);
              const arrow = bearingToArrow(deg);
              line += arrow;
            }

            attemptLines.push(line);
          } else {
            // Unresolvable guess → show 0/5 with no arrow
            attemptLines.push('⬜⬜⬜⬜⬜');
          }
        });
      }
    }

    // Header % is best proximity; if won it's 100%
    const headerPct = last?.result === 'won' ? 100 : Math.round(bestProximity);

    const header = `[statle](https://joewdavies.github.io/statle) (${date}) ${triesStr} (${headerPct}%)`;
    const streakLine = `🔥 Current Win Streak: ${streak}`;
    // Markdown footer link instead of a raw URL

    return [
      header,
      streakLine,
      ...attemptLines,
      '',
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
          Share result
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



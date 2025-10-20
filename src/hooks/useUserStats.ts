import { useCallback, useEffect, useMemo, useState } from "react";
import { UserStatsService, GameResult } from "../services/userStats";

export function useUserStats(maxGuesses: number) {
  const [history, setHistory] = useState<GameResult[]>(() => UserStatsService.getAll());

  // keep in sync across tabs and local events
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("statleHistory")) {
        setHistory(UserStatsService.getAll());
      }
    };
    const onLocal = () => setHistory(UserStatsService.getAll());

    window.addEventListener("storage", onStorage);
    window.addEventListener("statle:stats-updated", onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("statle:stats-updated", onLocal);
    };
  }, []);

  const userStats = useMemo(
    () => UserStatsService.getUserStats(maxGuesses),
    [history, maxGuesses]
  );

  const refresh = useCallback(() => setHistory(UserStatsService.getAll()), []);

  const upsert = useCallback(
    (g: GameResult) => {
      UserStatsService.upsert(g);
      refresh();
      window.dispatchEvent(new Event("statle:stats-updated")); // 👈 notify others
    },
    [refresh]
  );

  const clear = useCallback(() => {
    UserStatsService.clear();
    refresh();
    window.dispatchEvent(new Event("statle:stats-updated")); // 👈 notify others
  }, [refresh]);

  return { history, userStats, upsert, clear, refresh };
}

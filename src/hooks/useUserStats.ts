import { useCallback, useEffect, useMemo, useState } from "react";
import { UserStatsService, GameResult } from "../services/userStats";

export function useUserStats(maxGuesses: number) {
  const [history, setHistory] = useState<GameResult[]>(() => UserStatsService.getAll());

  // keep in sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("statleHistory")) {
        setHistory(UserStatsService.getAll());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const userStats = useMemo(() => UserStatsService.getUserStats(maxGuesses), [history, maxGuesses]);

  const refresh = useCallback(() => setHistory(UserStatsService.getAll()), []);
  const upsert = useCallback((g: GameResult) => {
    UserStatsService.upsert(g);
    refresh();
  }, [refresh]);
  const clear = useCallback(() => {
    UserStatsService.clear();
    refresh();
  }, [refresh]);

  return { history, userStats, upsert, clear, refresh };
}

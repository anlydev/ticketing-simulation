import { createContext, useContext, useMemo, useState } from 'react';

const SimulationContext = createContext(null);

const initialStats = {
  startedAt: Date.now(),
  openTargetAt: null,
  openClickedAt: null,
  openReactionMs: null,
  clicks: [],
  errors: 0,
  seatFailures: 0,
  captchaAttempts: 0,
  captchaSuccess: 0,
  seatSelectedAt: null,
  crisisHandled: 0
};

export function SimulationProvider({ children }) {
  const [selectedPerformance, setSelectedPerformance] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [stats, setStats] = useState(initialStats);
  const [result, setResult] = useState(null);

  const resetSimulation = () => {
    setSelectedPerformance(null);
    setSelectedSeat(null);
    setResult(null);
    setStats({ ...initialStats, startedAt: Date.now(), clicks: [] });
  };

  const recordClick = () => {
    setStats((prev) => ({ ...prev, clicks: [...prev.clicks, Date.now()] }));
  };

  const recordOpenClick = (targetAt) => {
    const clickedAt = Date.now();
    setStats((prev) => ({
      ...prev,
      startedAt: clickedAt,
      openTargetAt: targetAt,
      openClickedAt: clickedAt,
      openReactionMs: Math.max(0, clickedAt - targetAt),
      clicks: [clickedAt]
    }));
    return Math.max(0, clickedAt - targetAt);
  };

  const patchStats = (patch) => {
    setStats((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  };

  const value = useMemo(
    () => ({
      selectedPerformance,
      setSelectedPerformance,
      selectedSeat,
      setSelectedSeat,
      stats,
      patchStats,
      recordClick,
      recordOpenClick,
      result,
      setResult,
      resetSimulation
    }),
    [selectedPerformance, selectedSeat, stats, result]
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  return useContext(SimulationContext);
}

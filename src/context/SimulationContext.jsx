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
  crisisHandled: 0,
  botMode: 'live',
  botSeatsSold: 0,
  botSeatsReleased: 0,
  botPressureEvents: 0
};

const initialMode = {
  type: null,
  missionZone: null,
  roomKey: null,
  participantName: null,
  participants: [],
  rankings: []
};

export function SimulationProvider({ children }) {
  const [selectedPerformance, setSelectedPerformance] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [stats, setStats] = useState(initialStats);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState(initialMode);

  const resetSimulation = () => {
    setSelectedPerformance(null);
    setSelectedSeat(null);
    setResult(null);
    setStats({ ...initialStats, startedAt: Date.now(), clicks: [] });
    setMode(initialMode);
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
      mode,
      setMode,
      resetSimulation
    }),
    [selectedPerformance, selectedSeat, stats, result, mode]
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  return useContext(SimulationContext);
}

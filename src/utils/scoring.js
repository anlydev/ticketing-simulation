export function buildResult({ stats, success, failureReason }) {
  const captchaRate = stats.captchaAttempts
    ? Math.round((stats.captchaSuccess / stats.captchaAttempts) * 100)
    : 0;
  const clickSpeed = stats.clicks.length > 1
    ? Math.round(
        stats.clicks.slice(1).reduce((sum, time, index) => sum + (time - stats.clicks[index]), 0) /
          (stats.clicks.length - 1)
      )
    : 0;
  const reactionScore = Math.max(0, 100 - stats.errors * 12 - stats.seatFailures * 10);
  const openReactionScore = stats.openReactionMs == null
    ? 0
    : Math.max(0, 100 - Math.floor(stats.openReactionMs / 18));
  const serverReactionScore = Math.min(100, reactionScore + (stats.crisisHandled ?? 0) * 4);
  const totalScore = Math.round((openReactionScore * 0.35) + (serverReactionScore * 0.35) + (captchaRate * 0.15) + (success ? 15 : 0));

  return {
    success,
    failureReason,
    openReactionMs: stats.openReactionMs,
    openReactionScore,
    averageClickSpeed: clickSpeed,
    seatSelectionTime: stats.seatSelectedAt && stats.startedAt
      ? Math.round((stats.seatSelectedAt - stats.startedAt) / 1000)
      : null,
    captchaRate,
    serverReactionScore,
    totalScore,
    totalErrors: stats.errors,
    seatFailures: stats.seatFailures,
    botMode: stats.botMode,
    botSeatsSold: stats.botSeatsSold ?? 0,
    botSeatsReleased: stats.botSeatsReleased ?? 0,
    botPressureEvents: stats.botPressureEvents ?? 0
  };
}

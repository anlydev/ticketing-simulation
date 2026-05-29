const zones = Array.from({ length: 56 }, (_, index) => index + 1);

function zoneSeatStats(seats, zone) {
  const zoneSeats = seats.filter((seat) => seat.zone === zone);
  const available = zoneSeats.filter((seat) => seat.status === 'available').length;
  return { total: zoneSeats.length, available };
}

export function ZoneOverview({ seats, selectedZone, missionZone, onSelectZone, compact = false }) {
  return (
    <div className={`${compact ? 'p-2' : 'mx-auto max-w-[760px] p-6'}`}>
      <div className={`${compact ? 'mb-2 h-5 text-xs' : 'mb-4 h-[50px] pt-3 text-xl font-bold'} bg-[#dddddd] text-center text-[#999]`}>
        STAGE
      </div>
      <div className="grid grid-cols-8 gap-2">
        {zones.map((zone) => {
          const stats = zoneSeatStats(seats, zone);
          const isMission = missionZone === zone;
          const isSelected = selectedZone === zone;
          return (
            <button
              key={zone}
              type="button"
              onClick={() => onSelectZone(zone)}
              className={[
                compact ? 'h-8 text-[10px]' : 'h-12 text-sm',
                'relative border font-black transition',
                isSelected ? 'border-[var(--melon)] bg-[#eafff0] text-[var(--melon)]' : 'border-white bg-[#d8d8d8] text-[#555] hover:bg-[#e76b9a] hover:text-white',
                isMission ? 'ring-2 ring-[#e76b9a]' : ''
              ].join(' ')}
              title={`${zone}구역 · 잔여 ${stats.available}/${stats.total}`}
            >
              {zone}
              {!compact && <span className="absolute bottom-1 right-1 text-[10px] font-bold opacity-70">{stats.available}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function groupSeats(seats) {
  return seats.reduce((map, seat) => {
    const row = seat.row ?? 1;
    if (!map.has(row)) map.set(row, []);
    map.get(row).push(seat);
    return map;
  }, new Map());
}

export default function SeatMap({ seats, selectedSeat, selectedZone, missionZone, onSelectZone, onBackToZones, onSelectSeat }) {
  if (!selectedZone) {
    return (
      <div className="relative min-h-[680px] bg-[#f5f5f5] p-6">
        <h2 className="mb-2 text-center text-2xl font-black">구역 선택</h2>
        <p className="mb-4 text-center text-[#777]">
          위쪽 왼쪽부터 1구역으로 시작합니다. 구역을 선택하면 해당 구역의 랜덤 좌석 배치가 열립니다.
        </p>
        {missionZone && <p className="mb-4 text-center font-bold text-[#e76b9a]">미션: {missionZone}구역 좌석 예매</p>}
        <ZoneOverview seats={seats} missionZone={missionZone} onSelectZone={onSelectZone} />
      </div>
    );
  }

  const zoneSeats = seats.filter((seat) => seat.zone === selectedZone);
  const rows = [...groupSeats(zoneSeats).entries()].sort(([a], [b]) => a - b);

  return (
    <div className="relative min-h-[680px] bg-[#f5f5f5] p-6">
      <div className="mx-auto mb-3 h-[50px] max-w-[608px] bg-[#c9c9c9] pt-3 text-center text-xl font-bold text-white">
        무대방향 (STAGE)
      </div>
      <p className="mb-2 text-center text-[#777]">
        현재 보고 계신 구역은 {selectedZone}구역입니다.
        {missionZone ? ` 미션 구역은 ${missionZone}구역입니다.` : ''}
      </p>
      <div className="mb-5 text-center">
        <button onClick={onBackToZones} className="border border-[#cccccc] bg-white px-4 py-2 text-sm font-bold text-[#555]">
          구역 전체보기
        </button>
      </div>

      <div className="mx-auto grid max-w-[760px] grid-cols-[44px_1fr] gap-x-4">
        <div className="space-y-[7px] pt-[2px] text-right text-[28px] leading-[30px] text-[#aaaaaa]">
          {rows.map(([row]) => (
            <div key={row}>{row}</div>
          ))}
        </div>
        <div className="space-y-[7px]">
          {rows.map(([row, rowSeats]) => (
            <div key={row} className="grid justify-center gap-[5px]" style={{ gridTemplateColumns: `repeat(${Math.max(...rowSeats.map((seat) => seat.col ?? 1))}, minmax(20px, 28px))` }}>
              {rowSeats
                .sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
                .map((seat) => {
                  const isSelected = selectedSeat?.id === seat.id;
                  const disabled = ['taken', 'sold'].includes(seat.status) || (seat.status === 'held' && !isSelected) || seat.gap;
                  const stateClass = seat.gap
                    ? 'opacity-0 pointer-events-none'
                    : disabled
                      ? 'bg-[#dcdcdc] text-transparent'
                      : isSelected
                        ? 'bg-[var(--melon)] text-white ring-2 ring-[#009b2f]'
                        : seat.status === 'held'
                          ? 'bg-[#b9ead0] text-transparent'
                          : 'bg-[#e76b9a] text-white hover:bg-[var(--melon)]';

                  return (
                    <button
                      key={seat.id}
                      disabled={disabled}
                      onClick={() => onSelectSeat(seat)}
                      className={`h-[28px] w-[28px] text-[10px] font-bold transition ${stateClass}`}
                      title={`${seat.id} ${seat.status}`}
                    >
                      {seat.number}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

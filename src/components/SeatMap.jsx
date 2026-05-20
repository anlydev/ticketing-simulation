const rows = Array.from({ length: 14 }, (_, index) => index + 1);

function rowSeats(seats, row) {
  const start = (row - 1) * 10;
  return seats.slice(start, start + 18);
}

export default function SeatMap({ seats, selectedSeat, onSelectSeat }) {
  return (
    <div className="relative h-full bg-[#f5f5f5] p-6">
      <div className="mx-auto mb-3 h-[50px] max-w-[608px] bg-[#c9c9c9] pt-3 text-center text-xl font-bold text-white">
        무대방향 (STAGE)
      </div>
      <p className="mb-2 text-center text-[#777]">현재 보고 계신 구역은 2층 33 구역입니다.</p>

      <div className="mx-auto grid max-w-[760px] grid-cols-[44px_1fr] gap-x-4">
        <div className="space-y-[7px] pt-[2px] text-right text-[28px] leading-[30px] text-[#aaaaaa]">
          {rows.map((row) => (
            <div key={row}>{row}</div>
          ))}
        </div>
        <div className="space-y-[7px]">
          {rows.map((row) => (
            <div key={row} className="seat-grid grid justify-center gap-[5px]">
              {rowSeats(seats, row).map((seat, index) => {
                const isSelected = selectedSeat?.id === seat.id;
                const disabled = ['taken', 'sold'].includes(seat.status);
                const gap = row < 4 && index > 3 && index < 8 ? 'opacity-0 pointer-events-none' : '';
                const stateClass = disabled
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
                    className={`h-[28px] w-[28px] text-[10px] font-bold transition ${gap} ${stateClass}`}
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

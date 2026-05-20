export const performances = [
  {
    id: 'phantom-night',
    title: '- The Trilogy I - 2026 SHINee WORLD VIII : [THE INVERT]',
    venue: 'KSPO DOME',
    date: '2026.05.30 (토) 17:00',
    poster:
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
    tags: ['단독판매', '인증예매', '청년패스'],
    difficulty: 94,
    price: '165,000원'
  },
  {
    id: 'blue-hour',
    title: 'BXB LAST FANMEETING',
    venue: '올림픽공원 올림픽홀',
    date: '2026.06.06 (토) 18:00',
    poster:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
    tags: ['팬클럽 선예매', '보안문자', '현장수령'],
    difficulty: 87,
    price: '88,000원'
  },
  {
    id: 'orchestra-zero',
    title: 'SEOUL JAZZ CLOCK 2026',
    venue: '예술의전당 콘서트홀',
    date: '2026.08.22 (토) 20:00',
    poster:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=900&q=80',
    tags: ['좌석전 빠름', '결제 제한', '모바일티켓'],
    difficulty: 76,
    price: '88,000원'
  }
];

export const randomEvents = [
  {
    type: 'server-lag',
    phase: ['seat', 'payment'],
    title: '서버 응답 지연',
    message: '요청이 몰려 버튼 반응이 2초 늦어집니다. 같은 좌석을 연타하지 말고 상태 표시를 확인하세요.',
    severity: 'warning',
    action: '침착 유지'
  },
  {
    type: 'server-crash',
    phase: ['payment'],
    title: '결제 직전 서버 오류',
    message: '결제창 호출 직전에 응답이 끊겼습니다. 창을 닫지 말고 같은 수단으로 한 번만 재시도하세요.',
    severity: 'danger',
    action: '한 번 재시도'
  },
  {
    type: 'retry-modal',
    phase: ['seat'],
    title: '잠시 후 다시 시도해주세요',
    message: '좌석 선택 요청이 겹쳤습니다. 새로고침보다 다른 좌석을 빠르게 고르는 편이 안전합니다.',
    severity: 'danger',
    action: '다른 좌석 탐색'
  },
  {
    type: 'seat-delay',
    phase: ['seat'],
    title: '좌석 반영 지연',
    message: '선택 좌석을 서버가 확인 중입니다. 3초 안에 결과가 없으면 주변 좌석을 준비하세요.',
    severity: 'warning',
    action: '대기 후 전환'
  },
  {
    type: 'seat-taken',
    phase: ['seat'],
    title: '이미 선택된 좌석입니다',
    message: 'AI 경쟁자가 먼저 좌석을 가져갔습니다.',
    severity: 'danger',
    action: '즉시 재선택'
  },
  {
    type: 'session-expired',
    phase: ['queue', 'payment'],
    title: '로그인 세션 만료',
    message: '결제 단계에서 세션 검증이 필요합니다. 모달을 닫고 결제 버튼을 다시 누르세요.',
    severity: 'danger',
    action: '세션 재확인'
  },
  {
    type: 'auto-refresh',
    phase: ['seat'],
    title: '예매창 자동 새로고침',
    message: '예매창이 자동 갱신되어 선택 좌석이 풀릴 수 있습니다. 새로고침 후 바로 좌석 상태를 다시 확인하세요.',
    severity: 'danger',
    action: '좌석 재확인'
  },
  {
    type: 'pay-error',
    phase: ['payment'],
    title: '간편결제 오류',
    message: '인증 앱 응답이 지연되었습니다. 카드 결제로 바꾸면 성공 확률이 높아집니다.',
    severity: 'danger',
    action: '결제수단 변경'
  },
  {
    type: 'browser-payment-blocked',
    phase: ['payment'],
    title: '브라우저 호환 문제',
    message: '현재 브라우저에서 결제 팝업이 차단된 것처럼 보입니다. 카드 결제 또는 다른 결제 수단으로 전환하세요.',
    severity: 'warning',
    action: '결제수단 전환'
  },
  {
    type: 'installment-delay',
    phase: ['payment'],
    title: '무이자 옵션 선택 지연',
    message: '카드 무이자 옵션을 고르는 동안 결제 시간이 빠르게 줄어듭니다. 기본 옵션으로 진행하는 훈련입니다.',
    severity: 'warning',
    action: '기본 옵션 유지'
  },
  {
    type: 'captcha-repeat',
    phase: ['seat', 'payment'],
    title: '보안문자 재입력 요청',
    message: '보안문자 인식 실패가 반복되는 상황입니다. 새 문자를 받고 침착하게 다시 입력하세요.',
    severity: 'warning',
    action: '새 보안문자'
  }
];

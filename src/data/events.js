export const localEvents = [
  {
    type: 'refresh-risk',
    title: '새로고침 위험',
    message: '지금 새로고침하면 대기번호가 초기화될 수 있습니다.',
    severity: 'warning'
  },
  {
    type: 'payment-timeout',
    title: '결제 제한 시간 임박',
    message: '남은 시간이 적습니다. 결제 수단 선택을 서두르세요.',
    severity: 'danger'
  }
];

const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createCaptcha(length = 6) {
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

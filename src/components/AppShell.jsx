import { Search, UserRound } from 'lucide-react';

const navItems = ['콘서트', '뮤지컬/연극', '팬클럽/팬미팅', '클래식', '전시/행사', '테마/지역', '랭킹', '티켓오픈소식', '이벤트'];

export default function AppShell({ children, compact = false, ticketWindow = false }) {
  if (ticketWindow) {
    return <main className="min-h-screen bg-[#eeeeee] text-[#222]">{children}</main>;
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-[#dcdcdc] bg-white">
        <div className="mx-auto flex max-w-[1260px] items-center gap-7 px-6 py-4">
          <div className="melon-logo shrink-0 text-4xl">Melon티켓</div>
          <label className="hidden h-12 max-w-[430px] flex-1 items-center rounded-full border-2 border-[var(--melon)] px-5 lg:flex">
            <input
              className="min-w-0 flex-1 outline-none"
              placeholder="서울재즈페스티벌, 타임테이블 공개!"
              readOnly
            />
            <Search size={27} className="text-[var(--melon)]" />
          </label>
          <div className="ml-auto hidden text-right text-sm text-[#777] md:block">
            <strong>LG아트센터 서울 기획공연</strong>
            <br />
            한 번에 모아보기!
          </div>
        </div>
        <nav className="border-t border-[#eeeeee]">
          <div className="mx-auto flex max-w-[1260px] items-center gap-2 overflow-x-auto px-6">
            {navItems.map((item) => (
              <span key={item} className="shrink-0 px-4 py-4 text-lg font-bold text-[#333]">
                {item}
              </span>
            ))}
            <span className="ml-auto flex shrink-0 items-center gap-1 px-4 py-4 font-bold text-[var(--melon)]">
              <UserRound size={20} />
              마이티켓
            </span>
          </div>
        </nav>
      </header>
      <section className={`mx-auto max-w-[1260px] px-6 ${compact ? 'py-5' : 'py-12'}`}>{children}</section>
    </main>
  );
}

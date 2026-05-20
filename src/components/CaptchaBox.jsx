import { RefreshCw, ShieldCheck } from 'lucide-react';

export default function CaptchaBox({ captcha, value, onChange, onRefresh, onSubmit, error }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-[#444]">
          <ShieldCheck size={16} className="text-[var(--melon)]" />
          보안문자 입력
        </p>
        <button onClick={onRefresh} className="rounded border border-[#dddddd] p-2 text-[#999] hover:text-[var(--melon)]" aria-label="보안문자 새로고침">
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="select-none border border-[#dddddd] bg-white px-4 py-4 text-center">
        <span className="captcha-text inline-block -rotate-3 text-4xl font-black italic text-black">
          {captcha}
        </span>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="min-w-0 flex-1 border border-[#dddddd] px-3 py-3 outline-none focus:border-[var(--melon)]"
          placeholder="대소문자 구분없이 문자입력"
        />
        <button onClick={onSubmit} className="bg-[var(--melon)] px-5 py-3 font-bold text-white">
          입력완료
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}

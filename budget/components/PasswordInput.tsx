"use client";

import { useState } from "react";

// 비밀번호 입력칸 + 눈 버튼 (누르면 입력한 글자를 보여줌)
export function PasswordInput({
  className,
  ref,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { ref?: React.Ref<HTMLInputElement> }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input ref={ref} {...props} type={visible ? "text" : "password"} className={`${className ?? ""} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-gray-400 hover:text-gray-600"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

const svg = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function EyeIcon() {
  return (
    <svg {...svg}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...svg}>
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.6M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.3" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </svg>
  );
}

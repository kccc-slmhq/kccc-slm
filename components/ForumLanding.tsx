"use client";

import { useState, useEffect } from "react";

export default function ForumLanding() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(160deg, #0c1445 0%, #1e3a8a 40%, #0284c7 75%, #e8f4ff 100%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          textAlign: "center",
          gap: "2rem",
        }}
      >
        {/* Badge */}
        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "9999px",
            padding: "0.4rem 1.2rem",
            color: "#e0f2fe",
            fontSize: "0.85rem",
            letterSpacing: "0.05em",
          }}
        >
          KCCC 교육간사 포럼
        </div>

        {/* Title */}
        <div>
          <h1
            style={{
              fontSize: "clamp(2rem, 7vw, 3.5rem)",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.2,
              marginBottom: "0.75rem",
              textShadow: "0 2px 16px rgba(0,0,0,0.3)",
            }}
          >
            교육간사 포럼
          </h1>
          <p
            style={{
              fontSize: "clamp(1rem, 3vw, 1.25rem)",
              color: "#bae6fd",
              fontWeight: 400,
              maxWidth: "28rem",
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            날짜 · 장소
          </p>
        </div>

        {/* CTA Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            width: "100%",
            maxWidth: "22rem",
          }}
        >
          <button
            style={{
              background: "linear-gradient(135deg, #0284c7, #0369a1)",
              color: "#ffffff",
              border: "none",
              borderRadius: "1rem",
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 24px rgba(2,132,199,0.4)",
              transition: "transform 0.1s, box-shadow 0.1s",
              letterSpacing: "0.02em",
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
            onTouchStart={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
            }}
            onTouchEnd={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            입장하기
          </button>

          <button
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#e0f2fe",
              border: "1.5px solid rgba(255,255,255,0.3)",
              borderRadius: "1rem",
              padding: "0.9rem 2rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "transform 0.1s",
              letterSpacing: "0.02em",
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
            onTouchStart={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
            }}
            onTouchEnd={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            자료 보기
          </button>
        </div>

        {/* Info cards */}
        {mounted && (
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: "0.5rem",
            }}
          >
            {[
              { label: "일시", value: "미정" },
              { label: "장소", value: "미정" },
              { label: "대상", value: "교육간사" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "0.75rem",
                  padding: "0.6rem 1rem",
                  minWidth: "5.5rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.7rem", color: "#93c5fd", marginBottom: "0.2rem" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#ffffff", fontWeight: 600 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom gradient fade */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "6rem",
          background: "linear-gradient(to top, rgba(232,244,255,0.15), transparent)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

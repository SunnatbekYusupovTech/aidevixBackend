"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useLang } from "@/context/LangContext";
import { useSound } from "@/context/SoundContext";

 const AI_TOOLS = [
      { name: "Claude Code",    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#191919"/><path d="M42.5 24.2c-1.1-2.3-3.1-3.7-5.5-3.7-2.9 0-5.1 2.1-5.1 5.3 0 .6.1 1.2.3 1.7-3.4-.6-6.2.8-7.5 3.3-1 2-1 4.4.1 6.3 1 1.8 2.8 2.9 4.9 3 1.6.1 3-.4 4.1-1.3.8 2.2 2.7 3.5 5.1 3.5 2.6 0 4.6-1.6 5.3-4.1.8.8 2 1.3 3.2 1.3 2.4 0 4.4-2 4.4-4.5 0-2.1-1.4-3.8-3.3-4.3.4-1.2.4-2.5-.2-3.7-1.1-2.1-3.6-3.3-6-2.9z" fill="#CC6B49"/></svg>` },
      { name: "OpenAI Codex",   svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#00A67E"/><path d="M44.7 27.2c.4-1.5.2-3.1-.6-4.4-1.2-2-3.4-3-5.6-2.6-.7-1.4-1.9-2.5-3.4-3.1-2.2-.9-4.7-.4-6.3 1.2-1.3-.6-2.9-.7-4.2-.1-2.1 1-3.4 3.1-3.3 5.4-1.4.5-2.5 1.6-3.1 3.1-1 2.2-.5 4.7 1.1 6.3-.4 1.5-.2 3.1.6 4.4 1.2 2 3.4 3 5.6 2.6.7 1.4 1.9 2.5 3.4 3.1 1 .4 2 .6 3.1.6 1.2 0 2.4-.4 3.3-1.1 1.3.6 2.9.7 4.2.1 2.1-1 3.4-3.1 3.3-5.4 1.4-.5 2.5-1.6 3.1-3.1 1-2.2.5-4.7-1.2-6.3zm-16.1 11l-3.8-2.2 3.8-6.6 3.8 2.2v4.4l-3.8 2.2zm1.7-10.4l3.8-2.2 3.8 2.2v4.4l-3.8 2.2-3.8-2.2v-4.4zm9 8.2l-3.8-2.2v-4.4l3.8-2.2 3.8 2.2v4.4l-3.8 2.2zm-12.8-13l3.8 2.2v4.4l-3.8 2.2-3.8-2.2v-4.4l3.8-2.2zm-3.8 13v-4.4l3.8-2.2 3.8 2.2v4.4l-3.8 2.2-3.8-2.2zm12.8 4.4l-3.8-2.2 3.8-6.6 3.8 2.2v4.4l-3.8 2.2z" fill="white"/></svg>` },
      { name: "Gemini CLI",     svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#131314"/><path d="M32 12c.5 6.8 5.2 12.3 11.7 13.7 2 .4 4.3.4 6.3 0-6.5 1.4-11.2 6.9-11.7 13.7-.5-6.8-5.2-12.3-11.7-13.7-2-.4-4.3-.4-6.3 0 6.5-1.4 11.2-6.9 11.7-13.7z" fill="url(#g1)"/><defs><linearGradient id="g1" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#4285F4"/><stop offset="50%" stop-color="#9B51E0"/><stop offset="100%" stop-color="#EA4335"/></linearGradient></defs></svg>` },
      { name: "GitHub Copilot", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0D1117"/><path d="M32 14c-9.9 0-18 8.1-18 18 0 7.9 5.1 14.7 12.2 17.1.9.2 1.2-.4 1.2-.9v-3.1c-5 1.1-6.1-2.4-6.1-2.4-.8-2.1-2-2.7-2-2.7-1.6-1.1.1-1.1.1-1.1 1.8.1 2.8 1.9 2.8 1.9 1.6 2.8 4.2 2 5.2 1.5.2-1.2.7-2 1.2-2.5-4-.5-8.2-2-8.2-9 0-2 1.4-3.6 2.1-4.7-.3-.5-.9-2.4.2-4.7 0 0 1.5-.5 5 1.9 1.5-.4 3-.6 4.5-.6s3 .2 4.5.6c3.5-2.4 5-1.9 5-1.9 1.1 2.3.4 4.2.2 4.7.8 1.1 2.1 2.7 2.1 4.7 0 7-4.2 8.5-8.2 9 .7.6 1.3 1.7 1.3 3.5V48.2c0 .5.3 1.1 1.3.9C46.9 46.7 52 39.9 52 32c0-9.9-8.1-18-18-18z" fill="#8957E5"/></svg>` },
      { name: "OpenCode",       svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#24292E"/><path d="M23 22L13 32l10 10M41 22l10 10-10 10M35 16l-6 32" stroke="#40C463" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
      { name: "Qwen Code",      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#615CED"/><path d="M18 32c0-7.7 6.3-14 14-14s14 6.3 14 14-6.3 14-14 14" stroke="white" stroke-width="5.5" stroke-linecap="round"/><circle cx="32" cy="32" r="4" fill="white"/></svg>` },
      { name: "Cursor",         svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0B0B0B"/><path d="M20 18l26 12.5L33.5 33.5 30.5 46z" fill="url(#cg)" stroke="#38BDF8" stroke-width="1.5" stroke-linejoin="round"/><defs><linearGradient id="cg" x1="20" y1="18" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#00E5FF"/><stop offset="100%" stop-color="#0066FF"/></linearGradient></defs></svg>` },
      { name: "Codebuff",       svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#050B14"/><path d="M32 14l16.5 9.5v19L32 52 15.5 42.5v-19L32 14z" stroke="#00F2FE" stroke-width="3" stroke-linejoin="round"/><path d="M25 27.5L32 23.5l7 4v9l-7 4-7-4v-9z" fill="#00F2FE"/></svg>` },
      { name: "Aider",          svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1F2937"/><circle cx="32" cy="32" r="18" stroke="#EF4444" stroke-width="7"/><path d="M21.5 21.5l21 21M42.5 21.5l-21 21" stroke="white" stroke-width="3.5" stroke-linecap="round"/></svg>` },
      { name: "Continue",       svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#18181B"/><path d="M18 20h18l12 12-12 12H18l12-12-12-12z" fill="url(#contg)"/><defs><linearGradient id="contg" x1="18" y1="32" x2="48" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#10B981"/><stop offset="100%" stop-color="#06B6D4"/></linearGradient></defs></svg>` },
      { name: "Cline",          svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0D0E12"/><path d="M18 18h28v6H18zM18 28h28v6H18zM18 38h18v6H18z" fill="#22C55E"/><circle cx="43" cy="41" r="3" fill="#22C55E"/></svg>` },
      { name: "Windsurf",       svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0A0915"/><path d="M16 44C24 26 34 22 42 34s10 14 10-10" stroke="url(#wsg)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><defs><linearGradient id="wsg" x1="16" y1="44" x2="52" y2="24" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#EC4899"/><stop offset="50%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#3B82F6"/></linearGradient></defs></svg>` },
      { name: "Bolt.new",       svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#020617"/><polygon points="38,12 18,36 30,36 24,54 46,28 32,28" fill="url(#blg)"/><defs><linearGradient id="blg" x1="18" y1="12" x2="46" y2="54" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#60A5FA"/><stop offset="100%" stop-color="#3B82F6"/></linearGradient></defs></svg>` },
      { name: "Freebuff",       svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1E293B"/><path d="M32 14L48 20v14c0 9.5-6.8 14.5-16 16.5-9.2-2-16-7-16-16.5V20l16-6z" fill="#3B82F6" opacity="0.2"/><path d="M32 14L48 20v14c0 9.5-6.8 14.5-16 16.5-9.2-2-16-7-16-16.5V20l16-6z" stroke="#3B82F6" stroke-width="3" stroke-linejoin="round"/><path d="M25 32l5 5 10-10" stroke="#3B82F6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
    ];

export default function StartNow() {
  const { t } = useLang();
  const { playHoverSound } = useSound();

  const heroRef = useRef<HTMLElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<SVGSVGElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const orbitWrap = orbitRef.current;
    const guideRing = guideRef.current;
    const coverBottom = coverRef.current;

    if (!hero || !orbitWrap || !guideRing || !coverBottom) return;

    const cards = Array.from(
      orbitWrap.querySelectorAll<HTMLElement>(".tool-card")
    );

    const DEG_STEP = 360 / cards.length;
    let radius = 300;

    const layout = () => {
      const W = hero.clientWidth;
      const H = hero.clientHeight;

      radius = Math.min(W / 2, H / 2) * 0.72;
      radius = Math.max(180, Math.min(radius, 360));

      const D = radius * 2 + 8;

      guideRing.setAttribute("width", String(D));
      guideRing.setAttribute("height", String(D));
      guideRing.setAttribute("viewBox", `0 0 ${D} ${D}`);

      guideRing.style.marginLeft = `${-D / 2}px`;
      guideRing.style.marginTop = `${-D / 2}px`;

      guideRing.innerHTML = `
        <circle
          cx="${D / 2}"
          cy="${D / 2}"
          r="${radius}"
          fill="none"
          stroke="rgba(99,102,241,0.1)"
          stroke-width="1"
          stroke-dasharray="3 7"
        />
      `;

      coverBottom.style.height = `${H / 2 + 10}px`;

      cards.forEach((card, i) => {
        const angleDeg = i * DEG_STEP - 90;
        const angleRad = (angleDeg * Math.PI) / 180;

        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        card.style.left = `${x}px`;
        card.style.top = `${y}px`;
      });
    };

    layout();

    const resizeObserver = new ResizeObserver(layout);
    resizeObserver.observe(hero);

   let targetRot = 0;
    let currentRot = 0;
    let rafId: number | null = null;

    // SENSITIVITY SOZLAMALARI:
    const EASE = 0.08;        // Oldingi 0.055 dan oshirildi (tezroq yetib oladi, tormozlanish kamayadi)
    const SCROLL_MUL = 0.45;  // Oldingi 0.12 dan deyarli 4 barobar oshirildi (kamroq skrolda ko'proq aylanadi)

    const handleScroll = () => {
      targetRot = window.scrollY * SCROLL_MUL;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    const tick = () => {
      const delta = targetRot - currentRot;

      if (Math.abs(delta) > 0.01) {
        currentRot += delta * EASE;
      } else {
        currentRot = targetRot;
      }

      orbitWrap.style.transform = `rotate(${currentRot}deg)`;

      cards.forEach((card) => {
        card.style.transform = `translate(-50%, -50%) rotate(${-currentRot}deg)`;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);

      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <section ref={heroRef} className="hero-section">
      <svg ref={guideRef} className="guide-ring" />

      <div ref={orbitRef} className="orbit-wrap">
        {AI_TOOLS.map((tool) => (
          <div key={tool.name} className="tool-card">
            <div
              className="tool-icon"
              dangerouslySetInnerHTML={{ __html: tool.svg }}
            />
            <span className="tool-name">{tool.name}</span>
          </div>
        ))}
      </div>

      <div className="cover-mask" />
      <div ref={coverRef} className="cover-bottom" />

      <div className="hero-text">
        <div className="hero-eyebrow">
          {t('home.startNow')}
        </div>

        {/* SEO: sahifada bitta <h1> bo'lishi kerak — asosiy hero HomeClient'da.
            Bu pastki CTA bo'limi, shuning uchun <h2>. CSS class-based, ko'rinish o'zgarmaydi. */}
        <h2 className="hero-title">
          {t('cta.title1')}
          <br />
          <em>{t('cta.titleHighlight')}</em>
        </h2>

        <p className="hero-body">
          {t('home.ctaSubtitle')}
        </p>

        <div className="hero-actions">
          <Link 
            href="/register" 
            onMouseEnter={playHoverSound} 
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
          >
            {t('cta.start')}
          </Link>

          <Link 
            href="#how-it-works" 
            className="btn btn-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
          >
            {/* Agar "See how it works" uchun tarjima bo'lsa t('home.howItWorks') qo'ying, bo'lmasa inglizchasi qoladi */}
            See how it works 
          </Link>
        </div>
      </div>

      <style jsx>{`
        .hero-section {
          position: relative;
          width: 100%;
          height: 100vh;
          min-height: 700px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #09090b;
        }

        .orbit-wrap {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          transform-origin: 0 0;
        }

        .guide-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          pointer-events: none;
        }

        .tool-card {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .tool-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          overflow: hidden;
          filter: grayscale(1) brightness(0.55);
          transition: 0.3s;
        }

        .tool-card:hover .tool-icon {
          filter: grayscale(0) brightness(1);
          transform: translateY(-5px);
        }

        .tool-name {
          font-size: 11px;
          color: #52525b;
          white-space: nowrap;
        }

        .cover-mask {
          position: absolute;
          inset: 0;
          z-index: 10;
          background: radial-gradient(
            ellipse 80% 80% at 50% 50%,
            transparent 52%,
            #09090b 78%
          );
        }

        .cover-bottom {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 11;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            #09090b 28%,
            #09090b 100%
          );
        }

        .hero-text {
          position: relative;
          z-index: 20;
          max-width: 650px;
          text-align: center;
          padding: 0 24px;
        }

        .hero-eyebrow {
          display: inline-block;
          margin-bottom: 20px;
          padding: 5px 14px;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.12);
          color: #6366f1;
          font-size: 11px;
          letter-spacing: 0.14em;
        }

        .hero-title {
          font-size: clamp(3rem, 7vw, 5rem);
          line-height: 1.05;
          font-weight: 700;
          color: white;
        }

        .hero-title em {
          color: #6366f1;
          font-style: normal;
        }

        .hero-body {
          margin-top: 24px;
          color: #a1a1aa;
          line-height: 1.8;
        }

        .hero-actions {
          margin-top: 32px;
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn {
          border: none;
          border-radius: 10px;
          padding: 12px 24px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
          transition: background 0.2s;
        }

        .btn-primary:hover {
          background: #4f46e5;
        }

        .btn-ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #a1a1aa;
          transition: all 0.2s;
        }

        .btn-ghost:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }
      `}</style>    
    </section>
  );
}
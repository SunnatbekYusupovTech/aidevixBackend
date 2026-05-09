'use client';

/**
 * Three.js variant olib tashlandi (~3MB bundle). Endi sof CSS animatsiya
 * — radial gradient pulslari + blur'langan blob-lar. `prefers-reduced-motion`
 * bilan animatsiya o'chiriladi.
 */
export default function ThreeHero({ isDark }: { isDark: boolean }) {
  const blobOne = isDark ? 'rgba(99,102,241,0.55)' : 'rgba(79,70,229,0.45)';
  const blobTwo = isDark ? 'rgba(168,85,247,0.45)' : 'rgba(139,92,246,0.35)';
  const blobThree = isDark ? 'rgba(6,182,212,0.40)' : 'rgba(8,145,178,0.30)';

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-70 motion-reduce:animate-none"
    >
      <div
        className="absolute -top-32 -left-24 h-[55%] w-[55%] rounded-full blur-3xl animate-blob-slow"
        style={{ background: `radial-gradient(circle at 30% 30%, ${blobOne}, transparent 70%)` }}
      />
      <div
        className="absolute top-1/3 -right-24 h-[55%] w-[55%] rounded-full blur-3xl animate-blob-slow [animation-delay:-6s]"
        style={{ background: `radial-gradient(circle at 70% 30%, ${blobTwo}, transparent 70%)` }}
      />
      <div
        className="absolute -bottom-24 left-1/4 h-[50%] w-[50%] rounded-full blur-3xl animate-blob-slow [animation-delay:-12s]"
        style={{ background: `radial-gradient(circle at 50% 50%, ${blobThree}, transparent 70%)` }}
      />
      <div
        className="absolute inset-0 mix-blend-overlay opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, transparent 0, transparent 60%, rgba(0,0,0,0.4) 100%)`,
        }}
      />
    </div>
  );
}

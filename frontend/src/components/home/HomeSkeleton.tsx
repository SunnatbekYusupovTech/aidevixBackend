import React from 'react';
import Skeleton from '@/components/common/Skeleton';

export default function HomeSkeleton() {
  return (
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-clip bg-[#0A0E1A] px-3 pt-20 pb-16 sm:px-4 sm:pt-24 sm:pb-20">
      <div className="mx-auto max-w-7xl">
        {/* Header/Hero Skeleton */}
        <div className="mb-20 space-y-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-20 w-3/4 md:h-32" />
          <Skeleton className="h-8 w-1/2" />
          <div className="flex gap-4 pt-6">
            <Skeleton className="h-14 w-44 rounded-full" />
            <Skeleton className="h-14 w-44 rounded-full" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="mb-24 grid grid-cols-2 gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-[2.5rem] bg-white/[0.02] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] p-8">
              <Skeleton className="mb-4 h-4 w-20" />
              <Skeleton className="h-12 w-32" />
              <Skeleton className="mt-4 h-4 w-24" />
            </div>
          ))}
        </div>

        {/* Course Cards Grid Skeleton */}
        <div className="mb-20">
          <div className="mb-10 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-72" />
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-[2.5rem] bg-[#111726] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] p-2">
                <Skeleton className="aspect-video w-full rounded-[2rem]" />
                <div className="p-6 space-y-4">
                   <div className="flex gap-2">
                     <Skeleton className="h-5 w-20 rounded-full" />
                     <Skeleton className="h-5 w-20 rounded-full" />
                   </div>
                   <Skeleton className="h-6 w-full" />
                   <Skeleton className="h-6 w-3/4" />
                   <div className="flex items-center gap-2 pt-2">
                     <Skeleton className="h-8 w-8 rounded-full" />
                     <Skeleton className="h-3 w-32" />
                   </div>
                   <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-5">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-24" />
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

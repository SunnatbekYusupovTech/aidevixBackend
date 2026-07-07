import React from 'react';
import Skeleton from '@/components/common/Skeleton';

export default function VideoCardSkeleton() {
  return (
    <div className="flex w-full items-start gap-4 rounded-[1.5rem] border border-white/8 bg-[#111726] p-3.5">
      <Skeleton className="h-20 w-20 flex-shrink-0 rounded-[1rem]" />
      
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-4 w-8 ml-auto rounded-full" />
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import Skeleton from '@/components/common/Skeleton';

export default function CourseCardSkeleton() {
  return (
    <div className="block overflow-hidden rounded-[2rem] bg-[#111726] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-500">
      {/* Thumbnail Skeleton */}
      <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: 'var(--course-thumbnail-bg, #0f1115)' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="w-32 h-32 sm:w-36 sm:h-36 rounded-full" />
        </div>
      </div>
      
      {/* Body Skeleton */}
      <div className="flex h-auto flex-col justify-between p-4 sm:p-5 md:p-6">
        <div className="space-y-3">
          {/* Lessons badge skeleton */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          {/* Title skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>

          {/* Rating Row skeleton */}
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12" />
          </div>

          {/* Orange Divider skeleton */}
          <Skeleton className="h-[3px] w-full rounded-full" />

          {/* Bottom Row skeleton */}
          <div className="flex items-center justify-between pt-1">
            {/* Instructor */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full sm:h-7 sm:w-7" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-12" />
              </div>
            </div>

            {/* Ko'rish button skeleton */}
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

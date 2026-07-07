import Link from 'next/link';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { IoPlay, IoTime, IoEye, IoLockClosed, IoStar } from 'react-icons/io5';
import { selectIsLoggedIn } from '@/store/slices/authSlice';
import { selectAllVerified } from '@/store/slices/subscriptionSlice';
import { useLang } from '@/context/LangContext';
import { formatDurationText } from '@/utils/formatDuration';
import { ROUTES } from '@/utils/constants';

interface VideoProps {
  video: {
    _id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    duration?: number;
    viewCount?: number;
    rating?: number | { average: number; count: number };
  };
  index?: number;
}

export default function VideoCard({ video, index = 0 }: VideoProps) {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const allVerified = useSelector(selectAllVerified);
  const { t } = useLang();

  // canWatch logic: for now let's assume we need to be logged in and verified
  // but some might be free. If video has isFree, we should check that.
  const canWatch = isLoggedIn && allVerified;

  if (!video) return null;

  const rating = typeof video.rating === 'object' ? video.rating?.average : video.rating;

  return (
    <Link
      href={ROUTES.VIDEO(video._id)}
      className="group flex w-full items-start gap-4 rounded-none border border-slate-800 bg-[#111726] p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-platinum-500/20 hover:bg-[#161D31]"
    >
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-none border border-slate-800 bg-white/5">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-indigo-500/10">
            <span className="text-xl font-black text-indigo-300 opacity-50">
              {(index + 1).toString().padStart(2, '0')}
            </span>
          </div>
        )}

        {!canWatch ? (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
            <IoLockClosed className="text-yellow-500 text-xl" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-platinum-500/15 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-8 w-8 scale-90 items-center justify-center rounded-none bg-platinum-600 shadow-lg shadow-platinum-600/45 transition-transform group-hover:scale-100">
              <IoPlay className="text-white text-xs ml-0.5" />
            </div>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold tracking-[-0.02em] text-slate-200 transition-colors group-hover:text-indigo-300">
            {video.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
            {video.description || t('videos.noDesc')}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="flex items-center gap-1 rounded-none bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-400">
            <IoTime className="text-slate-600" />
            {formatDurationText(video.duration || 0)}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
            <IoEye className="text-slate-600" />
            {video.viewCount || 0}
          </span>
          {rating && rating > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-platinum-400 ml-auto">
              <IoStar />
              {Number(rating).toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

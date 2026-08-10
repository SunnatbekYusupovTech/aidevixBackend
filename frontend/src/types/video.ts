export interface Video {
  _id: string;
  title: string;
  description: string;
  duration: number;
  order: number;
  thumbnail: string;
  materials: { name: string; url: string }[];
  viewCount: number;
  course?: {
    _id: string;
    title: string;
    category?: string;
  };
  views?: number;
}

/** mkhls transcode holati. Backend har bir `GET /videos/:id` javobida qaytaradi. */
export type StreamStatus = 'pending' | 'processing' | 'ready' | 'failed';

/**
 * Video tayyor bo'lgandagina keladi. `hlsUrl` ichida qisqa muddatli stream
 * token bor; mkhls playlist'ni qayta yozib, tokenni segmentlarga ham
 * tarqatadi, shuning uchun uni player'ga o'zgarishsiz berish yetarli.
 */
export interface Player {
  type: 'hls';
  hlsUrl: string;
  expiresAt: string;
}

export interface Progress {
  lastPositionSeconds: number;
}

export interface VideoResponse {
  success: boolean;
  data: {
    video: Video;
    player: Player | null;
    progress: Progress | null;
    streamStatus: StreamStatus;
  };
}

import api from './axiosInstance';

// Maxfiy metodika API'si. Javoblar ATAYLAB Redux/localStorage'ga yozilmaydi —
// faqat komponent state'ida turadi va sahifa yopilganda yo'qoladi.

export type DiagramType = 'flow' | 'cycle' | 'compare' | 'layers' | 'cards';

export interface MetodikaDiagram {
  _id?: string;
  type: DiagramType;
  title: string;
  caption: string;
  leftTitle: string;
  rightTitle: string;
  items: { label: string; text: string }[];
}

export interface MetodikaLink { _id?: string; title: string; url: string; note: string }
export interface MetodikaImage { _id: string; asset: string; caption: string }
export interface MetodikaTimelineRow { time: string; title: string; details: string }

export interface MetodikaLessonSummary {
  _id: string;
  module: string;
  number: number;
  title: string;
  week: number;
  durationMinutes: number;
  outcome?: string;
  isPublished: boolean;
}

export interface MetodikaLesson extends Omit<MetodikaLessonSummary, 'module'> {
  module: { _id: string; title: string; weeks?: string } | string;
  goal: string;
  description: string;
  why: string;
  relation: string;
  mentorPrep: string[];
  timeline: MetodikaTimelineRow[];
  keyPoints: string[];
  demo: string[];
  practice: string[];
  template?: { title: string; body: string };
  mistakes: string[];
  homeworkRequired: string[];
  homeworkOptional: string[];
  decision: string;
  links: MetodikaLink[];
  images: MetodikaImage[];
  diagrams: MetodikaDiagram[];
}

export interface MetodikaModule {
  _id: string;
  title: string;
  subtitle: string;
  summary: string;
  outcome: string;
  weeks: string;
  order: number;
  isPublished: boolean;
  lessons: MetodikaLessonSummary[];
}

export type SectionType = 'text' | 'list' | 'table' | 'note' | 'code';
export interface MetodikaSection { _id?: string; heading: string; type: SectionType; body: string }
export interface MetodikaPage {
  _id: string;
  title: string;
  order: number;
  isPublished: boolean;
  sections: MetodikaSection[];
}

export interface MetodikaOutline {
  modules: MetodikaModule[];
  pages: Pick<MetodikaPage, '_id' | 'title' | 'order' | 'isPublished'>[];
  totals: { lessons: number; minutes: number };
}

export interface MetodikaSession {
  isOwner: boolean;
  unlocked: boolean;
  expiresAt: string | null;
  viewer: { id: string; username: string; name: string };
}

export interface MetodikaAccessRow {
  _id: string;
  user: { _id: string; username: string; email: string; firstName?: string; lastName?: string } | null;
  login: string;
  isActive: boolean;
  expiresAt: string | null;
  note: string;
  lastLoginAt: string | null;
  lastIp: string | null;
  lockUntil: string | null;
  createdAt: string;
  password?: string;
}

export interface MetodikaAuditRow {
  _id: string;
  user: { _id: string; username: string; email: string } | null;
  action: string;
  target: string;
  ip: string | null;
  ua: string | null;
  createdAt: string;
}

type Wrapped<T> = { success: boolean; data: T };
const unwrap = <T,>(p: Promise<{ data: Wrapped<T> }>): Promise<T> => p.then((r) => r.data.data);

export const metodikaApi = {
  session: () => unwrap<MetodikaSession>(api.get('metodika/session')),
  unlock: (login: string, password: string) => api.post('metodika/unlock', { login, password }),
  lock: () => api.post('metodika/lock'),
  outline: () => unwrap<MetodikaOutline>(api.get('metodika/outline')),
  lesson: (id: string) => unwrap<MetodikaLesson>(api.get(`metodika/lessons/${id}`)),
  page: (id: string) => unwrap<MetodikaPage>(api.get(`metodika/pages/${id}`)),
  asset: (id: string) => api.get<Blob>(`metodika/assets/${id}`, { responseType: 'blob' }).then((r) => r.data),
  event: (type: 'devtools' | 'copy' | 'print' | 'screenshot_key' | 'contextmenu', target = '') =>
    api.post('metodika/events', { type, target }).catch(() => undefined),
};

export const metodikaAdminApi = {
  createModule: (body: Partial<MetodikaModule>) => unwrap<MetodikaModule>(api.post('metodika/admin/modules', body)),
  updateModule: (id: string, body: Partial<MetodikaModule>) => unwrap<MetodikaModule>(api.patch(`metodika/admin/modules/${id}`, body)),
  deleteModule: (id: string) => api.delete(`metodika/admin/modules/${id}`),

  createLesson: (body: Record<string, unknown>) => unwrap<MetodikaLesson>(api.post('metodika/admin/lessons', body)),
  updateLesson: (id: string, body: Record<string, unknown>) => unwrap<MetodikaLesson>(api.patch(`metodika/admin/lessons/${id}`, body)),
  deleteLesson: (id: string) => api.delete(`metodika/admin/lessons/${id}`),
  // Bittalab yuklanadi: Next proxy katta multipart tanani kesib qo'ymasligi uchun.
  uploadImage: (lessonId: string, file: File, caption = '') => {
    const form = new FormData();
    form.append('images', file);
    form.append('caption', caption);
    return unwrap<MetodikaImage[]>(api.post(`metodika/admin/lessons/${lessonId}/images`, form, { timeout: 60000 }));
  },
  deleteImage: (lessonId: string, imageId: string) =>
    unwrap<MetodikaImage[]>(api.delete(`metodika/admin/lessons/${lessonId}/images/${imageId}`)),

  createPage: (body: Partial<MetodikaPage>) => unwrap<MetodikaPage>(api.post('metodika/admin/pages', body)),
  updatePage: (id: string, body: Partial<MetodikaPage>) => unwrap<MetodikaPage>(api.patch(`metodika/admin/pages/${id}`, body)),
  deletePage: (id: string) => api.delete(`metodika/admin/pages/${id}`),

  listAccess: () => unwrap<MetodikaAccessRow[]>(api.get('metodika/admin/access')),
  createAccess: (body: { identifier: string; login?: string; password?: string; expiresAt?: string | null; note?: string }) =>
    unwrap<MetodikaAccessRow>(api.post('metodika/admin/access', body)),
  updateAccess: (id: string, body: { isActive?: boolean; expiresAt?: string | null; note?: string; resetPassword?: boolean }) =>
    unwrap<MetodikaAccessRow>(api.patch(`metodika/admin/access/${id}`, body)),
  deleteAccess: (id: string) => api.delete(`metodika/admin/access/${id}`),

  audit: () => unwrap<MetodikaAuditRow[]>(api.get('metodika/admin/audit')),
};

export const apiErrorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export const apiErrorCode = (err: unknown): string | undefined =>
  (err as { response?: { data?: { code?: string } } })?.response?.data?.code;

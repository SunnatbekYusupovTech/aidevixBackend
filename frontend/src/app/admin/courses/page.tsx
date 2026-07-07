'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getAllCourses, deleteCourse, createCourse, updateCourse, unwrapAdmin } from '@/api/adminApi';
import Link from 'next/link';
import Image from 'next/image';
import { FiEdit2, FiTrash2, FiPlus, FiBook, FiSearch, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '@/components/admin/ConfirmModal';

type Course = {
  _id: string;
  title: string;
  description?: string;
  price?: number;
  isFree?: boolean;
  level?: string;
  isPublished?: boolean;
  thumbnail?: string | { url: string };
};

function RowSkeleton() {
  return (
    <tr>
      <td className="px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-white/5" />
          <div className="space-y-2">
            <div className="h-3 w-40 animate-pulse rounded bg-white/5" />
            <div className="h-2.5 w-56 animate-pulse rounded bg-white/[0.03]" />
          </div>
        </div>
      </td>
      <td className="px-5 py-4"><div className="h-3 w-20 animate-pulse rounded bg-white/5" /></td>
      <td className="px-5 py-4"><div className="h-5 w-20 animate-pulse rounded-full bg-white/5" /></td>
      <td className="px-5 py-4 text-right"><div className="ml-auto h-8 w-16 animate-pulse rounded-lg bg-white/5" /></td>
    </tr>
  );
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCourses = useCallback(() => {
    setLoading(true);
    getAllCourses({ limit: 100 })
      .then((res) => setCourses(unwrapAdmin<{ courses: Course[] }>(res).courses ?? []))
      .catch(() => toast.error('Kurslarni yuklashda xato'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const togglePublish = async (course: Course) => {
    try {
      await updateCourse(course._id, { isPublished: !course.isPublished });
      setCourses((prev) =>
        prev.map((c) => (c._id === course._id ? { ...c, isPublished: !c.isPublished } : c))
      );
      toast.success(course.isPublished ? 'Chop etish bekor qilindi' : 'Chop etildi');
    } catch {
      toast.error("O'zgartirib bo'lmadi");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCourse(deleteTarget._id);
      toast.success("Kurs o'chirildi");
      setCourses((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch {
      toast.error("O'chirib bo'lmadi");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await createCourse({ title: newTitle.trim(), description: '', price: 0 });
      const created = unwrapAdmin<{ course: Course }>(res).course;
      toast.success('Kurs yaratildi');
      setCourses((prev) => [created, ...prev]);
      setNewTitle('');
      setIsCreating(false);
    } catch {
      toast.error("Yaratib bo'lmadi");
    } finally {
      setCreating(false);
    }
  };

  const thumbUrl = (t: Course['thumbnail']) =>
    typeof t === 'string' ? t : (t as { url: string } | undefined)?.url ?? '';

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Kurslar</h2>
          <p className="mt-1 text-sm text-slate-400">
            Kurs CRUD, narx belgilash va chop etishni boshqarish.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setIsCreating((v) => !v); setNewTitle(''); }}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-600/25 transition-all hover:opacity-90 active:scale-[0.98]"
        >
          {isCreating ? <FiX className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
          {isCreating ? 'Bekor qilish' : 'Yangi kurs'}
        </button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            onSubmit={handleCreate}
            className="overflow-hidden rounded-2xl border border-amber-500/20 bg-[#111726] p-6"
          >
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Yangi kurs</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Kurs nomini kiriting..."
                autoFocus
                maxLength={200}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 disabled:opacity-50"
              >
                {creating && <span className="loading loading-spinner loading-xs" />}
                Yaratish
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111726] shadow-xl">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="relative max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Kurs nomini qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Kurs</th>
                <th className="px-5 py-3.5">Narx / Daraja</th>
                <th className="px-5 py-3.5">Holat</th>
                <th className="px-5 py-3.5 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
                    <FiBook className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                    <p className="text-sm text-slate-500">
                      {search ? `"${search}" bo'yicha kurs topilmadi` : "Hali kurslar yo'q"}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((course) => {
                  const thumb = thumbUrl(course.thumbnail);
                  return (
                    <tr key={course._id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-slate-800">
                            {thumb ? (
                              <Image
                                src={thumb}
                                alt={course.title}
                                width={48}
                                height={48}
                                sizes="48px"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-600">
                                <FiBook className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white">{course.title}</p>
                            {course.description && (
                              <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                                {course.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-emerald-400">
                          {course.price === 0 || course.isFree
                            ? 'Bepul'
                            : `${Number(course.price).toLocaleString('uz-UZ')} UZS`}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{course.level ?? '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => togglePublish(course)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all hover:opacity-80 ${
                            course.isPublished
                              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {course.isPublished ? 'Chop etilgan' : 'Qoralama'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/courses/${course._id}`}
                            className="rounded-lg p-2 text-sky-400 hover:bg-sky-500/10"
                            title="Tahrirlash"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(course)}
                            className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                            title="O'chirish"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="border-t border-white/10 px-5 py-3 text-xs text-slate-500">
            Jami:{' '}
            <strong className="text-slate-300">{courses.length}</strong> ta kurs
            {search && filtered.length !== courses.length && (
              <> · <strong className="text-amber-300">{filtered.length}</strong> ta filtrlangan</>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        variant="danger"
        title="Kursni o'chirish"
        message={`"${deleteTarget?.title}" kursi va tegishli ma'lumotlar to'liq o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
        confirmLabel="Ha, o'chirish"
        cancelLabel="Bekor qilish"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

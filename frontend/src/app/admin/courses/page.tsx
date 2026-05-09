'use client';

import React, { useEffect, useState } from 'react';
import { getAllCourses, deleteCourse, createCourse, updateCourse, unwrapAdmin } from '@/api/adminApi';
import Link from 'next/link';
import Image from 'next/image';
import { FiEdit2, FiTrash2, FiPlus, FiBook, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = () => {
    setLoading(true);
    getAllCourses({ limit: 100 })
      .then((res) => setCourses(unwrapAdmin<{ courses: any[] }>(res).courses || []))
      .catch(err => toast.error('Failed to load courses'))
      .finally(() => setLoading(false));
  };

  const togglePublish = async (course: any) => {
    try {
      await updateCourse(course._id, { isPublished: !course.isPublished });
      setCourses(prev => prev.map(c => c._id === course._id ? { ...c, isPublished: !c.isPublished } : c));
      toast.success(course.isPublished ? "Chop etish bekor qilindi" : 'Chop etildi');
    } catch {
      toast.error("O'zgartirib bo'lmadi");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await deleteCourse(id);
      toast.success('Course deleted!');
      setCourses(prev => prev.filter(c => c._id !== id));
    } catch (error: any) {
      toast.error(error.message || 'Error deleting course');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await createCourse({ title: newTitle, description: 'New course description', price: 0 });
      toast.success('Course created!');
      const created = unwrapAdmin<{ course: any }>(res).course;
      setCourses([created, ...courses]);
      setNewTitle('');
      setIsCreating(false);
    } catch (error: any) {
      toast.error('Failed to create course');
    }
  };

  const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Courses</h1>
          <p className="text-slate-400 mt-1">Manage platform courses, modules, and content.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
        >
          <FiPlus className="w-5 h-5"/> New Course
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-4 items-end animate-fade-in">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Course Title</label>
            <input 
              type="text" 
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Fullstack React Native Masterclass"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
          </div>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl font-medium text-white transition-colors">
            Create Empty Course
          </button>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center bg-slate-900/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" aria-hidden="true" />
            <label htmlFor="admin-courses-search" className="sr-only">Search courses</label>
            <input
              id="admin-courses-search"
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th scope="col" className="px-6 py-4">Course</th>
                <th scope="col" className="px-6 py-4">Price / Level</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <span className="loading loading-spinner loading-md text-indigo-500"></span>
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <FiBook className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No courses found. Create one above to get started.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => (
                  <tr key={course._id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                        {course.thumbnail ? (
                          <Image
                            src={course.thumbnail.url || course.thumbnail}
                            alt={`${course.title} thumbnail`}
                            width={48}
                            height={48}
                            sizes="48px"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600"><FiBook className="w-5 h-5"/></div>
                        )}
                      </div>
                      <div>
                        {course.title}
                        <div className="text-xs text-slate-500 font-normal mt-0.5 max-w-xs truncate">{course.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-emerald-400">
                          {course.price === 0 || course.isFree ? 'Bepul' : `${Number(course.price).toLocaleString('uz-UZ')} UZS`}
                        </span>
                        <span className="text-xs text-slate-500">{course.level || 'All Levels'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => togglePublish(course)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition hover:opacity-80 ${course.isPublished ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}
                        title="Bosish bilan almashtirish"
                      >
                        {course.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Link 
                          href={`/admin/courses/${course._id}`}
                          className="p-2 text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                          title="Edit Course"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(course._id)}
                          className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Delete Course"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

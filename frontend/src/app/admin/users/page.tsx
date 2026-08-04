'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getUsers, updateUser, deleteUser, unwrapAdmin } from '@/api/adminApi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiSearch, FiTrash2, FiShield, FiUser, FiEye, FiSlash, FiCheck, FiMail } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import ConfirmModal from '@/components/admin/ConfirmModal';

type UserRow = {
  _id: string;
  username: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  isGoogle?: boolean;
};

type ConfirmAction = {
  type: 'role' | 'block' | 'delete';
  user: UserRow;
};

function RowSkeleton() {
  return (
    <tr>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/5" />
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-white/5" />
            <div className="h-2.5 w-44 animate-pulse rounded bg-white/[0.03]" />
          </div>
        </div>
      </td>
      <td className="px-5 py-4"><div className="h-5 w-16 animate-pulse rounded-full bg-white/5" /></td>
      <td className="px-5 py-4"><div className="h-4 w-14 animate-pulse rounded bg-white/5" /></td>
      <td className="px-5 py-4 text-right"><div className="ml-auto h-8 w-24 animate-pulse rounded-lg bg-white/5" /></td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [authType, setAuthType] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  
  // Message modal state
  const [messageModal, setMessageModal] = useState<{ open: boolean; user: UserRow | null }>({ open: false, user: null });
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers({ page, limit, search: search.trim() || undefined, role: role || undefined, authType: authType || undefined });
      const d = unwrapAdmin<{ users: UserRow[]; pagination: { total: number } }>(res);
      setUsers(d.users ?? []);
      setTotal(d.pagination?.total ?? 0);
    } catch {
      toast.error('Foydalanuvchilarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, role, authType]);

  useEffect(() => {
    const t = setTimeout(() => load(), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const handleConfirm = async () => {
    if (!confirm) return;
    setActionLoading(true);
    const { type, user: u } = confirm;
    try {
      if (type === 'role') {
        const next = u.role === 'admin' ? 'user' : 'admin';
        await updateUser(u._id, { role: next });
        toast.success('Rol yangilandi');
      } else if (type === 'block') {
        await updateUser(u._id, { isActive: !u.isActive });
        toast.success(u.isActive === false ? 'Faollashtirildi' : 'Bloklandi');
      } else if (type === 'delete') {
        await deleteUser(u._id);
        toast.success("Foydalanuvchi o'chirildi");
      }
      setConfirm(null);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Amal bajarilmadi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageModal.user || !msgSubject.trim() || !msgBody.trim()) return;
    setMsgLoading(true);
    try {
      const { sendMessageToUser } = await import('@/api/adminApi');
      await sendMessageToUser(messageModal.user._id, msgSubject, msgBody);
      toast.success('Xabar muvaffaqiyatli yuborildi');
      setMessageModal({ open: false, user: null });
      setMsgSubject('');
      setMsgBody('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Xabar yuborishda xatolik');
    } finally {
      setMsgLoading(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  const confirmMeta = (() => {
    if (!confirm) return { title: '', message: '', label: '', variant: 'danger' as const };
    const { type, user: u } = confirm;
    if (type === 'role') {
      const next = u.role === 'admin' ? 'user' : 'admin';
      return {
        title: 'Rolni almashtirish',
        message: `${u.username} ning roli "${u.role}" dan "${next}" ga o'zgartiriladi.`,
        label: 'Almashtirish',
        variant: 'warning' as const,
      };
    }
    if (type === 'block') {
      return {
        title: u.isActive === false ? 'Foydalanuvchini faollashtirish' : "Foydalanuvchini bloklash",
        message: u.isActive === false
          ? `${u.username} yana kirish imkoniyatiga ega bo'ladi.`
          : `${u.username} tizimga kira olmaydi. Istalgan vaqt bekor qilish mumkin.`,
        label: u.isActive === false ? 'Faollashtirish' : 'Bloklash',
        variant: (u.isActive === false ? 'info' : 'warning') as const,
      };
    }
    return {
      title: "Foydalanuvchini o'chirish",
      message: `${u.username} va uning barcha ma'lumotlari bazadan o'chiriladi. Bu amalni qaytarib bo'lmaydi.`,
      label: "Ha, o'chirish",
      variant: 'danger' as const,
    };
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Foydalanuvchilar</h2>
        <p className="mt-1 text-sm text-slate-400">
          Qidiruv, rol boshqaruvi va faollik holati. O'chirish — butunlay yo'q qiladi.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#111726] p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Username yoki email..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
          />
        </div>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none sm:w-44"
        >
          <option value="">Barcha rollar</option>
          <option value="user">Foydalanuvchi</option>
          <option value="admin">Administrator</option>
        </select>
        <select
          value={authType}
          onChange={(e) => { setAuthType(e.target.value); setPage(1); }}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none sm:w-44"
        >
          <option value="">Barcha turdagi</option>
          <option value="google">Google orqali</option>
          <option value="local">Saytdan (Email)</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111726] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Foydalanuvchi</th>
                <th className="px-5 py-3.5">Rol</th>
                <th className="px-5 py-3.5">Holat</th>
                <th className="px-5 py-3.5 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-14 text-center">
                    <FiUser className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                    <p className="text-sm text-slate-500">Hech narsa topilmadi</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-sm font-bold text-amber-200">
                          {u.username.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{u.username}</p>
                            {u.isGoogle && (
                               <div className="flex items-center justify-center rounded bg-white/10 px-1.5 py-0.5" title="Google orqali">
                                 <FcGoogle className="h-3 w-3" />
                               </div>
                            )}
                          </div>
                          <p className="max-w-[220px] truncate text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        u.role === 'admin'
                          ? 'border border-amber-500/30 bg-amber-500/10 text-amber-200'
                          : 'border border-slate-600/60 bg-slate-900 text-slate-400'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'Foydalanuvchi'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${u.isActive === false ? 'text-red-400' : 'text-emerald-400'}`}>
                        {u.isActive === false
                          ? <><FiSlash className="h-3 w-3" /> Bloklangan</>
                          : <><FiCheck className="h-3 w-3" /> Faol</>
                        }
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Xabar yozish"
                          onClick={() => setMessageModal({ open: true, user: u })}
                          className="rounded-lg p-2 text-indigo-400 hover:bg-indigo-500/10"
                        >
                          <FiMail className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/admin/users/${u._id}`}
                          title="Batafsil"
                          className="rounded-lg p-2 text-sky-400 hover:bg-sky-500/10"
                        >
                          <FiEye className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          title="Rolni almashtirish"
                          onClick={() => setConfirm({ type: 'role', user: u })}
                          className="rounded-lg p-2 text-amber-400 hover:bg-amber-500/10"
                        >
                          <FiShield className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title={u.isActive === false ? 'Faollashtirish' : 'Bloklash'}
                          onClick={() => setConfirm({ type: 'block', user: u })}
                          className={`rounded-lg p-2 transition-colors ${
                            u.isActive === false
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-slate-400 hover:bg-white/5'
                          }`}
                        >
                          {u.isActive === false ? <FiCheck className="h-4 w-4" /> : <FiSlash className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          title="O'chirish"
                          onClick={() => setConfirm({ type: 'delete', user: u })}
                          className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-xs text-slate-500">
          <span>
            Jami: <strong className="text-slate-300">{total}</strong> ta foydalanuvchi
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-700 px-3 py-1.5 font-medium text-slate-200 transition-all hover:border-slate-500 disabled:opacity-40"
            >
              ← Oldingi
            </button>
            <span className="tabular-nums text-slate-400">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="rounded-lg border border-slate-700 px-3 py-1.5 font-medium text-slate-200 transition-all hover:border-slate-500 disabled:opacity-40"
            >
              Keyingi →
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirm}
        variant={confirmMeta.variant}
        title={confirmMeta.title}
        message={confirmMeta.message}
        confirmLabel={confirmMeta.label}
        cancelLabel="Bekor qilish"
        loading={actionLoading}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />

      {/* Message Modal */}
      {messageModal.open && messageModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1423] p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white">Xabar yuborish</h3>
              <p className="mt-1 text-sm text-slate-400">
                <span className="font-medium text-white">{messageModal.user.username}</span> ga elektron pochta xabari yuborish
              </p>
            </div>
            
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">Mavzu</label>
                <input
                  type="text"
                  required
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="Masalan: Kursga kirish haqida..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">Xabar matni</label>
                <textarea
                  required
                  rows={5}
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="Foydalanuvchiga nima demoqchisiz? (HTML teglar xavfsiz emas, oddiy matn ishlating)"
                />
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMessageModal({ open: false, user: null })}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={msgLoading}
                  className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
                >
                  {msgLoading ? 'Yuborilmoqda...' : 'Yuborish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

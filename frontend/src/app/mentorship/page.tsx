'use client';

import { useEffect, useState } from 'react';
import { mentorshipApi } from '@/api/mentorshipApi';
import { useLang } from '@/context/LangContext';
import { toast } from 'react-hot-toast';

type Mentor = {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  rankTitle?: string;
};

export default function MentorshipPage() {
  const { t } = useLang();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [topic, setTopic] = useState(t('mentorship.topicDefault'));
  const [selectedMentor, setSelectedMentor] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    mentorshipApi.getMentors().then((res) => {
      const items = res?.data?.data?.mentors || [];
      setMentors(items);
      if (items[0]?._id) setSelectedMentor(items[0]._id);
    }).catch(() => {});
  }, []);

  const book = async () => {
    if (!selectedMentor || !scheduledAt) return;
    await mentorshipApi.createBooking({
      mentorId: selectedMentor,
      topic,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMin: 45,
    });
    toast.success(t('mentorship.bookSent'));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black">{t('mentorship.title')}</h1>
      <p className="mt-2 text-base-content/60">{t('mentorship.subtitle')}</p>

      <div className="mt-8 grid gap-4">
        <label className="form-control">
          <span className="label-text">{t('mentorship.mentor')}</span>
          <select className="select select-bordered" value={selectedMentor} onChange={(e) => setSelectedMentor(e.target.value)}>
            {mentors.map((m) => (
              <option key={m._id} value={m._id}>
                {(m.firstName || m.username)} ({m.rankTitle || 'MENTOR'}) - {m.jobTitle || 'Engineer'}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="label-text">{t('mentorship.topic')}</span>
          <input className="input input-bordered" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </label>

        <label className="form-control">
          <span className="label-text">{t('mentorship.time')}</span>
          <input type="datetime-local" className="input input-bordered" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </label>

        <button className="btn btn-primary mt-2" onClick={book}>{t('mentorship.book')}</button>
      </div>
    </div>
  );
}

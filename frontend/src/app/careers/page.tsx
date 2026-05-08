'use client';

import { useEffect, useState } from 'react';
import { HiOutlineBriefcase } from 'react-icons/hi';
import { FiExternalLink } from 'react-icons/fi';
import { useLang } from '@/context/LangContext';
import { jobApi } from '@/api/jobApi';

type Job = {
  _id: string;
  company: string;
  title: string;
  location?: string;
  level?: string;
  type?: string;
  applyUrl: string;
};

export default function CareersPage() {
  const { t } = useLang();
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    jobApi.list().then((res) => {
      setJobs(res?.data?.data?.jobs || []);
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-3xl w-full text-center">
        <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
          <HiOutlineBriefcase className="text-4xl text-indigo-500" />
        </div>
        
        <h1 className="text-3xl font-black mb-4">
          {t('careers.title')}
        </h1>
        
        <p className="text-base-content/60 mb-8">
          {t('careers.subtitle')}
        </p>
        
        <div className="space-y-4">
          {jobs.length === 0 && (
            <div className="p-4 rounded-2xl bg-base-200 border border-base-content/5 text-xs text-base-content/50">
              {t('careers.empty')}
            </div>
          )}
          {jobs.map((job) => (
            <a
              key={job._id}
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl bg-base-200 border border-base-content/5 text-left flex items-center justify-between group cursor-pointer hover:border-indigo-500/30 transition-all"
            >
              <div>
                <div className="font-bold text-sm">{job.title} - {job.company}</div>
                <div className="text-xs text-base-content/40">{job.location} | {job.level} | {job.type}</div>
              </div>
              <FiExternalLink className="text-base-content/20 group-hover:text-indigo-500 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

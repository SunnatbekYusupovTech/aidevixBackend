'use client';

import { useLang } from '@/context/LangContext';

type KeyProps = { titleKey: string; descriptionKey: string };
type LegacyProps = { title: string; description: string };
export type PlaceholderPageProps = KeyProps | LegacyProps;

function isKeys(p: PlaceholderPageProps): p is KeyProps {
  return 'titleKey' in p;
}

export default function PlaceholderPage(props: PlaceholderPageProps) {
  const { t } = useLang();
  const title = isKeys(props) ? t(props.titleKey) : props.title;
  const description = isKeys(props) ? t(props.descriptionKey) : props.description;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-black mb-6 animate-fade-in-up">{title}</h1>
        <p className="text-lg text-base-content/60 animate-fade-in-up [animation-delay:0.1s]">
          {description}
        </p>
      </div>
    </div>
  );
}

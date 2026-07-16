'use client';

import React from 'react';
import ErrorView from '@components/common/ErrorView';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView error={error} reset={reset} scope="challenges" />;
}

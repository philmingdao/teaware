'use client';

import Link from '@/components/LocaleLink';
import type { ComponentProps } from 'react';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';

type TVModeLinkProps = ComponentProps<typeof Link>;

export default function TVModeLink({ onClick, ...props }: TVModeLinkProps) {
  const { startMusic } = useBackgroundMusic();

  return (
    <Link
      {...props}
      onClick={(event) => {
        startMusic();
        onClick?.(event);
      }}
    />
  );
}

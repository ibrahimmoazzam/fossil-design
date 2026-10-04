'use client';

import { useEffect, useLayoutEffect } from 'react';

/**
 * useLayoutEffect in the browser, where it runs before paint. On the server, where layout
 * effects never run anyway, useEffect: React 18 warns about useLayoutEffect there.
 */
export const useIsomorphicLayoutEffect =
  typeof document === 'undefined' ? useEffect : useLayoutEffect;

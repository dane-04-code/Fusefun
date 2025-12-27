'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('fuse_referral', ref);
      console.log('Referral code stored:', ref);
    }
  }, [searchParams]);

  return null;
}

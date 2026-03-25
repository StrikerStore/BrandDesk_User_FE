import { useState, useEffect, useRef } from 'react';
import { fetchBrands, markBrandSynced } from '../../utils/api.js';
import styles from './SyncOverlay.module.css';

/**
 * Full-screen overlay shown once per brand when `initial_sync_done = 0`.
 * Polls GET /api/brands every 5s until the brand's `initial_sync_done` flips to 1,
 * then calls POST /api/brands/:id/mark-synced (to be safe) and fades away.
 */
export default function SyncOverlay({ brands, onSyncComplete }) {
  const [pendingBrand, setPendingBrand] = useState(null);
  const intervalRef = useRef(null);

  // Find the first brand that is approved but hasn't completed initial sync
  useEffect(() => {
    const found = (brands || []).find(
      b => b.brand_status === 'approved' && !b.initial_sync_done
    );
    setPendingBrand(found || null);
  }, [brands]);

  // Poll until sync is done
  useEffect(() => {
    if (!pendingBrand) return;

    const poll = async () => {
      try {
        const { data } = await fetchBrands();
        const updated = data.find(b => b.id === pendingBrand.id);
        if (updated && updated.initial_sync_done) {
          clearInterval(intervalRef.current);
          setPendingBrand(null);
          onSyncComplete?.();
        }
      } catch {
        // Silently retry on next interval
      }
    };

    intervalRef.current = setInterval(poll, 5000);

    // Also mark synced after 90 seconds as a fallback timeout
    const timeout = setTimeout(async () => {
      clearInterval(intervalRef.current);
      try {
        await markBrandSynced(pendingBrand.id);
      } catch {
        // ignore
      }
      setPendingBrand(null);
      onSyncComplete?.();
    }, 90_000);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timeout);
    };
  }, [pendingBrand?.id]);

  if (!pendingBrand) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
        </div>
        <div className={styles.title}>
          Setting up <span className={styles.brandName}>{pendingBrand.name}</span>
        </div>
        <div className={styles.subtitle}>
          We're syncing your inbox for the first time. This usually takes a minute or two — please don't close this tab.
        </div>
      </div>
    </div>
  );
}

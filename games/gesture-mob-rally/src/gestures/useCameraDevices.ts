import { useCallback, useEffect, useState } from 'react';

interface CameraDevicesState {
  devices: MediaDeviceInfo[];
  selectedId: string | null;
  selectDevice: (id: string | null) => void;
  refresh: () => void;
}

/** Enumerates available video input devices for the Settings/Calibration camera picker. */
export function useCameraDevices(initialId: string | null = null): CameraDevicesState {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);

  const refresh = useCallback(() => {
    navigator.mediaDevices?.enumerateDevices?.()
      .then(async (list) => {
        let videoInputs = list.filter(d => d.kind === 'videoinput');
        // Labels are blank until permission is granted — request briefly then re-enumerate.
        if (videoInputs.length > 0 && videoInputs.every(d => !d.label)) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(t => t.stop());
            const relist = await navigator.mediaDevices.enumerateDevices();
            videoInputs = relist.filter(d => d.kind === 'videoinput');
          } catch { /* permission denied — keep unlabeled list */ }
        }
        setDevices(videoInputs);
      })
      .catch(() => setDevices([]));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const selectDevice = useCallback((id: string | null) => setSelectedId(id), []);

  return { devices, selectedId, selectDevice, refresh };
}

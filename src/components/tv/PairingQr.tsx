"use client";

// The QR code shown on the TV. Rendered on a solid white plate regardless of
// theme — phone cameras want maximum contrast, and the app's dark surface is
// not reliably scannable from a few metres away.

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface PairingQrProps {
  /** Absolute URL the phone should open. Contains only the pairing code. */
  value: string;
  /** Rendered edge length in px. Large by default — this is a TV. */
  size?: number;
}

export function PairingQr({ value, size = 420 }: PairingQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: 1024, // render big, scale down — stays crisp on a 4K panel
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0a1438", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        // Nothing to do but leave the placeholder up — the pairing code
        // underneath the QR is a complete fallback.
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div
      className="flex items-center justify-center rounded-[2rem] bg-white p-6 shadow-2xl shadow-black/40"
      style={{ width: size, height: size }}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a data: URL, nothing for next/image to optimize
        <img
          src={dataUrl}
          alt="QR code to connect your phone to this TV"
          className="h-full w-full"
        />
      ) : (
        <div className="h-full w-full animate-pulse rounded-2xl bg-slate-200" />
      )}
    </div>
  );
}

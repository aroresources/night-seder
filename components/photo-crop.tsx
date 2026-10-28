'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from './ui';

/** What gets uploaded. Big enough to look right when opened full size. */
const OUTPUT = 800;

/**
 * Crop a picked photo to a square before it is uploaded.
 *
 * A shidduch photo is usually a full-length shot, and shrunk into a small
 * square the face ends up a few pixels across. This picks the square that
 * actually gets kept: drag to move, slide to zoom.
 *
 * Deliberately no library — drag and a zoom slider are a few lines of
 * arithmetic, and a slider beats a pinch when the phone is in one hand.
 */
export function PhotoCrop({
  file,
  onDone,
  onCancel,
}: {
  file: File;
  /** The cropped square, ready to upload. */
  onDone: (cropped: File) => void;
  onCancel: () => void;
}) {
  // The dialog is mounted per picked photo, so the object URL is made once
  // and only needs releasing when it goes away.
  const [src] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [side, setSide] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Measured in a ref callback rather than read off a ref while rendering,
  // which would give last render's width.
  const measure = useCallback((element: HTMLDivElement | null) => {
    if (element) setSide(element.clientWidth);
  }, []);

  // The smallest scale that still covers the square: no empty corners.
  const cover = natural && side ? Math.max(side / natural.width, side / natural.height) : 1;
  const scale = cover * zoom;

  /** Keep the image covering the frame, however it was dragged or zoomed. */
  const clamp = useCallback(
    (next: { x: number; y: number }) => {
      if (!natural || !side) return next;
      return {
        x: Math.min(0, Math.max(side - natural.width * scale, next.x)),
        y: Math.min(0, Math.max(side - natural.height * scale, next.y)),
      };
    },
    [natural, side, scale],
  );

  // Clamped where it is read, not stored clamped: zooming back out then has
  // nothing stale to correct.
  const at = clamp(offset);

  function onPointerDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: at.x, oy: at.y };
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag.current) return;
    setOffset({
      x: drag.current.ox + (event.clientX - drag.current.x),
      y: drag.current.oy + (event.clientY - drag.current.y),
    });
  }

  function onPointerUp() {
    drag.current = null;
  }

  async function use() {
    const img = image.current;
    if (!img || !natural || !side) return;
    setWorking(true);

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const context = canvas.getContext('2d');
    if (!context) return onDone(file);

    // The frame, read back in the photo's own pixels.
    const sx = -at.x / scale;
    const sy = -at.y / scale;
    const size = side / scale;
    context.drawImage(img, sx, sy, size, size, 0, 0, OUTPUT, OUTPUT);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );
    // A photo the browser can display but not read back — a HEIC off an
    // iPhone, usually — goes up whole rather than not at all.
    onDone(blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-center gap-4 bg-black/80 p-5">
      <p className="text-center text-[15px] text-white">Drag to move, slide to zoom</p>

      <div
        ref={measure}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mx-auto aspect-square w-full max-w-[320px] touch-none overflow-hidden rounded-xl bg-black select-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
            ref={image}
            src={src}
            alt=""
            draggable={false}
            onLoad={(event) => {
              const element = event.currentTarget;
              setNatural({ width: element.naturalWidth, height: element.naturalHeight });
            }}
            onError={() => setFailed(true)}
            style={{
              position: 'absolute',
              left: at.x,
              top: at.y,
              width: natural ? natural.width * scale : undefined,
              height: natural ? natural.height * scale : undefined,
              maxWidth: 'none',
            }}
        />
      </div>

      <input
        type="range"
        min={1}
        max={4}
        step={0.01}
        value={zoom}
        aria-label="Zoom"
        onChange={(event) => setZoom(Number(event.target.value))}
        className="mx-auto w-full max-w-[320px] accent-[var(--accent)]"
      />

      <div className="mx-auto flex w-full max-w-[320px] gap-3">
        <Button onClick={onCancel} className="flex-1 bg-white text-ink">
          Cancel
        </Button>
        <Button
          variant="filled"
          onClick={use}
          disabled={working || (!natural && !failed)}
          className="flex-1"
        >
          {working ? 'Uploading…' : failed ? 'Upload as is' : 'Use photo'}
        </Button>
      </div>

      {failed ? (
        <p className="mx-auto max-w-[320px] text-center text-[13px] text-white">
          This browser can&apos;t open that picture to crop it. It can still be uploaded whole.
        </p>
      ) : null}
    </div>
  );
}

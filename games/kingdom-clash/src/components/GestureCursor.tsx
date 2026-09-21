interface Props {
  cursor: { x: number; y: number } | null;
  isPinching: boolean;
}

export default function GestureCursor({ cursor, isPinching }: Props) {
  if (!cursor) return null;
  return (
    <div
      className="pointer-events-none fixed"
      style={{ left: cursor.x - 12, top: cursor.y - 12, width: 24, height: 24, zIndex: 9999 }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: isPinching ? 'none' : '2px solid rgba(0,200,255,0.9)',
          background: isPinching ? 'rgba(0,200,255,0.5)' : 'rgba(0,200,255,0.08)',
          boxShadow: isPinching ? '0 0 12px rgba(0,200,255,0.8)' : '0 0 6px rgba(0,200,255,0.3)',
          transition: 'all 0.08s ease',
        }}
      />
      {!isPinching && (
        <>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,200,255,0.6)', transform: 'translateY(-50%)' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(0,200,255,0.6)', transform: 'translateX(-50%)' }} />
        </>
      )}
    </div>
  );
}

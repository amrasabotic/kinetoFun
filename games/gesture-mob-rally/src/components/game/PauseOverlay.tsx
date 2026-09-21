export default function PauseOverlay() {
  return (
    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white pointer-events-none">
      <div className="text-5xl mb-4 float">✋</div>
      <h1 className="text-3xl font-extrabold mb-2">Paused</h1>
      <p className="text-white/60 text-sm">Hold an open palm for a second to resume</p>
    </div>
  );
}

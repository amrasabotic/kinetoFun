import HoverButton from '../common/HoverButton';

export default function CreditsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="td-screen td-menu">
      <h2 className="td-screen__title">Credits</h2>
      <p className="td-credits__line">Gesture Tower Defense</p>
      <p className="td-credits__line td-credits__line--muted">A gesture-only tower-defense game for KinetoFun.</p>
      <p className="td-credits__line td-credits__line--muted">Built with MediaPipe Hands and React.</p>
      <p className="td-credits__line td-credits__line--muted">Pinch to place. No mouse. No keyboard.</p>
      <HoverButton onActivate={onBack} ringColor="#F87171" className="td-menu-btn td-menu-btn--warn">
        Back
      </HoverButton>
    </div>
  );
}

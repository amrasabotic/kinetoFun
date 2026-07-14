import HoverButton from '../common/HoverButton';

export type MainMenuAction = 'campaign' | 'endless' | 'daily' | 'statistics' | 'settings' | 'credits';

interface MainMenuProps {
  onSelect: (action: MainMenuAction) => void;
  dailyDone: boolean;
}

export default function MainMenu({ onSelect, dailyDone }: MainMenuProps) {
  return (
    <div className="td-screen td-menu">
      <h1 className="td-menu__title">Gesture Tower Defense</h1>
      <p className="td-menu__subtitle">Pinch a tower and drop it on the field — defend your base from every wave.</p>
      <div className="td-menu__grid">
        <HoverButton onActivate={() => onSelect('campaign')} ringColor="#38BDF8" className="td-menu-btn td-menu-btn--primary">
          Campaign
        </HoverButton>
        <HoverButton onActivate={() => onSelect('endless')} ringColor="#A78BFA" className="td-menu-btn">
          Endless Mode
        </HoverButton>
        <HoverButton onActivate={() => onSelect('daily')} ringColor="#FBBF24" className="td-menu-btn">
          {dailyDone ? 'Daily Challenge ✓' : 'Daily Challenge'}
        </HoverButton>
        <HoverButton onActivate={() => onSelect('statistics')} ringColor="#4ADE80" className="td-menu-btn">
          Statistics
        </HoverButton>
        <HoverButton onActivate={() => onSelect('settings')} ringColor="#94A3B8" className="td-menu-btn">
          Settings
        </HoverButton>
        <HoverButton onActivate={() => onSelect('credits')} ringColor="#94A3B8" className="td-menu-btn">
          Credits
        </HoverButton>
      </div>
    </div>
  );
}

import { Game } from "./game/Game";
import { AchievementPopupContainer } from "./game/ui/AchievementPopup";
import { FloatingParticlesContainer } from "./game/ui/FloatingParticles";
import { ToastContainer } from "./game/ui/Toast";

function App() {
  return (
    <div className="grove-game-container">
      <Game />
      <ToastContainer />
      <FloatingParticlesContainer />
      <AchievementPopupContainer />
    </div>
  );
}

export default App;

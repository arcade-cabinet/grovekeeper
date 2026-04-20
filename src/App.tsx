import { Game } from "@/Game";
import { AchievementPopupContainer } from "@/ui/game/AchievementPopup";
import { FloatingParticlesContainer } from "@/ui/game/FloatingParticles";
import { ToastContainer } from "@/ui/game/Toast";

function App() {
  return (
    <div class="grove-game-container">
      <Game />
      <ToastContainer />
      <FloatingParticlesContainer />
      <AchievementPopupContainer />
    </div>
  );
}

export default App;

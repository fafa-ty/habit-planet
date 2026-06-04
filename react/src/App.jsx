import { useApp } from "../context/AppContext";
import Sidebar, { BottomNav } from "./components/Navigation";
import Onboarding, { ConfettiCanvas, ToastContainer } from "./components/Onboarding";
import { HabitModal, NoteModal, WeeklyReportModal } from "./components/Modals";
import TodayPage from "./pages/TodayPage";
import HabitsPage from "./pages/HabitsPage";
import StatsPage from "./pages/StatsPage";
import SettingsPage from "./pages/SettingsPage";

const PAGES = {
  today: TodayPage,
  habits: HabitsPage,
  stats: StatsPage,
  settings: SettingsPage,
};

export default function App() {
  const { page } = useApp();
  const Page = PAGES[page] || TodayPage;

  return (
    <>
      <Onboarding />
      <div className="app">
        <Sidebar />
        <main className="main-content">
          <Page />
        </main>
        <BottomNav />
      </div>
      <HabitModal />
      <NoteModal />
      <WeeklyReportModal />
      <ConfettiCanvas />
      <ToastContainer />
    </>
  );
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import OverviewPage from './pages/OverviewPage';
import RiskMapPage from './pages/RiskMapPage';
import InfrastructurePage from './pages/InfrastructurePage';
import PopulationExposurePage from './pages/PopulationExposurePage';
import ScenarioSimulatorPage from './pages/ScenarioSimulatorPage';
import EvacuationPlannerPage from './pages/EvacuationPlannerPage';
import AICopilotPage from './pages/AICopilotPage';
import HistoricalAnalysisPage from './pages/HistoricalAnalysisPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="risk-map" element={<RiskMapPage />} />
          <Route path="infrastructure" element={<InfrastructurePage />} />
          <Route path="population" element={<PopulationExposurePage />} />
          <Route path="simulator" element={<ScenarioSimulatorPage />} />
          <Route path="evacuation" element={<EvacuationPlannerPage />} />
          <Route path="ai-copilot" element={<AICopilotPage />} />
          <Route path="historical" element={<HistoricalAnalysisPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

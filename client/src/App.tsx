import { Routes, Route } from 'react-router-dom'
import Dashboard        from '@/components/dashboard/Dashboard'
import ReleasePage      from '@/pages/ReleasePage'
import SettingsPage     from '@/pages/SettingsPage'
import PortfolioPage    from '@/pages/PortfolioPage'
import EfficiencyPage   from '@/pages/EfficiencyPage'
import TraceabilityPage from '@/pages/TraceabilityPage'
import StabilityPage    from '@/pages/StabilityPage'
import DrilldownPage    from '@/pages/DrilldownPage'

export default function App() {
  return (
    <div className="dark min-h-screen bg-db-base font-sans">
      <Routes>
        <Route path="/"                   element={<Dashboard />} />
        <Route path="/release/:releaseId" element={<ReleasePage />} />
        <Route path="/settings"           element={<SettingsPage />} />
        <Route path="/portfolio"          element={<PortfolioPage />} />
        <Route path="/efficiency"         element={<EfficiencyPage />} />
        <Route path="/traceability"       element={<TraceabilityPage />} />
        <Route path="/stability"          element={<StabilityPage />} />
        <Route path="/drilldown"          element={<DrilldownPage />} />
      </Routes>
    </div>
  )
}

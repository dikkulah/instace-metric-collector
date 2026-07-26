import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { DashboardPage } from '../routes/dashboard/DashboardPage'
import { ProcessesPage } from '../routes/processes/ProcessesPage'
import { ServicesPage } from '../routes/services/ServicesPage'
import { ContainersPage } from '../routes/containers/ContainersPage'
import { ContainerMetricsPage } from '../routes/container-metrics/ContainerMetricsPage'
import { HubPage } from '../routes/hub/HubPage'
import { HubAgentLayout } from '../routes/hub/HubAgentLayout'
import { HubAgentDashboard } from '../routes/hub/HubAgentDashboard'
import { AlertsPage } from '../routes/alerts/AlertsPage'
import { DiagnosticsPage } from '../routes/diagnostics/DiagnosticsPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/processes" element={<ProcessesPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/containers" element={<ContainersPage />} />
          <Route path="/container-metrics" element={<ContainerMetricsPage />} />
          <Route path="/hub" element={<HubPage />} />
          <Route path="/hub/agents/:agentId" element={<HubAgentLayout />}>
            <Route index element={<HubAgentDashboard />} />
            <Route path="processes" element={<ProcessesPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="containers" element={<ContainersPage />} />
            <Route path="container-metrics" element={<ContainerMetricsPage />} />
            <Route path="diagnostics" element={<DiagnosticsPage />} />
          </Route>
          <Route path="/diagnostics" element={<DiagnosticsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

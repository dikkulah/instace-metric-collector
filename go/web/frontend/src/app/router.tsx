import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { DashboardPage } from '../routes/dashboard/DashboardPage'
import { ProcessesPage } from '../routes/processes/ProcessesPage'
import { ServicesPage } from '../routes/services/ServicesPage'
import { ContainersPage } from '../routes/containers/ContainersPage'
import { ContainerMetricsPage } from '../routes/container-metrics/ContainerMetricsPage'
import { HubPage } from '../routes/hub/HubPage'

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

import { test, expect } from '@playwright/test'

const agentId = 'e2e-demo-agent'
const hostname = 'e2e-demo-host'

async function seedAgent(request: import('@playwright/test').APIRequestContext) {
  const snapshot = {
    collectedAt: new Date().toISOString(),
    payload: {
      cpuLoad: 42,
      usedMemory: 8_589_934_592,
      totalMemory: 17_179_869_184,
      availableProcessors: 8,
      systemLoadAverage: 2.1,
      processInfos: [
        { user: 'root', pid: 1, cpuUsage: 0.1, memoryUsage: 0.2, command: '/sbin/init' },
        { user: 'demo', pid: 4242, cpuUsage: 4.2, memoryUsage: 1.8, command: 'java -jar app.jar' },
      ],
      serviceInfos: [
        { serviceName: 'demo.service', status: 'RUNNING', description: 'Demo service' },
      ],
      containers: [
        {
          id: 'abc123',
          name: 'demo-container',
          image: 'demo:latest',
          status: 'running',
          health: 'healthy',
          restartCount: 0,
          ports: ['8080:8080'],
          composeProject: '',
          composeService: '',
        },
      ],
      diskUsage: [{ mount: '/', filesystem: 'ext4', usePercent: 55, totalBytes: 500_000_000_000 }],
      networkUsage: [{ name: 'eth0', bytesReceived: 1_000_000, bytesSent: 500_000 }],
      connectivityProbes: [],
    },
  }

  const res = await request.post('/api/v1/ingest', {
    data: { agentId, hostname, snapshot },
  })
  expect(res.ok()).toBeTruthy()
}

test.describe('Hub agent drill-down', () => {
  test.beforeEach(async ({ request }) => {
    await seedAgent(request)
  })

  test('hub lists agent and opens dashboard', async ({ page }) => {
    await page.goto('/hub')
    await expect(page.getByText(hostname)).toBeVisible()
    await page.getByText(hostname).click()
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
    await expect(page.getByText(agentId)).toBeVisible()
  })

  test('navigates to processes and services from agent tabs', async ({ page }) => {
    await page.goto(`/hub/agents/${encodeURIComponent(agentId)}`)
    await page.getByRole('link', { name: 'Processes', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Processes', level: 1 })).toBeVisible()
    await expect(page.getByText('java -jar app.jar')).toBeVisible()

    await page.getByRole('link', { name: 'Services', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Services', level: 1 })).toBeVisible()
    await expect(page.getByText('RUNNING').first()).toBeVisible()
  })

  test('navigates to containers tab', async ({ page }) => {
    await page.goto(`/hub/agents/${encodeURIComponent(agentId)}`)
    await page.getByRole('link', { name: 'Containers', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Docker containers', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'demo-container', level: 2 })).toBeVisible()
  })
})

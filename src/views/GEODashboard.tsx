import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Today } from '@/components/dashboard/Today'
import { Content } from '@/components/dashboard/Content'
import { Presence } from '@/components/dashboard/Presence'
import { Results } from '@/components/dashboard/Results'
import { Settings } from '@/components/dashboard/Settings'
import '@/styles/dashboard.css'

export default function GEODashboard() {
  const [activeTab, setActiveTab] = useState('today')

  const renderPanel = () => {
    switch (activeTab) {
      case 'today':
        return <Today />
      case 'content':
        return <Content />
      case 'presence':
        return <Presence />
      case 'results':
        return <Results />
      case 'settings':
        return <Settings />
      default:
        return <Today />
    }
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main>
        {renderPanel()}
      </main>
    </div>
  )
}

import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Today } from './components/Today'
import { Content } from './components/Content'
import { Presence } from './components/Presence'
import { Results } from './components/Results'
import { Settings } from './components/Settings'

function App() {
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

export default App

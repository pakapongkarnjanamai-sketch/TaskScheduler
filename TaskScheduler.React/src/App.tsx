import { TaskSchedulerDashboard } from './features/tasks/TaskSchedulerDashboard'
import './App.css'
import config from 'devextreme/core/config'
import { licenseKey } from './devextreme-license'

if (licenseKey) {
  config({ licenseKey })
}

function App() {
  return <TaskSchedulerDashboard />
}

export default App

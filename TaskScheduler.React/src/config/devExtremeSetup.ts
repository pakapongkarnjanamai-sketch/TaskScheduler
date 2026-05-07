import config from 'devextreme/core/config'
import 'devextreme/dist/css/dx.light.css'
import { licenseKey } from '../devextreme-license'

let isConfigured = false

export function ensureDevExtremeConfigured() {
  if (isConfigured) {
    return
  }

  if (licenseKey) {
    config({ licenseKey })
  }

  isConfigured = true
}

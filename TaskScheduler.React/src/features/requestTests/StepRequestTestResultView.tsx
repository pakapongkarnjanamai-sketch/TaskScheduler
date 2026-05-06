import type { StepRequestTestResult } from '../../types/entities'

type StepRequestTestResultViewProps = {
  result: StepRequestTestResult | null
  onClear: () => void
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '(empty)'
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return '(empty)'
    }

    try {
      return JSON.stringify(JSON.parse(trimmedValue), null, 2)
    } catch {
      return value
    }
  }

  return JSON.stringify(value, null, 2)
}

function ResultSection({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="result-section">
      <h3>{title}</h3>
      <pre>{formatValue(value)}</pre>
    </section>
  )
}

export function StepRequestTestResultView({ result, onClear }: StepRequestTestResultViewProps) {
  if (!result) {
    return null
  }

  const response = result.response
  const statusText = response?.statusCode
    ? `${response.statusCode} ${response.reasonPhrase ?? ''}`.trim()
    : 'No HTTP response'

  return (
    <section className="workspace-card">
      <div className="workspace-section__header">
        <div>
          <h3>Latest Result</h3>
        </div>
        <button type="button" className="row-action" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="request-test-summary">
        <div>
          <span>Target URL</span>
          <strong>{result.request.url}</strong>
        </div>
        <div>
          <span>Method</span>
          <strong>{result.request.method}</strong>
        </div>
        <div>
          <span>HTTP Status</span>
          <strong>{statusText}</strong>
        </div>
        <div>
          <span>Duration</span>
          <strong>{result.durationMs} ms</strong>
        </div>
      </div>

      {response?.errorMessage && <div className="request-test-error">{response.errorMessage}</div>}

      <ResultSection title="Request Headers" value={result.request.headers} />
      <ResultSection title="Request Body" value={result.request.body} />
      <ResultSection title="Response Headers" value={response?.headers} />
      <ResultSection title="Response Body" value={response?.body} />
    </section>
  )
}
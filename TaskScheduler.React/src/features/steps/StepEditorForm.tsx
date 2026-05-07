import { useId, useState } from 'react'
import notify from 'devextreme/ui/notify'
import { createEntity, runStepRequestTest, updateEntity } from '../../api/adminApi'
import { StepRequestTestResultView } from '../requestTests/StepRequestTestResultView'
import type { Step, StepRequestTestResult, TaskSummary } from '../../types/entities'

type StepEditorFormProps = {
  task: TaskSummary
  step: Step | null
  onCancel: () => void
  onSaved: (step: Step) => void
}

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

function createStepDraft(taskId: number, step: Step | null): Step {
  return {
    Id: step?.Id ?? 0,
    TaskId: taskId,
    IsActive: step?.IsActive ?? true,
    Name: step?.Name ?? '',
    Description: step?.Description ?? '',
    Order: step?.Order ?? 0,
    ApiUrl: step?.ApiUrl ?? '',
    HttpMethod: step?.HttpMethod ?? 'GET',
    Headers: step?.Headers ?? '',
    Body: step?.Body ?? '',
  }
}

export function StepEditorForm({ task, step, onSaved }: StepEditorFormProps) {
  const [formData, setFormData] = useState<Step>(() => createStepDraft(task.Id, step))
  const [requestResult, setRequestResult] = useState<StepRequestTestResult | null>(null)
  const fieldId = useId()
  const isEdit = formData.Id > 0

  async function saveStep() {
    const name = formData.Name.trim()
    const apiUrl = formData.ApiUrl.trim()

    if (!name) {
      notify('Step name is required.', 'error', 3000)
      return
    }

    if (!apiUrl) {
      notify('Step URL is required.', 'error', 3000)
      return
    }

    const payload = {
      TaskId: task.Id,
      Name: name,
      Description: formData.Description?.trim() || null,
      IsActive: formData.IsActive,
      Order: formData.Order,
      ApiUrl: apiUrl,
      HttpMethod: formData.HttpMethod,
      Headers: formData.Headers?.trim() || null,
      Body: formData.Body?.trim() || null,
    }

    try {
      const result = isEdit
        ? (await updateEntity('Steps', formData.Id, payload) as Step | undefined)
        : (await createEntity('Steps', payload) as Step | undefined)

      notify('Step saved.', 'success', 2000)
      onSaved(result ?? { ...formData, ...payload })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to save step.', 'error', 4000)
    }
  }

  async function testRequest() {
    const apiUrl = formData.ApiUrl.trim()
    if (!apiUrl) {
      notify('Step URL is required before testing.', 'error', 3000)
      return
    }

    try {
      const result = await runStepRequestTest({
        name: formData.Name.trim() || 'Untitled Step',
        apiUrl,
        httpMethod: formData.HttpMethod,
        headers: formData.Headers,
        body: formData.Body,
      })

      setRequestResult(result)
      notify('Request test completed.', 'success', 2000)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Request test failed.', 'error', 4000)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveStep()
  }

  return (
    <section className="workspace-view">
      <form className="editor-form editor-form--wide" onSubmit={handleSubmit}>
        <div className="workspace-view__header workspace-view__header--actions-only">
          <div className="workspace-view__actions workspace-view__actions--spread">
            <button type="button" className="row-action" onClick={() => void testRequest()}>
              Test Request
            </button>
            <button type="submit" className="row-action row-action--primary">
              Save Step
            </button>
          </div>
        </div>

        <section className="workspace-card editor-form__section editor-form__section--identity">
          <div className="editor-form__section-header">
            <div className="editor-form__section-title-block">
              <h2>Step Details</h2>
              <p>Define the step identity first, then attach the request it should run.</p>
            </div>
            <label className="editor-toggle" htmlFor={`${fieldId}-active`}>
              <input
                id={`${fieldId}-active`}
                type="checkbox"
                checked={formData.IsActive}
                onChange={(event) => {
                  setFormData((currentData) => ({ ...currentData, IsActive: event.target.checked }))
                }}
              />
              <span>Enabled</span>
            </label>
          </div>

          <div className="editor-form__grid editor-form__grid--details">
            <div className="editor-field editor-field--required editor-field--span-2">
              <label className="editor-field__label" htmlFor={`${fieldId}-name`}>
                Step Name
              </label>
              <input
                id={`${fieldId}-name`}
                className="editor-field__control"
                type="text"
                value={formData.Name}
                onChange={(event) => {
                  setFormData((currentData) => ({ ...currentData, Name: event.target.value }))
                }}
                autoComplete="off"
              />
            </div>

            <div className="editor-field">
              <label className="editor-field__label" htmlFor={`${fieldId}-method`}>
                HTTP Method
              </label>
              <select
                id={`${fieldId}-method`}
                className="editor-field__control"
                value={formData.HttpMethod}
                onChange={(event) => {
                  setFormData((currentData) => ({ ...currentData, HttpMethod: event.target.value }))
                }}
              >
                {httpMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className="editor-field">
              <label className="editor-field__label" htmlFor={`${fieldId}-order`}>
                Run Order
              </label>
              <input
                id={`${fieldId}-order`}
                className="editor-field__control"
                type="number"
                value={formData.Order}
                readOnly
              />
            </div>

            <div className="editor-field editor-field--required editor-field--span-2">
              <label className="editor-field__label" htmlFor={`${fieldId}-url`}>
                URL
              </label>
              <input
                id={`${fieldId}-url`}
                className="editor-field__control"
                type="url"
                value={formData.ApiUrl}
                onChange={(event) => {
                  setFormData((currentData) => ({ ...currentData, ApiUrl: event.target.value }))
                }}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="editor-field editor-field--span-2">
              <label className="editor-field__label" htmlFor={`${fieldId}-description`}>
                Description
              </label>
              <textarea
                id={`${fieldId}-description`}
                className="editor-field__control editor-field__control--multiline"
                value={formData.Description ?? ''}
                onChange={(event) => {
                  setFormData((currentData) => ({ ...currentData, Description: event.target.value }))
                }}
                rows={6}
              />
            </div>
          </div>
        </section>

        <section className="workspace-card editor-form__section">
          <div className="editor-form__section-header">
            <div className="editor-form__section-title-block">
              <h2>Request</h2>
              <p>Keep headers compact, then use the body area for the payload you want to test and run.</p>
            </div>
          </div>

          <div className="editor-form__grid editor-form__grid--request">
            <div className="editor-field">
              <label className="editor-field__label" htmlFor={`${fieldId}-headers`}>
                Headers (JSON)
              </label>
              <textarea
                id={`${fieldId}-headers`}
                className="editor-field__control editor-field__control--multiline editor-field__control--code"
                value={formData.Headers ?? ''}
                onChange={(event) => {
                  setFormData((currentData) => ({ ...currentData, Headers: event.target.value }))
                }}
                rows={12}
                spellCheck={false}
              />
            </div>

            <div className="editor-field">
              <label className="editor-field__label" htmlFor={`${fieldId}-body`}>
                Body
              </label>
              <textarea
                id={`${fieldId}-body`}
                className="editor-field__control editor-field__control--multiline editor-field__control--code"
                value={formData.Body ?? ''}
                onChange={(event) => {
                  setFormData((currentData) => ({ ...currentData, Body: event.target.value }))
                }}
                rows={12}
                spellCheck={false}
              />
            </div>
          </div>
        </section>
      </form>

      <StepRequestTestResultView result={requestResult} onClear={() => setRequestResult(null)} />
    </section>
  )
}
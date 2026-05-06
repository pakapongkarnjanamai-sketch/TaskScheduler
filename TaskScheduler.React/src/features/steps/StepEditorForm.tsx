import { useState, type ComponentProps } from 'react'
import Button from 'devextreme-react/button'
import DxForm, { GroupItem, Label, SimpleItem } from 'devextreme-react/form'
import notify from 'devextreme/ui/notify'
import 'devextreme/ui/text_box'
import 'devextreme/ui/text_area'
import 'devextreme/ui/select_box'
import 'devextreme/ui/number_box'
import 'devextreme/ui/switch'
import { createEntity, runStepRequestTest, updateEntity } from '../../api/adminApi'
import { appConfig } from '../../config/appConfig'
import { StepRequestTestResultView } from '../requestTests/StepRequestTestResultView'
import type { Step, StepRequestTestResult, TaskSummary } from '../../types/entities'

type StepEditorFormProps = {
  task: TaskSummary
  step: Step | null
  onCancel: () => void
  onSaved: (step: Step) => void
}

type FormFieldChangeEvent = Parameters<NonNullable<ComponentProps<typeof DxForm>['onFieldDataChanged']>>[0]

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

export function StepEditorForm({ task, step, onCancel, onSaved }: StepEditorFormProps) {
  const [formData, setFormData] = useState<Step>(() => createStepDraft(task.Id, step))
  const [requestResult, setRequestResult] = useState<StepRequestTestResult | null>(null)
  const isEdit = formData.Id > 0

  function handleFieldChange(event: FormFieldChangeEvent) {
    switch (event.dataField) {
      case 'Name':
        setFormData((currentData) => ({ ...currentData, Name: String(event.value ?? '') }))
        break
      case 'Description':
        setFormData((currentData) => ({ ...currentData, Description: String(event.value ?? '') }))
        break
      case 'ApiUrl':
        setFormData((currentData) => ({ ...currentData, ApiUrl: String(event.value ?? '') }))
        break
      case 'HttpMethod':
        setFormData((currentData) => ({ ...currentData, HttpMethod: String(event.value ?? 'GET') }))
        break
      case 'Headers':
        setFormData((currentData) => ({ ...currentData, Headers: String(event.value ?? '') }))
        break
      case 'Body':
        setFormData((currentData) => ({ ...currentData, Body: String(event.value ?? '') }))
        break
      case 'IsActive':
        setFormData((currentData) => ({ ...currentData, IsActive: Boolean(event.value) }))
        break
      default:
        break
    }
  }

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

  return (
    <section className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <p className="workspace-view__eyebrow">Step Editor</p>
          <h2>{isEdit ? `Edit ${formData.Name || 'Step'}` : `Add Step to ${task.Name}`}</h2>
        </div>
        <div className="workspace-view__actions workspace-view__actions--spread">
          <Button text="Back" stylingMode="outlined" onClick={onCancel} />
          <Button text="Test Request" stylingMode="outlined" onClick={testRequest} />
          <Button text="Save Step" type="default" onClick={saveStep} />
        </div>
      </div>

      <div className="workspace-card">
        <DxForm formData={formData} colCount={2} labelLocation="top" onFieldDataChanged={handleFieldChange}>
          <GroupItem caption="Step Details" colCount={2}>
            <SimpleItem dataField="Name" isRequired colSpan={2}>
              <Label text="Step Name" />
            </SimpleItem>
            <SimpleItem dataField="IsActive" editorType="dxSwitch">
              <Label text="Enabled" />
            </SimpleItem>
            <SimpleItem
              dataField="HttpMethod"
              editorType="dxSelectBox"
              editorOptions={{ items: httpMethods }}
            >
              <Label text="HTTP Method" />
            </SimpleItem>
            <SimpleItem dataField="Order" editorType="dxNumberBox" editorOptions={{ disabled: true }}>
              <Label text="Run Order" />
            </SimpleItem>
            <SimpleItem dataField="ApiUrl" isRequired colSpan={2}>
              <Label text="URL" />
            </SimpleItem>
            <SimpleItem dataField="Description" editorType="dxTextArea" colSpan={2} editorOptions={{ minHeight: 120 }}>
              <Label text="Description" />
            </SimpleItem>
          </GroupItem>
          <GroupItem caption="Request Options" colCount={2}>
            <SimpleItem dataField="Headers" editorType="dxTextArea" colSpan={2} editorOptions={{ minHeight: 140 }}>
              <Label text="Headers (JSON)" />
            </SimpleItem>
            <SimpleItem dataField="Body" editorType="dxTextArea" colSpan={2} editorOptions={{ minHeight: 220 }}>
              <Label text="Body" />
            </SimpleItem>
          </GroupItem>
        </DxForm>
      </div>

      <div className="workspace-meta-line">Echo endpoint: {appConfig.requestTestEchoUrl}?statusCode=200</div>
      <div className="workspace-meta-line">Run order is managed from the steps list.</div>

      <StepRequestTestResultView result={requestResult} onClear={() => setRequestResult(null)} />
    </section>
  )
}
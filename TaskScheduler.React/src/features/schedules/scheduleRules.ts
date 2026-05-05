import type { Schedule, ScheduleTriggerType } from '../../types/entities'

export const scheduleTriggerTypes: ScheduleTriggerType[] = ['Interval', 'Daily', 'Weekly', 'Monthly']

export const weekDayOptions = [
  { value: 'Monday', text: 'Mon' },
  { value: 'Tuesday', text: 'Tue' },
  { value: 'Wednesday', text: 'Wed' },
  { value: 'Thursday', text: 'Thu' },
  { value: 'Friday', text: 'Fri' },
  { value: 'Saturday', text: 'Sat' },
  { value: 'Sunday', text: 'Sun' },
]

type TriggerRule = {
  usesIntervalTime: boolean
  usesStartTime: boolean
  usesDaysOfWeek: boolean
  usesDayOfMonth: boolean
}

const triggerRules: Record<ScheduleTriggerType, TriggerRule> = {
  Interval: {
    usesIntervalTime: true,
    usesStartTime: false,
    usesDaysOfWeek: false,
    usesDayOfMonth: false,
  },
  Daily: {
    usesIntervalTime: false,
    usesStartTime: true,
    usesDaysOfWeek: false,
    usesDayOfMonth: false,
  },
  Weekly: {
    usesIntervalTime: false,
    usesStartTime: true,
    usesDaysOfWeek: true,
    usesDayOfMonth: false,
  },
  Monthly: {
    usesIntervalTime: false,
    usesStartTime: true,
    usesDaysOfWeek: false,
    usesDayOfMonth: true,
  },
}

export function getTriggerRule(triggerType: ScheduleTriggerType) {
  return triggerRules[triggerType]
}

export function parseDaysOfWeek(value: Schedule['DaysOfWeek']) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  return value
    .split(',')
    .map((day) => day.trim())
    .filter(Boolean)
}

export function createScheduleDefaults(taskId: number): Schedule {
  return {
    Id: 0,
    TaskId: taskId,
    Name: '',
    Description: '',
    IsActive: true,
    TriggerType: 'Interval',
    IntervalTime: 15,
    StartTime: '08:00:00',
    DaysOfWeek: [],
    DayOfMonth: 1,
  }
}

export function applyTriggerDefaults(schedule: Schedule, triggerType: ScheduleTriggerType): Schedule {
  const nextSchedule = {
    ...schedule,
    TriggerType: triggerType,
  }

  if (triggerType === 'Interval') {
    nextSchedule.IntervalTime = nextSchedule.IntervalTime && nextSchedule.IntervalTime > 0 ? nextSchedule.IntervalTime : 15
    nextSchedule.StartTime = null
    nextSchedule.DaysOfWeek = []
    nextSchedule.DayOfMonth = null
  }

  if (triggerType === 'Daily') {
    nextSchedule.IntervalTime = null
    nextSchedule.StartTime = nextSchedule.StartTime || '08:00:00'
    nextSchedule.DaysOfWeek = []
    nextSchedule.DayOfMonth = null
  }

  if (triggerType === 'Weekly') {
    nextSchedule.IntervalTime = null
    nextSchedule.StartTime = nextSchedule.StartTime || '08:00:00'
    nextSchedule.DaysOfWeek = parseDaysOfWeek(nextSchedule.DaysOfWeek).length
      ? parseDaysOfWeek(nextSchedule.DaysOfWeek)
      : ['Monday']
    nextSchedule.DayOfMonth = null
  }

  if (triggerType === 'Monthly') {
    nextSchedule.IntervalTime = null
    nextSchedule.StartTime = nextSchedule.StartTime || '08:00:00'
    nextSchedule.DaysOfWeek = []
    nextSchedule.DayOfMonth = nextSchedule.DayOfMonth && nextSchedule.DayOfMonth > 0 ? nextSchedule.DayOfMonth : 1
  }

  return nextSchedule
}

export function buildScheduleSummary(schedule: Schedule) {
  if (schedule.TriggerType === 'Interval') {
    return `Every ${schedule.IntervalTime ?? 0} minutes`
  }

  if (schedule.TriggerType === 'Daily') {
    return `Every day at ${formatTime(schedule.StartTime)}`
  }

  if (schedule.TriggerType === 'Weekly') {
    const days = parseDaysOfWeek(schedule.DaysOfWeek).join(', ')
    return `${days || 'No weekdays'} at ${formatTime(schedule.StartTime)}`
  }

  if (schedule.TriggerType === 'Monthly') {
    return `Day ${schedule.DayOfMonth ?? 1} at ${formatTime(schedule.StartTime)}`
  }

  return schedule.TriggerType
}

export function validateSchedule(schedule: Schedule) {
  if (!schedule.Name.trim()) {
    return 'Schedule name is required.'
  }

  if (schedule.TriggerType === 'Interval' && (!schedule.IntervalTime || schedule.IntervalTime < 1)) {
    return 'Interval schedules require a value of at least 1 minute.'
  }

  if (schedule.TriggerType !== 'Interval' && !schedule.StartTime) {
    return 'This schedule type requires a run time.'
  }

  if (schedule.TriggerType === 'Weekly' && parseDaysOfWeek(schedule.DaysOfWeek).length === 0) {
    return 'Weekly schedules require at least one weekday.'
  }

  if (schedule.TriggerType === 'Monthly' && (!schedule.DayOfMonth || schedule.DayOfMonth < 1 || schedule.DayOfMonth > 31)) {
    return 'Monthly schedules require a day between 1 and 31.'
  }

  return null
}

export function toSchedulePayload(schedule: Schedule) {
  const rule = getTriggerRule(schedule.TriggerType)

  return {
    TaskId: schedule.TaskId,
    Name: schedule.Name,
    Description: schedule.Description || null,
    IsActive: schedule.IsActive,
    TriggerType: schedule.TriggerType,
    IntervalTime: rule.usesIntervalTime ? schedule.IntervalTime : null,
    StartTime: rule.usesStartTime ? normalizeTime(schedule.StartTime) : null,
    DaysOfWeek: rule.usesDaysOfWeek ? parseDaysOfWeek(schedule.DaysOfWeek) : [],
    DayOfMonth: rule.usesDayOfMonth ? schedule.DayOfMonth : null,
  }
}

export function normalizeTime(value?: string | null) {
  if (!value) {
    return null
  }

  return value.length === 5 ? `${value}:00` : value
}

function formatTime(value?: string | null) {
  if (!value) {
    return '--:--'
  }

  return value.slice(0, 5)
}
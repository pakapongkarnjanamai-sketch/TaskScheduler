(function (window) {
    "use strict";

    function parseDaysOfWeek(value) {
        if (!value) {
            return [];
        }

        if (Array.isArray(value)) {
            return value.filter(Boolean);
        }

        return String(value)
            .split(",")
            .map(function (day) { return day.trim(); })
            .filter(Boolean);
    }

    function formatScheduleTime(value) {
        if (!value) {
            return "";
        }

        if (value instanceof Date) {
            return DevExpress.localization.formatDate(value, "HH:mm");
        }

        var text = String(value);
        var timeMatch = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (timeMatch) {
            return timeMatch[1].padStart(2, "0") + ":" + timeMatch[2];
        }

        return text.length >= 5 ? text.substring(0, 5) : text;
    }

    function createHelpers(config) {
        var defaultTriggerType = config.defaultTriggerType || "Interval";
        var invalidTriggerValidationMessage = config.invalidTriggerValidationMessage || "Trigger type is invalid.";
        var triggerRules = config.triggerRules || {};
        var triggerTypes = config.triggerTypes || [];
        var weekDayOptions = config.weekDayOptions || [];
        var weekDayLookup = {};

        weekDayOptions.forEach(function (option) {
            weekDayLookup[option.value] = option.text;
        });

        function getTriggerRule(triggerType) {
            return triggerRules[triggerType] || triggerRules[defaultTriggerType] || null;
        }

        function formatDaysOfWeek(value) {
            var days = parseDaysOfWeek(value);
            if (!days.length) {
                return "";
            }

            return days.map(function (day) {
                return weekDayLookup[day] || day;
            }).join(", ");
        }

        function usesStartTime(triggerType) {
            var rule = getTriggerRule(triggerType);
            return !!(rule && rule.usesStartTime);
        }

        function applyTriggerDefaults(target, triggerType) {
            var rule = getTriggerRule(triggerType);
            target.TriggerType = triggerType;

            if (!rule) {
                return;
            }

            if (rule.usesIntervalTime) {
                if (!target.IntervalTime && rule.defaultIntervalTime) {
                    target.IntervalTime = rule.defaultIntervalTime;
                }
            } else {
                target.IntervalTime = null;
            }

            if (!rule.usesStartTime) {
                target.StartTime = null;
            }

            if (rule.usesDaysOfWeek) {
                var selectedDays = parseDaysOfWeek(target.DaysOfWeek);
                target.DaysOfWeek = selectedDays.length
                    ? selectedDays
                    : (rule.defaultDaysOfWeek || []).slice();
            } else {
                target.DaysOfWeek = null;
            }

            if (rule.usesDayOfMonth) {
                if (!target.DayOfMonth && rule.defaultDayOfMonth) {
                    target.DayOfMonth = rule.defaultDayOfMonth;
                }
            } else {
                target.DayOfMonth = null;
            }
        }

        function validateSchedule(schedule) {
            var rule = getTriggerRule(schedule.TriggerType);
            if (!rule || rule.triggerType !== schedule.TriggerType) {
                return invalidTriggerValidationMessage;
            }

            if (rule.requiresPositiveIntervalTime) {
                var intervalTime = Number(schedule.IntervalTime);
                if (!intervalTime || intervalTime <= 0) {
                    return rule.intervalTimeValidationMessage || invalidTriggerValidationMessage;
                }
            }

            if (rule.requiresStartTime && !schedule.StartTime) {
                return rule.startTimeValidationMessage || invalidTriggerValidationMessage;
            }

            if (rule.requiresDaysOfWeek && !parseDaysOfWeek(schedule.DaysOfWeek).length) {
                return rule.daysOfWeekValidationMessage || invalidTriggerValidationMessage;
            }

            if (rule.requiresDayOfMonthInRange) {
                var dayOfMonth = Number(schedule.DayOfMonth);
                if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
                    return rule.dayOfMonthValidationMessage || invalidTriggerValidationMessage;
                }
            }

            return null;
        }

        function buildScheduleSummary(schedule) {
            if (!schedule) {
                return "";
            }

            if (schedule.TriggerType === "Interval") {
                return schedule.IntervalTime
                    ? "Every " + schedule.IntervalTime + " minutes"
                    : "Recurring interval";
            }

            if (schedule.TriggerType === "Daily") {
                return "Every day at " + (formatScheduleTime(schedule.StartTime) || "--:--");
            }

            if (schedule.TriggerType === "Weekly") {
                var days = formatDaysOfWeek(schedule.DaysOfWeek) || "Select weekdays";
                return days + " at " + (formatScheduleTime(schedule.StartTime) || "--:--");
            }

            if (schedule.TriggerType === "Monthly") {
                var dayText = schedule.DayOfMonth ? "Day " + schedule.DayOfMonth : "Select day";
                return dayText + " at " + (formatScheduleTime(schedule.StartTime) || "--:--");
            }

            return "";
        }

        return {
            defaultTriggerType: defaultTriggerType,
            triggerTypes: triggerTypes,
            weekDayOptions: weekDayOptions,
            getTriggerRule: getTriggerRule,
            formatScheduleTime: formatScheduleTime,
            parseDaysOfWeek: parseDaysOfWeek,
            formatDaysOfWeek: formatDaysOfWeek,
            usesStartTime: usesStartTime,
            applyTriggerDefaults: applyTriggerDefaults,
            validateSchedule: validateSchedule,
            buildScheduleSummary: buildScheduleSummary
        };
    }

    window.TaskSchedulerScheduler = {
        createHelpers: createHelpers
    };
})(window);
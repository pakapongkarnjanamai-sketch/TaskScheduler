(function (window) {
    "use strict";

    function create(config) {
        var serviceUrl = config.serviceUrl;
        var schedulerRules = config.schedulerRules;
        var scheduleTriggerTypes = schedulerRules.triggerTypes;
        var weekDayOptions = schedulerRules.weekDayOptions;
        var parseDaysOfWeek = schedulerRules.parseDaysOfWeek;
        var applyTriggerDefaults = schedulerRules.applyTriggerDefaults;
        var buildScheduleSummary = schedulerRules.buildScheduleSummary;
        var getTriggerRule = schedulerRules.getTriggerRule;
        var validateSchedule = schedulerRules.validateSchedule;

        function patchScheduleRequestValues(rawValues) {
            if (!rawValues) {
                return rawValues;
            }

            var values;
            try {
                values = JSON.parse(rawValues);
            } catch (error) {
                return rawValues;
            }

            var popupContent = $(".dx-overlay-content:visible .dx-popup-content").last();
            if (!popupContent.length) {
                return rawValues;
            }

            var triggerTypeInput = popupContent.find("input[role='combobox']:enabled:visible").first();
            var currentTriggerType = triggerTypeInput.length ? triggerTypeInput.val() : values.TriggerType;
            var numericInput = popupContent.find("input[role='spinbutton']:visible").first();

            if (numericInput.length) {
                var numericValue = Number(numericInput.val());
                if (!Number.isNaN(numericValue)) {
                    if (currentTriggerType === "Interval") {
                        values.IntervalTime = numericValue;
                    }

                    if (currentTriggerType === "Monthly") {
                        values.DayOfMonth = numericValue;
                    }
                }
            }

            return JSON.stringify(values);
        }

        var store = DevExpress.data.AspNet.createStore({
            key: "Id",
            loadUrl: serviceUrl + "Schedules/Get",
            insertUrl: serviceUrl + "Schedules/Post",
            updateUrl: serviceUrl + "Schedules/Put",
            deleteUrl: serviceUrl + "Schedules/Delete",
            onBeforeSend: function (method, ajaxOptions) {
                if ((method === "insert" || method === "update") && ajaxOptions.data && ajaxOptions.data.values) {
                    ajaxOptions.data.values = patchScheduleRequestValues(ajaxOptions.data.values);
                }

                ajaxOptions.xhrFields = { withCredentials: true };
            }
        });

        function createScheduleFormData(source) {
            var formData = $.extend({}, source || {});
            formData.TriggerType = formData.TriggerType || schedulerRules.defaultTriggerType;
            formData.DaysOfWeek = parseDaysOfWeek(formData.DaysOfWeek);
            return formData;
        }

        function render(container, taskId) {
            var scheduleEditForm = null;
            var scheduleEditorState = {
                triggerType: schedulerRules.defaultTriggerType,
                formData: null,
                formHydrated: false
            };

            function ensureScheduleFormHydrated() {
                if (!scheduleEditForm || scheduleEditorState.formHydrated || !scheduleEditorState.formData) {
                    return;
                }

                scheduleEditForm.option("formData", $.extend({}, scheduleEditorState.formData));
                scheduleEditorState.formHydrated = true;
            }

            function applyScheduleFormLayout(triggerType) {
                scheduleEditorState.triggerType = triggerType || schedulerRules.defaultTriggerType;

                if (!scheduleEditForm) {
                    return;
                }

                var formData = scheduleEditForm.option("formData") || {};
                var triggerRule = getTriggerRule(scheduleEditorState.triggerType);

                if (!triggerRule) {
                    return;
                }

                if (triggerRule.usesIntervalTime && !formData.IntervalTime && triggerRule.defaultIntervalTime) {
                    scheduleEditForm.updateData("IntervalTime", triggerRule.defaultIntervalTime);
                }

                if (triggerRule.usesDaysOfWeek && !parseDaysOfWeek(formData.DaysOfWeek).length && triggerRule.defaultDaysOfWeek.length) {
                    scheduleEditForm.updateData("DaysOfWeek", triggerRule.defaultDaysOfWeek.slice());
                }

                if (triggerRule.usesDayOfMonth && !formData.DayOfMonth && triggerRule.defaultDayOfMonth) {
                    scheduleEditForm.updateData("DayOfMonth", triggerRule.defaultDayOfMonth);
                }

                scheduleEditForm.itemOption("timingGroup.intervalTimeField", "visible", !!triggerRule.usesIntervalTime);
                scheduleEditForm.itemOption("timingGroup.startTimeField", "visible", !!triggerRule.usesStartTime);
                scheduleEditForm.itemOption("timingGroup.weekdaysField", "visible", !!triggerRule.usesDaysOfWeek);
                scheduleEditForm.itemOption("timingGroup.dayOfMonthField", "visible", !!triggerRule.usesDayOfMonth);
            }

            $("<div>").dxDataGrid({
                dataSource: {
                    store: store,
                    filter: ["TaskId", "=", taskId]
                },
                remoteOperations: true,
                showBorders: true,
                rowAlternationEnabled: true,
                hoverStateEnabled: true,
                columnAutoWidth: true,
                wordWrapEnabled: true,
                noDataText: "No schedules configured yet.",
                width: "100%",
                height: "100%",
                scrolling: { mode: "virtual" },
                editing: {
                    mode: "popup",
                    allowAdding: true,
                    allowUpdating: true,
                    allowDeleting: true,
                    useIcons: true,
                    popup: {
                        title: "Schedule Rule",
                        showTitle: true,
                        width: 760,
                        maxHeight: 720,
                        height: "auto"
                    },
                    form: {
                        colCount: 2,
                        labelLocation: "top",
                        onInitialized: function (args) {
                            scheduleEditForm = args.component;
                            ensureScheduleFormHydrated();
                            applyScheduleFormLayout(scheduleEditorState.triggerType);
                        },
                        onContentReady: function (args) {
                            scheduleEditForm = args.component;
                            ensureScheduleFormHydrated();
                            applyScheduleFormLayout(scheduleEditorState.triggerType);
                        },
                        items: [
                            {
                                itemType: "group",
                                name: "generalGroup",
                                caption: "General",
                                colSpan: 2,
                                colCount: 2,
                                items: [
                                    {
                                        dataField: "Name",
                                        colSpan: 2,
                                        editorOptions: {
                                            placeholder: "e.g. Morning dispatch"
                                        }
                                    },
                                    {
                                        dataField: "Description",
                                        colSpan: 2,
                                        editorType: "dxTextArea",
                                        editorOptions: {
                                            height: 90,
                                            placeholder: "Optional note for operators"
                                        }
                                    },
                                    {
                                        dataField: "TriggerType"
                                    },
                                    {
                                        dataField: "IsActive",
                                        label: {
                                            text: "Enabled"
                                        }
                                    }
                                ]
                            },
                            {
                                itemType: "group",
                                name: "timingGroup",
                                caption: "Timing",
                                colSpan: 2,
                                colCount: 2,
                                items: [
                                    {
                                        name: "intervalTimeField",
                                        dataField: "IntervalTime",
                                        label: {
                                            text: "Every (minutes)"
                                        },
                                        editorType: "dxNumberBox",
                                        editorOptions: {
                                            min: 1,
                                            valueChangeEvent: "input change blur",
                                            showSpinButtons: true,
                                            step: 1
                                        }
                                    },
                                    {
                                        name: "startTimeField",
                                        dataField: "StartTime",
                                        label: {
                                            text: "Run At"
                                        },
                                        editorType: "dxDateBox",
                                        editorOptions: {
                                            type: "time",
                                            dateSerializationFormat: "HH:mm:ss",
                                            displayFormat: "HH:mm",
                                            pickerType: "native",
                                            interval: 30,
                                            useMaskBehavior: true,
                                            invalidDateMessage: "The time must have the following format: HH:mm"
                                        }
                                    },
                                    {
                                        name: "weekdaysField",
                                        dataField: "DaysOfWeek",
                                        colSpan: 2,
                                        label: {
                                            text: "Weekdays"
                                        },
                                        editorType: "dxTagBox",
                                        editorOptions: {
                                            dataSource: weekDayOptions,
                                            valueExpr: "value",
                                            displayExpr: "text",
                                            showSelectionControls: true,
                                            applyValueMode: "useButtons",
                                            maxDisplayedTags: 4,
                                            multiline: false
                                        }
                                    },
                                    {
                                        name: "dayOfMonthField",
                                        dataField: "DayOfMonth",
                                        label: {
                                            text: "Day Of Month"
                                        },
                                        editorType: "dxNumberBox",
                                        editorOptions: {
                                            min: 1,
                                            max: 31,
                                            valueChangeEvent: "input change blur",
                                            showSpinButtons: true,
                                            step: 1
                                        }
                                    },
                                    {
                                        dataField: "NextExecutionTime",
                                        label: {
                                            text: "Next Run Preview"
                                        },
                                        editorType: "dxDateBox",
                                        editorOptions: {
                                            displayFormat: "dd/MM/yyyy HH:mm",
                                            readOnly: true,
                                            disabled: true
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                },

                onEditorPreparing: function (e) {
                    var rowData = e.row && e.row.data ? e.row.data : {};
                    var triggerType = rowData.TriggerType || scheduleEditorState.triggerType;
                    var triggerRule = getTriggerRule(triggerType);

                    if (e.dataField === "TriggerType") {
                        var defaultHandler = e.editorOptions.onValueChanged;
                        e.editorOptions.onValueChanged = function (args) {
                            applyTriggerDefaults(rowData, args.value);
                            e.setValue(args.value);

                            if (scheduleEditForm) {
                                scheduleEditForm.updateData("IntervalTime", rowData.IntervalTime);
                                scheduleEditForm.updateData("StartTime", rowData.StartTime);
                                scheduleEditForm.updateData("DaysOfWeek", parseDaysOfWeek(rowData.DaysOfWeek));
                                scheduleEditForm.updateData("DayOfMonth", rowData.DayOfMonth);
                            }

                            applyScheduleFormLayout(args.value);

                            if (defaultHandler) {
                                defaultHandler(args);
                            }
                        };
                    }

                    if (e.dataField === "IntervalTime") {
                        e.editorOptions = e.editorOptions || {};
                        e.editorOptions.disabled = !triggerRule || !triggerRule.usesIntervalTime;
                        if (!triggerRule || !triggerRule.usesIntervalTime) {
                            e.editorOptions.value = null;
                        }
                    }

                    if (e.dataField === "StartTime") {
                        e.editorOptions = e.editorOptions || {};
                        e.editorOptions.disabled = !triggerRule || !triggerRule.usesStartTime;
                        if (!triggerRule || !triggerRule.usesStartTime) {
                            e.editorOptions.value = null;
                        }
                    }

                    if (e.dataField === "DaysOfWeek") {
                        e.editorOptions = e.editorOptions || {};
                        e.editorOptions.value = parseDaysOfWeek(rowData.DaysOfWeek);
                        e.editorOptions.disabled = !triggerRule || !triggerRule.usesDaysOfWeek;
                        e.editorOptions.onValueChanged = function (args) {
                            e.setValue(args.value);
                        };
                    }

                    if (e.dataField === "DayOfMonth") {
                        e.editorOptions = e.editorOptions || {};
                        e.editorOptions.disabled = !triggerRule || !triggerRule.usesDayOfMonth;
                        if (!triggerRule || !triggerRule.usesDayOfMonth) {
                            e.editorOptions.value = null;
                        }
                    }
                },

                onRowValidating: function (e) {
                    var nextData = $.extend({}, e.oldData, e.newData);
                    var validationError = validateSchedule(nextData);
                    if (validationError) {
                        e.isValid = false;
                        e.errorText = validationError;
                    }
                },

                onSaving: function (e) {
                    var editRowKey = e.component.option("editing.editRowKey");
                    if ((editRowKey === null || editRowKey === undefined) || !scheduleEditForm) {
                        return;
                    }

                    var formData = $.extend({}, scheduleEditForm.option("formData") || {});
                    if (Array.isArray(formData.DaysOfWeek)) {
                        formData.DaysOfWeek = formData.DaysOfWeek.slice();
                    }

                    if (!e.changes || !e.changes.length) {
                        e.changes = [{
                            type: "update",
                            key: editRowKey,
                            data: formData
                        }];
                        return;
                    }

                    e.changes = e.changes.map(function (change) {
                        if (change.type === "update" && change.key === editRowKey) {
                            change.data = $.extend({}, change.data, formData);
                        }

                        return change;
                    });
                },

                onEditingStart: function (e) {
                    scheduleEditorState.formData = createScheduleFormData(e.data);
                    scheduleEditorState.formHydrated = false;
                    scheduleEditorState.triggerType = e.data.TriggerType || schedulerRules.defaultTriggerType;
                    e.component.option("editing.popup.title", "Edit Schedule");
                },

                columns: [
                    {
                        dataField: "Name",
                        caption: "Schedule",
                        minWidth: 180,
                        validationRules: [{ type: "required" }]
                    },
                    {
                        dataField: "Description",
                        caption: "Description",
                        minWidth: 180,
                        hidingPriority: 1
                    },
                    {
                        dataField: "IsActive",
                        caption: "Enabled",
                        dataType: "boolean",
                        width: 90
                    },
                    {
                        dataField: "TriggerType",
                        caption: "Pattern",
                        width: 120,
                        lookup: {
                            dataSource: scheduleTriggerTypes
                        },
                        validationRules: [{ type: "required" }],
                        setCellValue: function (newData, value) {
                            applyTriggerDefaults(newData, value);
                        }
                    },
                    {
                        caption: "Recurrence",
                        minWidth: 230,
                        allowEditing: false,
                        allowSorting: false,
                        allowFiltering: false,
                        allowHeaderFiltering: false,
                        calculateCellValue: function (data) {
                            return buildScheduleSummary(data);
                        }
                    },
                    {
                        dataField: "IntervalTime",
                        visible: false,
                        showInColumnChooser: false
                    },
                    {
                        dataField: "StartTime",
                        visible: false,
                        showInColumnChooser: false
                    },
                    {
                        dataField: "DaysOfWeek",
                        visible: false,
                        showInColumnChooser: false
                    },
                    {
                        dataField: "DayOfMonth",
                        visible: false,
                        showInColumnChooser: false
                    },
                    {
                        dataField: "NextExecutionTime",
                        caption: "Next Run",
                        dataType: "datetime",
                        format: "dd/MM/yyyy HH:mm",
                        allowEditing: false,
                        width: 150
                    },
                    {
                        type: "buttons",
                        width: 110,
                        buttons: [
                            {
                                name: "edit",
                                hint: "Open schedule editor"
                            },
                            {
                                name: "delete",
                                hint: "Delete schedule"
                            }
                        ]
                    }
                ],

                onToolbarPreparing: function (e) {
                    e.toolbarOptions.items = e.toolbarOptions.items.filter(function (item) {
                        return item.name !== "addRowButton";
                    });

                    e.toolbarOptions.items.unshift({
                        location: "after",
                        widget: "dxButton",
                        options: {
                            icon: "event",
                            text: "Add Schedule",
                            type: "default",
                            stylingMode: "contained",
                            onClick: function () {
                                e.component.addRow();
                            }
                        }
                    });

                    e.toolbarOptions.items.unshift({
                        location: "after",
                        widget: "dxButton",
                        options: {
                            icon: "refresh",
                            hint: "Refresh schedules",
                            onClick: function () {
                                e.component.refresh();
                            }
                        }
                    });
                },

                onInitNewRow: function (e) {
                    e.data.TaskId = taskId;
                    e.data.TriggerType = schedulerRules.defaultTriggerType;
                    e.data.IsActive = true;
                    applyTriggerDefaults(e.data, e.data.TriggerType);

                    scheduleEditorState.formData = createScheduleFormData(e.data);
                    scheduleEditorState.formHydrated = false;
                    scheduleEditorState.triggerType = e.data.TriggerType;
                    e.component.option("editing.popup.title", "Add Schedule");
                }
            }).appendTo(container);
        }

        return {
            render: render
        };
    }

    window.TaskSchedulerScheduleGrid = {
        create: create
    };
})(window);
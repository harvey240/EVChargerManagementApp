export interface TaskTypeDefinition {
    id: string;
    label: string;
    description: string;
    configFields: ConfigField[];
}

export interface ConfigField {
    key: string;
    label: string;
    type: 'text' | 'select' | 'number';
    required: boolean;
    options?: { value: string; label: string }[];
}

export const TASK_TYPES: TaskTypeDefinition[] = [
    {
        id: 'report_publish',
        label: 'Report Publishing',
        description: 'Generates and publishes a report',
        configFields: [
            {
                key: 'reportId',
                label: 'Report',
                type: 'select',
                required: true,
                options: [
                    { value: 'compliance-weekly', label: 'Weekly Compliance Report' },
                    { value: 'usage-monthly', label: 'Monthly Usage Report' },
                    { value: 'billing-summary', label: 'Billing Summary' },
                ],
            },
        ],
    },
    {
        id: 'send_email',
        label: 'Email Notification',
        description: 'Sends an email notification',
        configFields: [
            {
                key: 'templateId',
                label: 'Email Template',
                type: 'select',
                required: true,
                options: [
                    { value: 'weekly-digest', label: 'Weekly Digest' },
                    { value: 'monthly-summary', label: 'Monthly Summary' },
                ],
            },
        ],
    },
    {
        id: 'data_export',
        label: 'Data Export',
        description: 'Exports data to a file',
        configFields: [
            {
                key: 'format',
                label: 'Export Format',
                type: 'select',
                required: true,
                options: [
                    { value: 'csv', label: 'CSV' },
                    { value: 'json', label: 'JSON' },
                    { value: 'xlsx', label: 'Excel' },
                ],
            },
        ],
    },
];

export const SYSTEM_TASKS = [
    {
        name: 'Session Cleanup',
        taskType: 'SYSTEM',
        schedule: 'Every 5 min',
        cron: '*/5 * * * *',
        taskId: 'session_cleanup',
    },
];

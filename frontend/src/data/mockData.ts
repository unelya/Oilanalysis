import { KanbanCard, KanbanColumn, PlannedAnalysis, Role, Sample, Status } from '@/types/kanban';

export const samples: Sample[] = [
  {
    sampleId: 'SMP-2024-0142',
    wellId: '101',
    horizon: 'AV1',
    samplingDate: '2024-12-28',
    status: 'received',
    storageLocation: 'Rack A · Bin 2',
  },
  {
    sampleId: 'SMP-2024-0143',
    wellId: '114',
    horizon: 'BV3',
    samplingDate: '2024-12-27',
    status: 'stored',
    storageLocation: 'Cold room · Shelf 1',
  },
  {
    sampleId: 'SMP-2024-0138',
    wellId: '72',
    horizon: 'CH1',
    samplingDate: '2024-12-25',
    status: 'received',
    storageLocation: 'Dispatch counter',
  },
  {
    sampleId: 'SMP-2024-0135',
    wellId: '88',
    horizon: 'JS2',
    samplingDate: '2024-12-24',
    status: 'stored',
    storageLocation: 'Rack B · Bin 4',
  },
  {
    sampleId: 'SMP-2024-0130',
    wellId: '64',
    horizon: 'AV2',
    samplingDate: '2024-12-20',
    status: 'stored',
    storageLocation: 'Rack C · Bin 1',
  },
  {
    sampleId: 'SMP-2024-0112',
    wellId: '41',
    horizon: 'JS1',
    samplingDate: '2024-12-14',
    status: 'dispatched',
    storageLocation: 'Lab bench',
  },
];

export const plannedAnalyses: PlannedAnalysis[] = [
  {
    id: 'PA-2201',
    sampleId: 'SMP-2024-0142',
    analysisType: 'Viscosity',
    status: 'planned',
    assignedTo: ['Warehouse'],
  },
  {
    id: 'PA-2199',
    sampleId: 'SMP-2024-0143',
    analysisType: 'SARA',
    status: 'planned',
    assignedTo: ['Unassigned'],
  },
  {
    id: 'PA-2192',
    sampleId: 'SMP-2024-0138',
    analysisType: 'SARA',
    status: 'in_progress',
    assignedTo: ['Operator Nina'],
  },
  {
    id: 'PA-2188',
    sampleId: 'SMP-2024-0135',
    analysisType: 'Mass Spectrometry',
    status: 'review',
    assignedTo: ['QA Lead'],
  },
  {
    id: 'PA-2170',
    sampleId: 'SMP-2024-0130',
    analysisType: 'NMR',
    status: 'completed',
    assignedTo: ['Operator Ilya'],
  },
  {
    id: 'PA-2165',
    sampleId: 'SMP-2024-0112',
    analysisType: 'FTIR',
    status: 'failed',
    assignedTo: ['Operator Max'],
  },
];

const statusMap: Record<PlannedAnalysis['status'], { column: Status; label: string }> = {
  planned: { column: 'new', label: 'Planned' },
  in_progress: { column: 'progress', label: 'In Progress' },
  review: { column: 'review', label: 'Review' },
  completed: { column: 'done', label: 'Completed' },
  failed: { column: 'review', label: 'Failed' },
};

export const columnConfigByRole: Record<Role, { id: Status; title: string; filter?: (card: KanbanCard) => boolean }[]> = {
  warehouse_worker: [
    { id: 'new', title: 'Planned' },
    { id: 'progress', title: 'Awaiting arrival' },
    { id: 'review', title: 'Stored' },
    { id: 'done', title: 'Issues' },
  ],
  lab_operator: [
    { id: 'new', title: 'Planned' },
    { id: 'progress', title: 'In progress' },
    { id: 'review', title: 'Needs attention' },
    { id: 'done', title: 'Completed' },
  ],
  action_supervision: [
    { id: 'new', title: 'Uploaded batch' },
    { id: 'progress', title: 'Conflicts' },
    { id: 'done', title: 'Stored' },
  ],
  admin: [
    { id: 'done', title: 'Issues', filter: (card) => card.status === 'done' && !card.adminStored },
    { id: 'review', title: 'Needs attention' },
    { id: 'done', title: 'Stored', filter: (card) => Boolean(card.adminStored) },
    { id: 'new', title: 'Deleted' },
  ],
};

export const getMockCards = (): KanbanCard[] =>
  plannedAnalyses.map((analysis) => {
    const sample = samples.find((s) => s.sampleId === analysis.sampleId);
    const mappedStatus = statusMap[analysis.status];

    return {
      id: analysis.id,
      status: mappedStatus.column,
      statusLabel: mappedStatus.label,
      analysisStatus: analysis.status,
      analysisType: analysis.analysisType,
      assignedTo: analysis.assignedTo?.join(' '),
      sampleId: analysis.sampleId,
      wellId: sample?.wellId ?? '—',
      horizon: sample?.horizon ?? '—',
      samplingDate: sample?.samplingDate ?? '—',
      storageLocation: sample?.storageLocation ?? '—',
      sampleStatus: sample?.status ?? 'received',
    };
  });

const statusRemapByRole: Partial<Record<Role, Partial<Record<Status, Status>>>> = {
  action_supervision: { review: 'progress' },
};

export const getColumnData = (cards: KanbanCard[] = getMockCards(), role: Role = 'lab_operator'): KanbanColumn[] => {
  const config = columnConfigByRole[role] ?? columnConfigByRole.lab_operator;
  const allowedStatuses = new Set(config.map((c) => c.id));

  return config.map((col) => ({
    id: col.id,
    title: col.title,
    cards: cards.filter((card) => {
      const mappedStatus = statusRemapByRole[role]?.[card.status] ?? card.status;
      if (!allowedStatuses.has(mappedStatus) || mappedStatus !== col.id) {
        return false;
      }
      if (col.filter) {
        return col.filter(card);
      }
      return true;
    }),
  }));
};

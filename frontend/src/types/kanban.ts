export type Status = 'new' | 'progress' | 'review' | 'done';

export interface Sample {
  sampleId: string;
  wellId: string;
  horizon: string;
  samplingDate: string;
  status: 'received' | 'stored' | 'dispatched';
  storageLocation: string;
}

export interface PlannedAnalysis {
  id: string;
  sampleId: string;
  analysisType: string;
  status: 'planned' | 'in_progress' | 'review' | 'completed' | 'failed';
  assignedTo?: string[];
}

export interface KanbanCard {
  id: string;
  status: Status;
  statusLabel: string;
  sampleId: string;
  wellId: string;
  horizon: string;
  samplingDate: string;
  storageLocation: string;
  analysisType: string;
  assignedTo?: string;
  analysisStatus: PlannedAnalysis['status'];
  sampleStatus: Sample['status'];
  conflictOld?: string;
  conflictNew?: string;
  conflictResolutionNote?: string | null;
  methods?: { id: number; name: string; status: PlannedAnalysis['status']; assignedTo?: string[] | null }[];
  allMethodsDone?: boolean;
  comments?: CommentThread[];
  deletedReason?: string;
  issueReason?: string;
  returnedFromAdmin?: boolean;
  returnedToWarehouse?: boolean;
  returnNote?: string;
  issueHistory?: string[];
  returnNotes?: string[];
  analysisLabel?: string;
  adminStored?: boolean;
}

export interface NewCardPayload {
  sampleId: string;
  wellId: string;
  horizon: string;
  samplingDate: string;
  storageLocation?: string;
}

export interface PlannedAnalysisCard {
  id: number;
  sampleId: string;
  analysisType: string;
  status: PlannedAnalysis['status'];
  assignedTo?: string[];
}

export interface ActionBatchCard {
  id: number;
  title: string;
  date: string;
  status: Status;
}

export interface ConflictCard {
  id: number;
  oldPayload: string;
  newPayload: string;
  status: 'open' | 'resolved';
  resolutionNote?: string | null;
}

export interface KanbanColumn {
  id: Status;
  title: string;
  cards: KanbanCard[];
}

export type Role = 'warehouse_worker' | 'lab_operator' | 'action_supervision' | 'admin';

export interface CommentThread {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface DeletedInfo {
  reason: string;
  prevStatus: Status;
}

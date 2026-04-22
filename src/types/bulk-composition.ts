export interface GeneratedCopy {
  pattern_id: string;
  appeal_axis_index: number;
  appeal_axis_text: string;
  copy_index: number;
  copy_text: string;
  hook?: string;
}

export interface AppealAxisCopy {
  appeal_axis: string;
  copy_text: string;
  axis_index?: number;
  copy_index?: number;
  pattern_id?: string;
  hook?: string;
}

export type BulkBatchStatus =
  | 'running'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'cancelled';

export interface BulkCompositionBatch {
  id: string;
  project_id: string;
  created_by: string | null;
  total_count: number;
  completed_count: number;
  failed_count: number;
  status: BulkBatchStatus;
  appeal_axes_snapshot: AppealAxisCopy[];
  duration_seconds: number;
  spot_job_ids: string[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface BulkSceneOutput {
  part: string;
  time_range?: string;
  telop?: string;
  visual?: string;
  narration?: string;
}

export interface BulkCompositionJob {
  id: string;
  project_id: string;
  tool_type: 'composition';
  status: 'pending' | 'running' | 'completed' | 'failed';
  input_data: {
    bulk_batch_id?: string;
    bulk_index?: number;
    appeal_axis: string;
    copy_text: string;
    duration_seconds?: number;
    creative_type?: string;
    pattern_id?: string;
    [key: string]: unknown;
  };
  output_data: {
    appeal_axis?: string;
    copy_text?: string;
    scenes?: BulkSceneOutput[];
    [key: string]: unknown;
  } | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

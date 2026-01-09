
export interface Department {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  color: string;
  progress: number;
  notes?: string;
  departmentId: string;
  relatedTaskIds?: string[];
}

export type ViewMode = 'Day' | 'Week' | 'Month';

export interface DragState {
  taskId: string;
  type: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  originalStart: Date;
  originalEnd: Date;
}

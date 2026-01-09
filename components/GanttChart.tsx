
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Task, ViewMode, DragState, Department } from '../types';
import { addDays, differenceInDays, getDatesInRange, startOfDay, formatDate } from '../utils/dateUtils';
import TaskBar from './TaskBar';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';

interface GanttChartProps {
  tasks: Task[];
  departments: Department[];
  viewMode: ViewMode;
  onUpdateTask: (task: Task) => void;
  onTaskClick: (task: Task) => void;
  onTaskDoubleClick: (task: Task) => void;
  onDateClick: (date: Date) => void;
  isDelayed: (task: Task) => boolean;
  onAddDepartment: () => void;
  onUpdateDepartment: (id: string) => void;
  onDeleteDepartment: (id: string) => void;
  onReorderDepartments: (startIndex: number, endIndex: number) => void;
  jumpToTodayTrigger: number;
  selectedTaskId: string | null;
}

const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 80;
const DEPT_COLUMN_WIDTH = 180;

const GanttChart: React.FC<GanttChartProps> = ({ 
  tasks, departments, viewMode, onUpdateTask, onTaskClick, onTaskDoubleClick, onDateClick, isDelayed,
  onAddDepartment, onUpdateDepartment, onDeleteDepartment, onReorderDepartments,
  jumpToTodayTrigger, selectedTaskId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draggedDeptIndex, setDraggedDeptIndex] = useState<number | null>(null);
  const [dragOverDeptIndex, setDragOverDeptIndex] = useState<number | null>(null);

  // 用於工項拖曳的本地預覽狀態，避免拖曳時頻繁觸發全域狀態更新
  const [taskDragPreview, setTaskDragPreview] = useState<{
    taskId: string;
    newStart: Date;
    newEnd: Date;
  } | null>(null);

  const dayWidth = useMemo(() => {
    switch (viewMode) {
      case 'Week': return 15;
      case 'Month': return 6;
      default: return 60;
    }
  }, [viewMode]);

  const timelineDates = useMemo(() => {
    if (tasks.length === 0) {
      const today = startOfDay(new Date());
      return getDatesInRange(addDays(today, -7), addDays(today, 60));
    }
    const starts = tasks.map(t => t.startDate.getTime());
    const ends = tasks.map(t => t.endDate.getTime());
    const minDate = new Date(Math.min(...starts));
    const maxDate = new Date(Math.max(...ends));
    
    const buffer = viewMode === 'Month' ? 90 : 30;
    return getDatesInRange(addDays(minDate, -buffer), addDays(maxDate, buffer));
  }, [tasks, viewMode]);

  const startDate = timelineDates[0];
  const totalWidth = timelineDates.length * dayWidth;

  const handleMouseDown = (e: React.MouseEvent, taskId: string, type: DragState['type']) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setDragState({
      taskId,
      type,
      startX: e.clientX,
      originalStart: new Date(task.startDate),
      originalEnd: new Date(task.endDate),
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaDays = Math.round(deltaX / dayWidth);

    let newStart = new Date(dragState.originalStart);
    let newEnd = new Date(dragState.originalEnd);

    if (dragState.type === 'move') {
      newStart = addDays(dragState.originalStart, deltaDays);
      newEnd = addDays(dragState.originalEnd, deltaDays);
    } else if (dragState.type === 'resize-start') {
      newStart = addDays(dragState.originalStart, deltaDays);
      if (differenceInDays(newEnd, newStart) < 1) newStart = addDays(newEnd, -1);
    } else if (dragState.type === 'resize-end') {
      newEnd = addDays(dragState.originalEnd, deltaDays);
      if (differenceInDays(newEnd, newStart) < 1) newEnd = addDays(newStart, 1);
    }

    // 更新本地預覽，而非全域狀態
    setTaskDragPreview({
      taskId: dragState.taskId,
      newStart,
      newEnd
    });
  }, [dragState, dayWidth]);

  const handleMouseUp = useCallback(() => {
    if (dragState && taskDragPreview) {
      const task = tasks.find(t => t.id === dragState.taskId);
      if (task) {
        onUpdateTask({ 
          ...task, 
          startDate: taskDragPreview.newStart, 
          endDate: taskDragPreview.newEnd 
        });
      }
    }
    setDragState(null);
    setTaskDragPreview(null);
  }, [dragState, taskDragPreview, tasks, onUpdateTask]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = dragState.type === 'move' ? 'grabbing' : 'col-resize';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (jumpToTodayTrigger > 0 && containerRef.current) {
      const today = startOfDay(new Date());
      const offsetDays = differenceInDays(today, startDate);
      const scrollLeft = offsetDays * dayWidth;
      
      const viewportWidth = containerRef.current.clientWidth - DEPT_COLUMN_WIDTH;
      const centeredScroll = scrollLeft - (viewportWidth / 2) + (dayWidth / 2);
      
      containerRef.current.scrollTo({
        left: Math.max(0, centeredScroll),
        behavior: 'smooth'
      });
    }
  }, [jumpToTodayTrigger, startDate, dayWidth]);

  // 部門排序邏輯
  const handleDeptDragStart = (index: number) => {
    setDraggedDeptIndex(index);
  };

  const handleDeptDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverDeptIndex(index);
  };

  const handleDeptDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedDeptIndex !== null && draggedDeptIndex !== index) {
      onReorderDepartments(draggedDeptIndex, index);
    }
    setDraggedDeptIndex(null);
    setDragOverDeptIndex(null);
  };

  const deptData = useMemo(() => {
    let currentY = 0;
    return departments.map((dept, index) => {
      const deptTasks = tasks.filter(t => t.departmentId === dept.id);
      const startY = currentY;
      const height = Math.max(deptTasks.length, 1) * ROW_HEIGHT;
      currentY += height;
      return { ...dept, startY, height, deptTasks, index };
    });
  }, [departments, tasks]);

  const totalHeight = deptData.reduce((acc, d) => acc + d.height, 0);

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [tasks, selectedTaskId]);
  const relatedIds = useMemo(() => selectedTask?.relatedTaskIds || [], [selectedTask]);

  return (
    <div className="w-full h-full overflow-auto bg-slate-50 select-none flex" ref={containerRef}>
      
      {/* 部門標題欄位 */}
      <div className="sticky left-0 z-40 bg-white border-r flex flex-col flex-shrink-0 shadow-lg" style={{ width: DEPT_COLUMN_WIDTH }}>
        <div className="bg-slate-50 border-b flex items-center px-4 justify-between flex-shrink-0" style={{ height: HEADER_HEIGHT }}>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">部門 / 分組</span>
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddDepartment();
            }} 
            title="新增部門"
            className="p-2 bg-white hover:bg-indigo-600 hover:text-white rounded-lg text-indigo-600 transition-all border border-indigo-100 hover:shadow-md active:scale-90"
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        </div>

        {/* 部門列表項目 (支援拖曳排序) */}
        <div className="flex-1">
          {deptData.map((dept, idx) => (
            <div 
              key={dept.id} 
              draggable
              onDragStart={() => handleDeptDragStart(idx)}
              onDragOver={(e) => handleDeptDragOver(e, idx)}
              onDrop={(e) => handleDeptDrop(e, idx)}
              className={`border-b bg-white group hover:bg-slate-50 transition-all relative ${
                draggedDeptIndex === idx ? 'opacity-40 grayscale' : 'opacity-100'
              } ${dragOverDeptIndex === idx ? 'border-t-4 border-t-indigo-500' : ''}`} 
              style={{ height: dept.height }}
            >
              <div className="px-4 py-2 flex flex-col h-full justify-center">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <GripVertical size={14} className="text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0" />
                    <span className="text-sm font-bold text-slate-700 truncate">{dept.name}</span>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onUpdateDepartment(dept.id);
                      }} 
                      title="編輯名稱"
                      className="p-1.5 bg-white hover:bg-indigo-600 hover:text-white rounded-lg transition-all shadow-sm border border-slate-200 hover:border-indigo-600 active:scale-90"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteDepartment(dept.id);
                      }} 
                      title="刪除部門"
                      className="p-1.5 bg-white hover:bg-rose-600 hover:text-white rounded-lg transition-all shadow-sm border border-slate-200 hover:border-rose-600 active:scale-90"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="pl-6">
                  <span className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-tighter">
                    {dept.deptTasks.length} 個工項
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div className="bg-slate-50/20" style={{ height: 100 }} />
        </div>
      </div>

      {/* 甘特圖主體 */}
      <div className="relative flex-shrink-0" style={{ width: totalWidth }}>
        
        {/* 日期時間軸標題 - 保持不動 (sticky 作用在 containerRef 上) */}
        <div className="sticky top-0 z-30 flex bg-white/95 backdrop-blur border-b" style={{ height: HEADER_HEIGHT }}>
          {timelineDates.map((date, i) => {
            const isToday = formatDate(date) === formatDate(new Date());
            const isFirstOfMonth = date.getDate() === 1;
            const isMonday = date.getDay() === 1;
            const weekend = date.getDay() === 0 || date.getDay() === 6;

            let showLabel = false;
            let labelText = '';

            if (viewMode === 'Day') {
              showLabel = true;
              labelText = date.getDate().toString();
            } else if (viewMode === 'Week' && isMonday) {
              showLabel = true;
              labelText = `W${Math.ceil(date.getDate() / 7)}`;
            } else if (viewMode === 'Month' && isFirstOfMonth) {
              showLabel = true;
              labelText = `${date.getMonth() + 1}月`;
            }

            return (
              <div
                key={i}
                onClick={() => onDateClick(date)}
                className={`flex-shrink-0 flex flex-col items-center justify-center border-r text-[9px] font-mono cursor-pointer transition-all hover:bg-indigo-50/50 active:bg-indigo-100/50 ${
                  weekend ? 'bg-slate-50/50' : ''
                }`}
                style={{ width: dayWidth }}
              >
                {showLabel && (
                  <>
                    <span className="text-slate-400 uppercase tracking-tighter">
                      {viewMode === 'Day' ? date.toLocaleDateString('zh-TW', { weekday: 'short' }) : ''}
                    </span>
                    <span className={`text-xs font-black mt-1 ${isToday ? 'bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm' : 'text-slate-700'}`}>
                      {labelText}
                    </span>
                    {isFirstOfMonth && viewMode !== 'Month' && <span className="text-[8px] text-indigo-500 font-black mt-0.5">{date.getMonth() + 1}月</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* 網格主體 */}
        <div className="relative bg-white" style={{ height: Math.max(totalHeight + 100, 600) }}>
          
          <div className="absolute inset-0 flex pointer-events-none">
            {timelineDates.map((date, i) => (
              <div
                key={i}
                className={`flex-shrink-0 border-r ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-slate-50/40' : 'border-slate-50'}`}
                style={{ width: dayWidth }}
              />
            ))}
          </div>

          {/* 橫向分割線 */}
          {deptData.map(dept => (
            <div 
              key={dept.id} 
              className="absolute left-0 right-0 border-b border-slate-100 pointer-events-none" 
              style={{ top: dept.startY + dept.height }}
            />
          ))}

          <div 
            className="absolute top-0 bottom-0 border-l-2 border-rose-400 z-20 pointer-events-none"
            style={{ 
              left: differenceInDays(startOfDay(new Date()), startDate) * dayWidth,
              display: differenceInDays(startOfDay(new Date()), startDate) >= 0 ? 'block' : 'none'
            }}
          >
             <div className="bg-rose-500 text-white text-[8px] px-1.5 py-0.5 rounded-r absolute top-2 font-black shadow-lg">TODAY</div>
          </div>

          <div className="relative z-10">
            {deptData.map(dept => (
              <React.Fragment key={dept.id}>
                {dept.deptTasks.map((task, localIdx) => {
                  // 檢查是否有正在拖曳的本地預覽
                  const isDraggingThis = taskDragPreview?.taskId === task.id;
                  const currentStart = isDraggingThis ? taskDragPreview!.newStart : task.startDate;
                  const currentEnd = isDraggingThis ? taskDragPreview!.newEnd : task.endDate;

                  const startOffset = differenceInDays(currentStart, startDate);
                  const duration = Math.max(differenceInDays(currentEnd, currentStart), 1);
                  const delayed = isDelayed(task);
                  const isSelected = selectedTaskId === task.id;
                  const isRelated = relatedIds.includes(task.id);
                  
                  return (
                    <TaskBar
                      key={task.id}
                      task={{...task, startDate: currentStart, endDate: currentEnd}}
                      x={startOffset * dayWidth}
                      width={duration * dayWidth}
                      top={dept.startY + (localIdx * ROW_HEIGHT)}
                      height={ROW_HEIGHT}
                      onDragStart={handleMouseDown}
                      onClick={() => onTaskClick(task)}
                      onDoubleClick={() => onTaskDoubleClick(task)}
                      isDelayed={delayed}
                      isSelected={isSelected}
                      isRelated={isRelated}
                      isDragging={isDraggingThis}
                      hasAnySelected={!!selectedTaskId}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;

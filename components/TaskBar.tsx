
import React from 'react';
import { Task, DragState } from '../types';
import { AlertCircle, Link } from 'lucide-react';

interface TaskBarProps {
  task: Task;
  x: number;
  width: number;
  top: number;
  height: number;
  onDragStart: (e: React.MouseEvent, taskId: string, type: DragState['type']) => void;
  onClick: () => void;
  onDoubleClick: () => void;
  isDelayed: boolean;
  isSelected: boolean;
  isRelated: boolean;
  isDragging?: boolean;
  hasAnySelected: boolean;
}

const TaskBar: React.FC<TaskBarProps> = ({ 
  task, x, width, top, height, onDragStart, onClick, onDoubleClick, 
  isDelayed, isSelected, isRelated, isDragging, hasAnySelected 
}) => {
  // Hide if completely outside visible range (optimization)
  if (width <= 0 && x < 0) return null;

  const isDimmed = hasAnySelected && !isSelected && !isRelated;

  return (
    <div
      className={`absolute group transition-all duration-300 ${isSelected || isRelated || isDragging ? 'z-30' : 'z-10'} ${
        isDragging ? 'opacity-80 scale-105 shadow-2xl z-50 cursor-grabbing' : 
        isDimmed ? 'opacity-30 scale-95 grayscale-[0.5]' : 'opacity-100 scale-100'
      }`}
      style={{
        left: x + 2,
        width: Math.max(width - 4, 10),
        top: top + 10,
        height: height - 20,
        // 當正在拖曳時，移除 transition 讓位移更流暢
        transition: isDragging ? 'none' : 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      <div className={`absolute -top-4 left-0 flex items-center gap-1.5 whitespace-nowrap pointer-events-none transition-opacity ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
        <span className={`text-[9px] font-black uppercase tracking-tight truncate max-w-[150px] transition-colors ${
          isSelected ? 'text-indigo-600 bg-indigo-50 px-1 rounded shadow-sm' : 
          isRelated ? 'text-amber-600 bg-amber-50 px-1 rounded shadow-sm' :
          isDelayed ? 'text-rose-600' : 'text-slate-500'
        }`}>
          {isRelated && <Link size={8} className="inline-block mr-1" />}
          {task.name}
        </span>
        {isDelayed && <AlertCircle className={`w-3 h-3 animate-pulse ${isSelected ? 'text-indigo-500' : 'text-rose-500'}`} />}
      </div>

      <div
        className={`relative h-full rounded-lg shadow-sm border overflow-hidden cursor-pointer transition-all ${
          isDragging
            ? 'border-white ring-4 ring-indigo-400 shadow-2xl scale-110'
            : isSelected 
            ? 'border-indigo-600 shadow-indigo-300 ring-4 ring-indigo-200 ring-offset-2 scale-105' 
            : isRelated 
            ? 'border-amber-400 shadow-amber-200 ring-4 ring-amber-100 ring-offset-1 scale-102'
            : isDelayed 
            ? 'border-rose-500 shadow-rose-200' 
            : 'border-black/10'
        }`}
        style={{ backgroundColor: task.color }}
        onMouseDown={(e) => onDragStart(e, task.id, 'move')}
      >
        {/* Progress Fill */}
        <div 
          className="absolute top-0 left-0 bottom-0 bg-black/30 pointer-events-none transition-all duration-500"
          style={{ width: `${task.progress}%` }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

        {(width > 40 || isSelected || isDragging) && (
          <div className="absolute inset-0 flex items-center px-2 text-[9px] text-white font-black select-none drop-shadow-md">
            {task.progress}%
          </div>
        )}
      </div>

      {/* Resize Handles */}
      {width > 15 && !isDimmed && !isDragging && (
        <>
          <div
            className="absolute top-0 left-0 w-3 h-full cursor-col-resize opacity-0 group-hover:opacity-100 bg-white/30 z-20 transition-all rounded-l-lg"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart(e, task.id, 'resize-start');
            }}
          />
          <div
            className="absolute top-0 right-0 w-3 h-full cursor-col-resize opacity-0 group-hover:opacity-100 bg-white/30 z-20 transition-all rounded-r-lg"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart(e, task.id, 'resize-end');
            }}
          />
        </>
      )}
    </div>
  );
};

export default TaskBar;

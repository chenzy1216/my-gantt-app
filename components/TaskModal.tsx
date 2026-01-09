
import React, { useState } from 'react';
import { Task, Department } from '../types';
import { formatDate, startOfDay } from '../utils/dateUtils';
import { Save, Trash2, X, AlertTriangle, Calendar, Info, Users, Link as LinkIcon } from 'lucide-react';

interface TaskModalProps {
  task: Task;
  allTasks: Task[];
  departments: Department[];
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
  isDelayed: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, allTasks, departments, onClose, onSave, onDelete, isDelayed }) => {
  const [edited, setEdited] = useState<Task>({ ...task, relatedTaskIds: task.relatedTaskIds || [] });

  const handleDateChange = (field: 'startDate' | 'endDate', val: string) => {
    const newDate = startOfDay(new Date(val));
    setEdited(prev => ({ ...prev, [field]: newDate }));
  };

  const toggleRelatedTask = (taskId: string) => {
    setEdited(prev => {
      const current = prev.relatedTaskIds || [];
      const next = current.includes(taskId) 
        ? current.filter(id => id !== taskId) 
        : [...current, taskId];
      return { ...prev, relatedTaskIds: next };
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className={`px-6 py-5 flex items-center justify-between border-b ${isDelayed ? 'bg-rose-50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDelayed ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">編輯工項</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Schedule & Allocation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {isDelayed && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="text-rose-500 w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-rose-600 leading-relaxed">
                <h4 className="font-bold text-rose-800 mb-0.5">進度延誤警告</h4>
                當前日期已超過預計結束日期（{formatDate(task.endDate)}）。
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">工項名稱</label>
            <input
              type="text"
              value={edited.name}
              onChange={(e) => setEdited({ ...edited, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1">
                <Users size={12} /> 所屬部門 / 分組
              </label>
              <select
                value={edited.departmentId}
                onChange={(e) => setEdited({ ...edited, departmentId: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">識別顏色</label>
              <input
                type="color"
                value={edited.color}
                onChange={(e) => setEdited({ ...edited, color: e.target.value })}
                className="w-full h-10 p-1 border rounded-xl cursor-pointer bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">開始日期</label>
              <input
                type="date"
                value={formatDate(edited.startDate)}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">結束日期</label>
              <input
                type="date"
                value={formatDate(edited.endDate)}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex justify-between">
              <span>進度 ({edited.progress}%)</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={edited.progress}
              onChange={(e) => setEdited({ ...edited, progress: parseInt(e.target.value) })}
              className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1">
              <LinkIcon size={12} /> 關聯工項 (點擊發亮)
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 max-h-32 overflow-y-auto space-y-1">
              {allTasks.length > 0 ? (
                allTasks.map(otherTask => (
                  <label key={otherTask.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors text-xs">
                    <input 
                      type="checkbox"
                      checked={edited.relatedTaskIds?.includes(otherTask.id)}
                      onChange={() => toggleRelatedTask(otherTask.id)}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: otherTask.color }} />
                    <span className="truncate font-medium text-slate-700">{otherTask.name}</span>
                  </label>
                ))
              ) : (
                <div className="text-[10px] text-slate-400 italic p-2 text-center">目前沒有其他工項可關聯</div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1">
              <Info size={12} /> 工項備註
            </label>
            <textarea
              value={edited.notes || ''}
              onChange={(e) => setEdited({ ...edited, notes: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm min-h-[100px] resize-none"
              placeholder="任務細節..."
            />
          </div>
        </div>

        <div className="px-6 py-5 bg-slate-50 border-t flex items-center justify-between">
          <button onClick={() => onDelete(task.id)} className="flex items-center gap-2 text-rose-500 hover:text-rose-600 font-bold text-sm px-3 py-2 rounded-lg hover:bg-rose-100/50">
            <Trash2 size={16} /> 刪除
          </button>
          
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-6 py-2 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-200 transition-colors">取消</button>
            <button onClick={() => onSave(edited)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all">
              <Save size={16} /> 儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;

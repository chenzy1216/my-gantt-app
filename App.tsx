
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Task, ViewMode, Department } from './types';
import { addDays, startOfDay, formatDate } from './utils/dateUtils';
import { GeminiService } from './services/geminiService';
import GanttChart from './components/GanttChart';
import TaskModal from './components/TaskModal';
import DateSummaryModal from './components/DateSummaryModal';
import DepartmentModal from './components/DepartmentModal';
import { Plus, Sparkles, LayoutPanelLeft, AlertCircle, Clock, LocateFixed, Edit3 } from 'lucide-react';

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: '開發部' },
  { id: 'dept-2', name: '設計部' },
  { id: 'dept-3', name: '維運部' },
];

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    name: '需求分析 & 規劃',
    startDate: startOfDay(new Date()),
    endDate: addDays(startOfDay(new Date()), 5),
    color: '#6366f1',
    progress: 80,
    notes: '初步客戶訪談已完成，待確認預算細節。',
    departmentId: 'dept-1',
    relatedTaskIds: ['3']
  },
  {
    id: '2',
    name: 'UI/UX 設計系統',
    startDate: addDays(startOfDay(new Date()), -5),
    endDate: addDays(startOfDay(new Date()), -1),
    color: '#ec4899',
    progress: 45,
    notes: '目前的進度落後，設計師生病請假中。',
    departmentId: 'dept-2',
    relatedTaskIds: []
  },
  {
    id: '3',
    name: '前端架構搭建',
    startDate: addDays(startOfDay(new Date()), 8),
    endDate: addDays(startOfDay(new Date()), 15),
    color: '#10b981',
    progress: 10,
    notes: '預計使用 React 19 與 Tailwind CSS。',
    departmentId: 'dept-1',
    relatedTaskIds: ['1']
  },
];

const EditableHeader: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  inputClassName?: string;
}> = ({ value, onChange, className, inputClassName }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue.trim()) onChange(tempValue.trim());
    else setTempValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-slate-100 outline-none border-b-2 border-indigo-500 rounded px-1 ${inputClassName}`}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`group cursor-pointer flex items-center gap-2 hover:bg-slate-50 px-1 rounded transition-colors ${className}`}
    >
      {value}
      <Edit3 size={12} className="opacity-0 group-hover:opacity-40 transition-opacity text-indigo-600" />
    </div>
  );
};

const App: React.FC = () => {
  const [projectTitle, setProjectTitle] = useState('Gemini Gantt Master');
  const [projectSubtitle, setProjectSubtitle] = useState('Departmental Schedule');
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [viewMode, setViewMode] = useState<ViewMode>('Day');
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'ai'>('edit');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [summaryDate, setSummaryDate] = useState<Date | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [jumpToTodayTrigger, setJumpToTodayTrigger] = useState(0);

  const [deptToEdit, setDeptToEdit] = useState<{ id?: string, name: string } | null>(null);

  const geminiService = useMemo(() => new GeminiService(), []);

  const isDelayed = (task: Task) => {
    const today = startOfDay(new Date());
    return task.endDate < today && task.progress < 100;
  };

  const handleAddTask = useCallback(() => {
    const defaultDept = departments[0]?.id || 'dept-1';
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      name: '新工項',
      startDate: startOfDay(new Date()),
      endDate: addDays(startOfDay(new Date()), 3),
      color: '#94a3b8',
      progress: 0,
      notes: '',
      departmentId: defaultDept,
      relatedTaskIds: []
    };
    setTasks(prev => [...prev, newTask]);
    setEditingTask(newTask);
  }, [departments]);

  const handleUpdateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setEditingTask(null);
  }, []);

  const handleDeleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setEditingTask(null);
    if (selectedTaskId === id) setSelectedTaskId(null);
  }, [selectedTaskId]);

  const handleOpenAddDept = useCallback(() => setDeptToEdit({ name: '' }), []);
  const handleOpenEditDept = useCallback((id: string) => {
    const dept = departments.find(d => d.id === id);
    if (dept) setDeptToEdit({ id: dept.id, name: dept.name });
  }, [departments]);

  const handleSaveDepartment = useCallback((name: string) => {
    if (deptToEdit?.id) {
      setDepartments(prev => prev.map(d => d.id === deptToEdit.id ? { ...d, name } : d));
    } else {
      setDepartments(prev => [...prev, { id: `dept-${Date.now()}`, name }]);
    }
    setDeptToEdit(null);
  }, [deptToEdit]);

  const handleDeleteDepartment = useCallback((id: string) => {
    const deptTasks = tasks.filter(t => t.departmentId === id);
    if (deptTasks.length > 0) {
      if (!confirm(`該部門下尚有 ${deptTasks.length} 個工項，刪除部門後這些工項可能無法正確分類。確定要刪除嗎？`)) return;
    } else {
      if (!confirm('確定要刪除此部門嗎？')) return;
    }
    setDepartments(prev => prev.filter(d => d.id !== id));
  }, [tasks]);

  const handleReorderDepartments = useCallback((startIndex: number, endIndex: number) => {
    const result = Array.from(departments);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setDepartments(result);
  }, [departments]);

  const handleAiSuggest = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    try {
      const suggestions = await geminiService.parseTaskInput(aiInput, formatDate(new Date()));
      const newTasks: Task[] = suggestions.map((s: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: s.name,
        startDate: addDays(startOfDay(new Date()), s.offsetFromBase),
        endDate: addDays(startOfDay(new Date()), s.offsetFromBase + s.durationDays),
        color: s.color || '#6366f1',
        progress: s.progress || 0,
        notes: `由 AI 自動生成 - ${s.name}`,
        departmentId: departments[0]?.id || 'dept-1',
        relatedTaskIds: []
      }));
      setTasks(prev => [...prev, ...newTasks]);
      setAiInput('');
      setActiveTab('edit');
    } catch (error) {
      console.error("AI Error", error);
      alert("AI 處理失敗，請稍後再試。");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleTaskSingleClick = (task: Task) => {
    if (selectedTaskId === task.id) {
      setSelectedTaskId(null);
    } else {
      setSelectedTaskId(task.id);
    }
  };

  const handleTaskDoubleClick = (task: Task) => {
    setEditingTask(task);
  };

  const handleDateClick = (date: Date) => {
    setSummaryDate(date);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" onClick={() => setSelectedTaskId(null)}>
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-50" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-100">
            <LayoutPanelLeft className="text-white w-6 h-6" />
          </div>
          <div>
            <EditableHeader 
              value={projectTitle} 
              onChange={setProjectTitle}
              className="text-xl font-bold text-slate-800 tracking-tight"
              inputClassName="text-xl font-bold text-slate-800"
            />
            <EditableHeader 
              value={projectSubtitle} 
              onChange={setProjectSubtitle}
              className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-0.5"
              inputClassName="text-[10px] text-slate-500 font-black uppercase tracking-widest"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setJumpToTodayTrigger(prev => prev + 1)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border border-slate-200 active:scale-95"
          >
            <LocateFixed size={16} className="text-indigo-600" />
            <span>今日</span>
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['Day', 'Week', 'Month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${
                  viewMode === mode ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode === 'Day' ? '日' : mode === 'Week' ? '週' : '月'}
              </button>
            ))}
          </div>
          <button
            onClick={handleAddTask}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            <span>新增工項</span>
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r bg-white flex flex-col shadow-xl z-20" onClick={(e) => e.stopPropagation()}>
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
                activeTab === 'edit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
              }`}
            >
              工項清單
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'ai' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
              }`}
            >
              <Sparkles size={14} />
              AI 助手
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
            {activeTab === 'edit' ? (
              <div className="space-y-3 pb-20">
                {tasks.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                      <Clock size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-400">目前尚無工項</p>
                  </div>
                ) : (
                  tasks.map(task => {
                    const delayed = isDelayed(task);
                    const isSelected = selectedTaskId === task.id;
                    const isRelated = selectedTaskId && tasks.find(t => t.id === selectedTaskId)?.relatedTaskIds?.includes(task.id);

                    return (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskSingleClick(task);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleTaskDoubleClick(task);
                        }}
                        className={`group p-4 rounded-xl border-2 cursor-pointer transition-all bg-white hover:shadow-lg ${
                          isSelected ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-indigo-100' : 
                          isRelated ? 'border-amber-400 shadow-amber-50' :
                          delayed ? 'border-rose-200 hover:border-rose-300' : 'border-slate-100 hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 pr-2">
                            <h3 className={`font-bold text-sm flex items-center gap-2 ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                              {task.name}
                              {delayed && <AlertCircle className="text-rose-500 w-4 h-4 animate-pulse" />}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                               <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-black uppercase tracking-wider border border-slate-200">
                                 {departments.find(d => d.id === task.departmentId)?.name || '未分類'}
                               </span>
                               {delayed && (
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 px-1.5 py-0.5 rounded">已延期</span>
                               )}
                            </div>
                          </div>
                          <div className="w-5 h-5 rounded-lg border border-black/5 flex-shrink-0 shadow-sm" style={{ backgroundColor: task.color }} />
                        </div>
                        <div className="flex flex-col gap-1 text-[11px] text-slate-400 font-bold mt-3">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-slate-300" />
                            <span>{formatDate(task.startDate)} → {formatDate(task.endDate)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="例如：我需要建立一個為期一個月的網站改版計畫，包含需求分析、視覺設計與前端開發..."
                    className="w-full h-56 p-4 text-sm border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 focus:outline-none resize-none bg-white shadow-inner transition-all font-medium"
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-400 bg-white/80 px-2 py-1 rounded backdrop-blur">
                    Gemini 3.0 Powered
                  </div>
                </div>
                <button
                  disabled={isAiLoading || !aiInput.trim()}
                  onClick={handleAiSuggest}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-3.5 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
                >
                  {isAiLoading ? (
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={18} className="text-indigo-400" />
                      <span>智能生成專案排程</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
          <GanttChart
            tasks={tasks}
            departments={departments}
            viewMode={viewMode}
            onUpdateTask={(updatedTask) => {
              setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
            }}
            onTaskClick={handleTaskSingleClick}
            onTaskDoubleClick={handleTaskDoubleClick}
            onDateClick={handleDateClick}
            isDelayed={isDelayed}
            onAddDepartment={handleOpenAddDept}
            onUpdateDepartment={handleOpenEditDept}
            onDeleteDepartment={handleDeleteDepartment}
            onReorderDepartments={handleReorderDepartments}
            jumpToTodayTrigger={jumpToTodayTrigger}
            selectedTaskId={selectedTaskId}
          />
        </div>
      </main>

      {editingTask && (
        <TaskModal
          task={editingTask}
          allTasks={tasks.filter(t => t.id !== editingTask.id)}
          departments={departments}
          onClose={() => setEditingTask(null)}
          onSave={handleUpdateTask}
          onDelete={handleDeleteTask}
          isDelayed={isDelayed(editingTask)}
        />
      )}

      {summaryDate && (
        <DateSummaryModal
          date={summaryDate}
          tasks={tasks}
          onClose={() => setSummaryDate(null)}
          onTaskClick={(task) => {
             setSummaryDate(null);
             setEditingTask(task);
          }}
        />
      )}

      {deptToEdit && (
        <DepartmentModal
          initialName={deptToEdit.name}
          mode={deptToEdit.id ? 'edit' : 'add'}
          onClose={() => setDeptToEdit(null)}
          onSave={handleSaveDepartment}
        />
      )}
    </div>
  );
};

export default App;

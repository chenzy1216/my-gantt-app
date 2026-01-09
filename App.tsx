
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Task, ViewMode, Department } from './types';
import { addDays, startOfDay, formatDate } from './utils/dateUtils';
import { GeminiService } from './services/geminiService';
import GanttChart from './components/GanttChart';
import TaskModal from './components/TaskModal';
import DateSummaryModal from './components/DateSummaryModal';
import DepartmentModal from './components/DepartmentModal';
import { Plus, Sparkles, LayoutPanelLeft, AlertCircle, Clock, LocateFixed, Edit3, Settings, Download, Upload, Share2, Trash2, CheckCircle, Link, Copy, ShieldAlert } from 'lucide-react';

const STORAGE_KEY = 'gemini_gantt_data';

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
  }
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
  const [activeTab, setActiveTab] = useState<'edit' | 'ai' | 'settings'>('edit');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [summaryDate, setSummaryDate] = useState<Date | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [jumpToTodayTrigger, setJumpToTodayTrigger] = useState(0);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showSharedToast, setShowSharedToast] = useState(false);

  const [deptToEdit, setDeptToEdit] = useState<{ id?: string, name: string } | null>(null);

  const geminiService = useMemo(() => new GeminiService(), []);

  // 輔助函式：Unicode 安全的 Base64 編碼
  const encodeData = (data: any) => {
    const jsonStr = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  };

  // 輔助函式：Unicode 安全的 Base64 解碼
  const decodeData = (encoded: string) => {
    const binStr = atob(encoded);
    const decodedUri = Array.from(binStr).map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('');
    return JSON.parse(decodeURIComponent(decodedUri));
  };

  const loadProjectData = useCallback((data: any) => {
    if (!data) return;
    try {
      if (data.projectTitle) setProjectTitle(data.projectTitle);
      if (data.projectSubtitle) setProjectSubtitle(data.projectSubtitle);
      if (data.departments && Array.isArray(data.departments)) setDepartments(data.departments);
      if (data.tasks && Array.isArray(data.tasks)) {
        setTasks(data.tasks.map((t: any) => ({
          ...t,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate)
        })));
      }
    } catch (err) {
      console.error("Error applying project data", err);
    }
  }, []);

  // 初始化載入邏輯：優化後的載入流程，確保不會卡死
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryData = urlParams.get('data');
    
    // 優先檢查網址參數
    if (queryData) {
      try {
        const decoded = decodeData(queryData);
        loadProjectData(decoded);
        // 清理網址參數，保持乾淨
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      } catch (e) { 
        console.error("URL Data Error", e);
        // 如果網址錯誤，不中斷，繼續載入本地快取
      }
    }

    // 其次檢查本地儲存
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        loadProjectData(parsed);
      } catch (e) { 
        console.error("Load LocalStorage Error", e);
        // 本地快取也壞了，則保持初始狀態 (INITIAL_TASKS)
      }
    }
  }, [loadProjectData]);

  // 自動儲存
  useEffect(() => {
    const dataToSave = {
      projectTitle,
      projectSubtitle,
      departments,
      tasks: tasks.map(t => ({
        ...t,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString()
      }))
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    
    setShowSavedToast(true);
    const timer = setTimeout(() => setShowSavedToast(false), 2000);
    return () => clearTimeout(timer);
  }, [projectTitle, projectSubtitle, departments, tasks]);

  const handleShareLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentData = {
      projectTitle,
      projectSubtitle,
      departments,
      tasks: tasks.map(t => ({
        ...t,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString()
      }))
    };
    
    try {
      const encoded = encodeData(currentData);
      const baseUrl = window.location.href.split('?')[0].split('#')[0];
      const url = `${baseUrl}?data=${encoded}`;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          setShowSharedToast(true);
          setTimeout(() => setShowSharedToast(false), 3000);
        }).catch(err => {
          console.error('Clipboard API failed', err);
          window.prompt("分享連結已產生，請複製以下網址：", url);
        });
      } else {
        window.prompt("分享連結已產生，請複製以下網址：", url);
      }
    } catch (e) {
      console.error(e);
      alert('產生分享連結失敗，資料量可能超出限制。');
    }
  };

  const handleExport = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectTitle}_${formatDate(new Date())}.json`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        loadProjectData(data);
        alert('匯入成功！');
      } catch (e) { alert('匯入失敗，請確認檔案格式是否正確。'); }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('確定要清空所有資料嗎？此操作無法還原。')) {
      setTasks([]);
      setDepartments(INITIAL_DEPARTMENTS);
      setProjectTitle('Gemini Gantt Master');
      setProjectSubtitle('Departmental Schedule');
    }
  };

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
    if (!aiInput.trim() || !geminiService.isAvailable()) return;
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

  const isAiAvailable = geminiService.isAvailable();

  return (
    <div className="flex flex-col h-screen overflow-hidden" onClick={() => setSelectedTaskId(null)}>
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-50" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-100">
            <LayoutPanelLeft className="text-white w-6 h-6" />
          </div>
          <div className="relative">
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
            {showSavedToast && (
              <div className="absolute -right-20 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 animate-in fade-in slide-in-from-left-2">
                <CheckCircle size={8} /> 已自動儲存
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 relative">
          <button
            type="button"
            onClick={handleShareLink}
            title="點擊後自動複製連結給同事"
            className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-1.5 rounded-lg text-sm font-bold transition-all border border-amber-200 active:scale-95 shadow-sm"
          >
            <Share2 size={16} />
            <span>分享目前進度</span>
          </button>

          {showSharedToast && (
            <div className="absolute top-12 left-0 right-0 flex justify-center z-[60] pointer-events-none">
              <div className="bg-slate-800 text-white text-[11px] font-black px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
                <CheckCircle size={14} className="text-emerald-400" />
                分享連結已複製！傳給同事即可分享。
              </div>
            </div>
          )}

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
            {(['edit', 'ai', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10' : 'border-transparent text-slate-400'
                }`}
              >
                {tab === 'edit' ? '清單' : tab === 'ai' ? 'AI' : <Settings size={14} />}
              </button>
            ))}
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
            ) : activeTab === 'ai' ? (
              <div className="space-y-4">
                {isAiAvailable ? (
                  <>
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
                  </>
                ) : (
                  <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                    <ShieldAlert size={32} className="text-slate-400 mx-auto mb-3" />
                    <h5 className="text-sm font-bold text-slate-700 mb-1">AI 功能目前不可用</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      環境中未偵測到有效 API Key。您仍可以手動新增工項或載入備份檔。
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">共享與備份</h4>
                  <div className="space-y-2">
                    <button 
                      onClick={handleShareLink}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                          <Share2 size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-700">複製分享連結</p>
                          <p className="text-[10px] text-slate-400">直接透過 URL 分享目前排程</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={handleExport}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Download size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-700">下載專案檔案</p>
                          <p className="text-[10px] text-slate-400">匯出為 JSON 備份</p>
                        </div>
                      </div>
                    </button>

                    <label className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Upload size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-700">匯入專案檔案</p>
                          <p className="text-[10px] text-slate-400">載入 JSON 備份檔</p>
                        </div>
                      </div>
                      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">危險區域</h4>
                  <button 
                    onClick={handleReset}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition-all"
                  >
                    <Trash2 size={16} />
                    <span className="text-sm font-bold">清空所有工項與設定</span>
                  </button>
                </div>
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

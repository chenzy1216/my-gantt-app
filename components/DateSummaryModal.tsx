
import React from 'react';
import { Task } from '../types';
import { formatDate, startOfDay, differenceInDays } from '../utils/dateUtils';
import { X, Calendar, ArrowRight, Target, CheckCircle2, AlertCircle, Clock, TrendingUp } from 'lucide-react';

interface DateSummaryModalProps {
  date: Date;
  tasks: Task[];
  onClose: () => void;
  onTaskClick: (task: Task) => void;
}

const DateSummaryModal: React.FC<DateSummaryModalProps> = ({ date, tasks, onClose, onTaskClick }) => {
  const activeTasks = tasks.filter(task => {
    const d = startOfDay(date);
    return d >= startOfDay(task.startDate) && d <= startOfDay(task.endDate);
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
        <div className="px-6 py-5 flex items-center justify-between border-b bg-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{formatDate(date)}</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">工項進度總覽</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[60vh] bg-slate-50/30">
          {activeTasks.length === 0 ? (
            <div className="text-center py-10">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Calendar size={32} />
              </div>
              <p className="text-slate-500 text-sm font-medium">此日期目前無排定工項</p>
            </div>
          ) : (
            activeTasks.map(task => {
              const totalDuration = differenceInDays(task.endDate, task.startDate) || 1;
              const elapsed = differenceInDays(date, task.startDate);
              const targetProgress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
              const isBehind = task.progress < targetProgress;

              return (
                <div 
                  key={task.id} 
                  onClick={() => onTaskClick(task)}
                  className="group p-4 rounded-xl border border-slate-200 bg-white hover:bg-white hover:shadow-lg hover:border-indigo-300 cursor-pointer transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: task.color }} />
                        {task.name}
                      </h4>
                    </div>
                    {task.progress === 100 ? (
                       <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                    ) : isBehind ? (
                       <AlertCircle className="text-rose-500 w-5 h-5 animate-pulse" />
                    ) : (
                       <TrendingUp className="text-indigo-500 w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* 實際進度 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">當前實際進度</span>
                        <span className={`text-xs font-black ${isBehind ? 'text-rose-500' : 'text-indigo-600'}`}>{task.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full transition-all duration-700 ease-out ${isBehind ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]'}`} 
                          style={{ width: `${task.progress}%` }} 
                        />
                      </div>
                    </div>

                    {/* 目標與提示 */}
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">目標進度</span>
                        <div className="text-xs font-bold text-slate-600">{targetProgress}%</div>
                      </div>
                      <div className="flex-shrink-0">
                        {isBehind ? (
                          <div className="px-2 py-1 rounded bg-rose-50 text-rose-600 text-[10px] font-black border border-rose-100 flex items-center gap-1">
                            落後 {targetProgress - task.progress}%
                          </div>
                        ) : task.progress === 100 ? (
                          <div className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100">
                            已完成
                          </div>
                        ) : (
                          <div className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-[10px] font-black border border-indigo-100">
                            符合進度
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-1 text-[10px] font-bold text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-300" />
                      {formatDate(task.startDate)} <ArrowRight size={10} className="text-slate-300" /> {formatDate(task.endDate)}
                    </div>
                    <div className="group-hover:text-indigo-500 transition-colors">
                      點擊編輯 <ArrowRight size={10} className="inline ml-0.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-4 bg-white border-t flex justify-center">
          <button 
            onClick={onClose}
            className="px-10 py-2.5 bg-slate-800 hover:bg-slate-900 rounded-xl font-bold text-sm text-white transition-all shadow-md shadow-slate-100 active:scale-95"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateSummaryModal;

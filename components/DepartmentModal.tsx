
import React, { useState, useEffect } from 'react';
import { X, Save, Layers } from 'lucide-react';

interface DepartmentModalProps {
  initialName?: string;
  onClose: () => void;
  onSave: (name: string) => void;
  mode: 'add' | 'edit';
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({ initialName = '', onClose, onSave, mode }) => {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 flex items-center justify-between border-b bg-slate-50">
          <div className="flex items-center gap-2 text-indigo-600">
            <Layers size={18} />
            <h2 className="font-bold text-slate-800">{mode === 'add' ? '新增部門/分組' : '編輯名稱'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">名稱</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：行銷部、專案 A 組..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium text-sm"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose} 
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
            <button 
              type="submit"
              disabled={!name.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              <Save size={16} />
              確定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentModal;

import React from 'react';
import { BackgroundTask } from '../types';
import { XCircleIcon } from './icons';

interface TaskItemProps {
    task: BackgroundTask;
    onCancel: (id: string) => void;
    onClear: (id: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onCancel, onClear }) => {
    const isRunning = task.status === 'running';
    const isFinished = task.status === 'completed' || task.status === 'error' || task.status === 'cancelled';
    
    return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg w-full text-sm text-slate-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 animate-fade-in">
            <div className="flex justify-between items-center gap-4">
                <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{task.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{task.message}</p>
                </div>
                {isRunning && (
                    <button 
                        onClick={() => onCancel(task.id)} 
                        className="flex-shrink-0 text-xs font-semibold text-red-500 hover:text-red-400 transition-colors"
                    >
                        Cancel
                    </button>
                )}
                {isFinished && (
                    <button 
                        onClick={() => onClear(task.id)} 
                        className="flex-shrink-0 text-slate-400 hover:text-white p-1 rounded-full"
                        aria-label="Clear task"
                    >
                        <XCircleIcon />
                    </button>
                )}
            </div>
            {isRunning && typeof task.progress === 'number' && (
                <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-brand-primary h-1.5 rounded-full" style={{ width: `${task.progress}%`, transition: 'width 0.3s ease' }}></div>
                </div>
            )}
        </div>
    );
};

interface BackgroundTaskDisplayProps {
    tasks: BackgroundTask[];
    onCancel: (id: string) => void;
    onClear: (id: string) => void;
}

const BackgroundTaskDisplay: React.FC<BackgroundTaskDisplayProps> = ({ tasks, onCancel, onClear }) => {
    if (tasks.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 z-50 w-72 space-y-3">
            {tasks.map(task => (
                <TaskItem key={task.id} task={task} onCancel={onCancel} onClear={onClear} />
            ))}
        </div>
    );
};

export default BackgroundTaskDisplay;
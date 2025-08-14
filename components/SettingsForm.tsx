
import React, { useState } from 'react';

interface SettingsFormProps {
  initialApiKey: string;
  initialUseProxy: boolean;
  onSave: (apiKey: string, useProxy: boolean) => Promise<void>;
  onClose: () => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({ initialApiKey, initialUseProxy, onSave, onClose }) => {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [useProxy, setUseProxy] = useState(initialUseProxy);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(apiKey, useProxy);
    setIsSaving(false);
  };

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
        document.body.style.overflow = 'unset';
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
        onClose();
    }
  };

  return (
    <div onClick={handleBackdropClick} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" aria-modal="true" role="dialog">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 relative">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                aria-label="Close settings"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h2 id="settings-title" className="text-2xl font-bold text-white mb-6">Settings</h2>
            <form onSubmit={handleSubmit} className="space-y-6" aria-labelledby="settings-title">
                <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300 mb-2">
                        Billetto API Keypair
                    </label>
                    <input
                        type="password"
                        id="apiKey"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder="YourAPIKey:YourAPISecret"
                        required
                        aria-required="true"
                    />
                    <p className="text-xs text-slate-500 mt-2">Find this in your Billetto account under Developers.</p>
                </div>

                <div>
                    <label htmlFor="useProxy" className="flex items-center space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            id="useProxy"
                            checked={useProxy}
                            onChange={(e) => setUseProxy(e.target.checked)}
                            className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-brand-primary focus:ring-brand-primary"
                            aria-describedby="proxy-description"
                        />
                        <span className="text-sm font-medium text-slate-300">
                            Use CORS Proxy
                        </span>
                    </label>
                    <p id="proxy-description" className="text-xs text-slate-500 mt-2">
                        Required for use in a web browser. Disable if you are running this in an environment without CORS restrictions (e.g. via a local server).
                    </p>
                </div>
                
                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-brand-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-wait"
                >
                    {isSaving ? 'Clearing Cache...' : 'Save & Fetch Data'}
                </button>
            </form>
        </div>
    </div>
  );
};

export default SettingsForm;

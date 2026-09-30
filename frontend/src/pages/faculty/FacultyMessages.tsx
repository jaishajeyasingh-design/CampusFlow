import { MessageSquare, Clock } from 'lucide-react';

export const FacultyMessages: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
            CONTEXTUAL MESSAGING
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
          Faculty Inbox
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Event-specific and OD-specific contextual communication channel.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 border border-purple-200">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Contextual Messaging Module</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
          Direct event-based and OD request contextual messaging will be fully active in the upcoming messaging system checkpoint. Backend messaging infrastructure is initialized and ready.
        </p>
        <div className="inline-flex items-center space-x-1.5 mt-4 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-600">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Messaging Checkpoint Prepared</span>
        </div>
      </div>
    </div>
  );
};

export default FacultyMessages;

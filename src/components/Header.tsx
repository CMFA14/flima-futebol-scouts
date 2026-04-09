import { Trophy } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-600 p-2 rounded-lg">
            <Trophy size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Flima Futebol <span className="text-orange-500">Scouts</span>
          </h1>
        </div>
      </div>
    </header>
  );
}

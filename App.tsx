
import React, { useState, useRef, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, Settings as SettingsIcon, LogOut, Zap, Package, TrendingDown, User, Shield, ChevronDown } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Inventory } from './components/Inventory';
import { Expenses } from './components/Expenses';
import { Login } from './components/Login';
import { Profile } from './components/Profile';
import { AdminUsers } from './components/AdminUsers';
import { AuditLogs } from './components/AuditLogs';
import { useAppStore } from './store';
import { UserRole } from './types';

const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
    const { currentUser } = useAppStore();
    
    if (!currentUser) return <Navigate to="/login" replace />;
    
    if (roles && !roles.includes(currentUser.role)) {
        return <div className="p-8 text-center text-red-500 font-bold">Access Denied: You do not have permission to view this page.</div>;
    }

    return <>{children}</>;
};

const App: React.FC = () => {
  const { currentUser, logout } = useAppStore();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
            setIsProfileMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  // If not logged in, show Login
  if (!currentUser) {
      return <Login />;
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const getPageTitle = (path: string) => {
    switch(path) {
      case '/': return 'Dashboard';
      case '/customers': return 'Customers';
      case '/inventory': return 'Inventory';
      case '/expenses': return 'Expenses';
      case '/reports': return 'Reports';
      case '/profile': return 'My Profile';
      case '/admin/users': return 'User Management';
      case '/admin/audit': return 'Audit Logs';
      case '/settings': return 'Settings';
      default: return 'Speedy Cafe';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <Zap size={20} className="text-slate-900 fill-slate-900" />
          </div>
          <span className="font-bold text-xl tracking-tight">Speedy Cafe</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <SidebarLink to="/customers" icon={<Users size={20} />} label="Customers" />
          
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Management</p>
          </div>
          <SidebarLink to="/inventory" icon={<Package size={20} />} label="Inventory / Stock" />
          <SidebarLink to="/expenses" icon={<TrendingDown size={20} />} label="Expenses" />
          <SidebarLink to="/reports" icon={<BarChart3 size={20} />} label="Reports" />
          
          {/* Admin Links Removed from Sidebar */}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-2 opacity-50">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-slate-700`}>
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{currentUser.fullName}</p>
              <p className="text-xs text-slate-400 capitalize">{currentUser.role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10 px-6 py-3 flex justify-between items-center text-slate-900 sticky top-0">
           {/* Mobile Logo / Desktop Title */}
           <div className="flex items-center gap-2 md:hidden">
              <Zap size={20} className="text-yellow-500 fill-current" />
              <span className="font-bold text-lg">Speedy Cafe</span>
           </div>
           
           <div className="hidden md:block">
              <h2 className="text-xl font-bold text-gray-800">{getPageTitle(location.pathname)}</h2>
           </div>

           {/* Right Actions: Profile Menu */}
           <div className="ml-auto relative" ref={profileMenuRef}>
               <button 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
               >
                  <div className="hidden md:block text-right mr-1">
                      <p className="text-xs font-bold text-gray-700 leading-tight">{currentUser.fullName}</p>
                      <p className="text-[10px] text-gray-400 leading-tight capitalize">{currentUser.role.toLowerCase()}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${isAdmin ? 'bg-purple-600' : 'bg-blue-600'}`}>
                      {currentUser.fullName.charAt(0)}
                  </div>
                  <ChevronDown size={14} className="text-gray-400 mr-1" />
               </button>

               {isProfileMenuOpen && (
                   <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                       <div className="p-4 bg-gray-50 border-b border-gray-100">
                           <p className="font-bold text-gray-800 truncate">{currentUser.fullName}</p>
                           <p className="text-xs text-gray-500 truncate">{currentUser.email || currentUser.username}</p>
                       </div>
                       
                       <div className="p-2 space-y-1">
                           <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors">
                               <User size={18} /> My Profile
                           </Link>
                           
                           {isAdmin && (
                               <>
                                   <div className="my-1 border-t border-gray-100 mx-2"></div>
                                   <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Administration</div>
                                   
                                   <Link to="/admin/users" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors">
                                       <Users size={18} /> User Management
                                   </Link>
                                   <Link to="/admin/audit" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors">
                                       <Shield size={18} /> Audit Logs
                                   </Link>
                                   <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors">
                                       <SettingsIcon size={18} /> Settings
                                   </Link>
                               </>
                           )}
                           
                           <div className="my-1 border-t border-gray-100 mx-2"></div>
                           
                           <button 
                               onClick={() => { logout(); setIsProfileMenuOpen(false); }}
                               className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left transition-colors"
                           >
                               <LogOut size={18} /> Logout
                           </button>
                       </div>
                   </div>
               )}
           </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* Admin Protected Routes */}
            <Route path="/admin/users" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AuditLogs /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute roles={[UserRole.ADMIN]}><Settings /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const RootApp = () => (
  <Router>
    <App />
  </Router>
);

export default RootApp;

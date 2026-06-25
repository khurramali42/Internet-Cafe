
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Zap, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAppStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LOGIN' | 'FORGOT'>('LOGIN');
  
  // Forgot Password State
  const [email, setEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Simulate network delay
    setTimeout(async () => {
        const success = await login(username, password);
        setLoading(false);
        if (!success) {
            setError('Invalid username or password.');
        }
    }, 500);
  };

  const handleForgot = (e: React.FormEvent) => {
      e.preventDefault();
      // Mock email sending
      setForgotMsg(`If an admin account exists for "${email}", a reset link has been sent.`);
      setEmail('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
       <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                 <Zap size={32} className="text-white" fill="currentColor" />
              </div>
              <h1 className="text-3xl font-bold text-white">Speedy Cafe</h1>
              <p className="text-blue-100 text-sm mt-1">Management System</p>
          </div>

          <div className="p-8">
            
            {view === 'LOGIN' ? (
                <form onSubmit={handleLogin} className="space-y-5">
                    <h2 className="text-xl font-bold text-gray-800 text-center">Welcome Back</h2>
                    
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900"
                                placeholder="Enter username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="password" 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-2"
                    >
                        {loading ? 'Authenticating...' : <><span className="mt-0.5">Sign In</span> <ArrowRight size={18} /></>}
                    </button>

                    <div className="text-center mt-2">
                        <button type="button" onClick={() => setView('FORGOT')} className="text-sm text-blue-600 hover:underline font-medium">
                            Forgot Password?
                        </button>
                    </div>
                    
                    <div className="text-center text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
                        Demo: Admin (admin/123) • User (abc/123)
                    </div>
                </form>
            ) : (
                <div className="space-y-5">
                    <h2 className="text-xl font-bold text-gray-800 text-center">Account Recovery</h2>
                    <p className="text-sm text-gray-500 text-center">
                        Admin: Enter your email to reset.<br/>
                        Staff: Please contact the Admin directly.
                    </p>

                    {forgotMsg ? (
                        <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm text-center">
                            {forgotMsg}
                        </div>
                    ) : (
                        <form onSubmit={handleForgot} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Admin Email</label>
                                <input 
                                    type="email" 
                                    required
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition"
                            >
                                Send Reset Link
                            </button>
                        </form>
                    )}

                    <button 
                        onClick={() => { setView('LOGIN'); setForgotMsg(''); }}
                        className="w-full text-gray-600 text-sm font-medium hover:text-gray-900"
                    >
                        Back to Login
                    </button>
                </div>
            )}

          </div>
       </div>
    </div>
  );
};

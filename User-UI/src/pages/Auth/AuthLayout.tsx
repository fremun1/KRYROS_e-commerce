import { useState } from 'react';
import { useLocation, useNavigate } from 'wouter';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';

export type AuthTab = 'login' | 'register' | 'forgot';

export default function AuthLayout() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = (searchParams.get('tab') as AuthTab) || 'login';
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    navigate(`/auth?tab=${tab}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">
            <span className="text-gray-900">KRY</span>
            <span className="text-teal-600">ROS</span>
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-100 rounded-lg p-1 mb-8 flex">
          <button
            onClick={() => handleTabChange('login')}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-all ${
              activeTab === 'login'
                ? 'bg-teal-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => handleTabChange('register')}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-all ${
              activeTab === 'register'
                ? 'bg-teal-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Register
          </button>
          <button
            onClick={() => handleTabChange('forgot')}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-all ${
              activeTab === 'forgot'
                ? 'bg-teal-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Forgot
          </button>
        </div>

        {/* Content */}
        <div className="min-h-96">
          {activeTab === 'login' && <LoginPage />}
          {activeTab === 'register' && <RegisterPage />}
          {activeTab === 'forgot' && <ForgotPasswordPage />}
        </div>
      </div>
    </div>
  );
}

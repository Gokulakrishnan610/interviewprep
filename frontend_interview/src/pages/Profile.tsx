import React, { useState } from 'react';
import {
  User,
  Award,
  TrendingUp,
  Clock,
  Calendar,
  BarChart3,
  Edit,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { state: authState } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const [userData, setUserData] = useState({
    first_name: authState.user?.first_name || '',
    last_name: authState.user?.last_name || '',
    email: authState.user?.email || '',
    role: authState.user?.role || 'STUDENT',
    joinDate: authState.user?.created_at ? new Date(authState.user.created_at).toLocaleDateString() : '',
    totalSessions: 12,
    completedInterviews: 8,
    averageScore: 85,
    practiceTime: 240, // minutes
  });

  const [editData, setEditData] = useState(userData);

  const performanceData = [
    { category: 'Technical Skills', score: 88, improvement: '+5%' },
    { category: 'Communication', score: 82, improvement: '+3%' },
    { category: 'Problem Solving', score: 90, improvement: '+8%' },
    { category: 'System Design', score: 75, improvement: '+12%' },
  ];

  const recentActivity = [
    {
      id: '1',
      type: 'interview',
      title: 'Software Engineering Mock Interview',
      date: '2024-01-20',
      score: 88,
      status: 'completed',
    },
    {
      id: '2',
      type: 'practice',
      title: 'Practice Session with Sarah Chen',
      date: '2024-01-19',
      duration: 45,
      status: 'completed',
    },
    {
      id: '3',
      type: 'interview',
      title: 'Behavioral Interview Practice',
      date: '2024-01-18',
      score: 92,
      status: 'completed',
    },
  ];

  const handleSave = () => {
    setUserData(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(userData);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-600 mt-2">Manage your account and view your progress</p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="text-center bg-gray-50 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="First Name"
                    />
                    <input
                      type="text"
                      value={editData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="text-center bg-gray-50 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Last Name"
                    />
                  </div>
                ) : (
                  `${userData.first_name} ${userData.last_name}`
                )}
              </h2>
              <p className="text-gray-600">{userData.role}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{userData.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                <p className="text-gray-900">{userData.joinDate}</p>
              </div>

              {isEditing && (
                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{userData.totalSessions}</div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{userData.completedInterviews}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{userData.averageScore}%</div>
                <div className="text-sm text-gray-600">Avg Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{Math.floor(userData.practiceTime / 60)}h</div>
                <div className="text-sm text-gray-600">Practice Time</div>
              </div>
            </div>

            <div className="space-y-4">
              {performanceData.map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart3 className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">{item.category}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{item.score}%</div>
                      <div className="text-sm text-green-600">{item.improvement}</div>
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${item.score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                      {activity.type === 'interview' ? (
                        <Award className="w-5 h-5 text-primary-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{activity.title}</h4>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {activity.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {activity.type === 'interview' && activity.score && (
                      <div className="text-lg font-semibold text-green-600">{activity.score}%</div>
                    )}
                    {activity.type === 'practice' && activity.duration && (
                      <div className="text-lg font-semibold text-blue-600">{activity.duration} min</div>
                    )}
                    <div className="text-sm text-gray-500 capitalize">{activity.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 
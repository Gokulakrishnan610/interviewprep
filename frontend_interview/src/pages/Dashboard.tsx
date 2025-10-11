import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Mic, 
  TrendingUp, 
  Clock, 
  Award,
  BookOpen,
  Users,
  Target
} from 'lucide-react';
import { useInterview } from '../context/InterviewContext';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { state, dispatch } = useInterview();
  const { state: authState } = useAuth();

  // Mock data for demonstration
  const stats = {
    totalSessions: 12,
    completedInterviews: 8,
    averageScore: 85,
    practiceTime: 240, // minutes
  };

  const recentSessions = [
    {
      id: '1',
      title: 'Software Engineering Mock Interview',
      category: 'Technical',
      difficulty: 'Intermediate',
      duration: 45,
      completed: true,
      score: 88,
    },
    {
      id: '2',
      title: 'Behavioral Interview Practice',
      category: 'Behavioral',
      difficulty: 'Beginner',
      duration: 30,
      completed: true,
      score: 92,
    },
    {
      id: '3',
      title: 'System Design Interview',
      category: 'Technical',
      difficulty: 'Advanced',
      duration: 60,
      completed: false,
      score: null,
    },
  ];

  const quickActions = [
    {
      title: 'Start Practice Session',
      description: 'Begin a new practice interview',
      icon: Mic,
      path: '/practice',
      color: 'bg-blue-500',
    },
    {
      title: 'View Sessions',
      description: 'Browse available interview sessions',
      icon: Calendar,
      path: '/sessions',
      color: 'bg-green-500',
    },
    {
      title: 'View Progress',
      description: 'Check your interview performance',
      icon: TrendingUp,
      path: '/profile',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {authState.user?.first_name || 'Student'}!
        </h1>
        <p className="text-gray-600 mt-2">Ready to ace your next interview?</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedInterviews}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Practice Time</p>
              <p className="text-2xl font-bold text-gray-900">{Math.floor(stats.practiceTime / 60)}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.path}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="ml-4 text-lg font-semibold text-gray-900">{action.title}</h3>
                </div>
                <p className="text-gray-600">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Sessions</h2>
          <Link
            to="/sessions"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View all
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {recentSessions.map((session) => (
              <div key={session.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-primary-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{session.title}</h3>
                      <div className="flex items-center mt-1">
                        <span className="text-sm text-gray-500">{session.category}</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{session.difficulty}</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{session.duration} min</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {session.completed ? (
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-green-600">
                          {session.score}%
                        </span>
                        <div className="ml-2 w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    ) : (
                      <Link
                        to={`/interview/${session.id}`}
                        className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
                      >
                        Start
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
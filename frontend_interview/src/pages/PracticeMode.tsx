import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, 
  Users, 
  Star, 
  Clock, 
  MessageCircle,
  Play,
  Settings
} from 'lucide-react';
import { apiService } from '../services/api';

const PracticeMode: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  const aiAgents = [
    {
      id: '1',
      name: 'Sarah Chen',
      role: 'Senior Software Engineer',
      personality: 'Friendly and encouraging, focuses on fundamentals',
      expertise: ['Algorithms', 'Data Structures', 'System Design'],
      avatar: '👩‍💻',
      rating: 4.8,
      sessions: 1247,
      isOnline: true,
    },
    {
      id: '2',
      name: 'Marcus Johnson',
      role: 'Engineering Manager',
      personality: 'Direct and analytical, values clear communication',
      expertise: ['Leadership', 'Architecture', 'Team Management'],
      avatar: '👨‍💼',
      rating: 4.6,
      sessions: 892,
      isOnline: true,
    },
    {
      id: '3',
      name: 'Dr. Emily Rodriguez',
      role: 'Technical Lead',
      personality: 'Patient and thorough, emphasizes best practices',
      expertise: ['Code Quality', 'Testing', 'Performance'],
      avatar: '👩‍🔬',
      rating: 4.9,
      sessions: 567,
      isOnline: false,
    },
    {
      id: '4',
      name: 'Alex Thompson',
      role: 'Frontend Specialist',
      personality: 'Creative and detail-oriented, loves modern tech',
      expertise: ['React', 'JavaScript', 'UI/UX'],
      avatar: '👨‍🎨',
      rating: 4.7,
      sessions: 1034,
      isOnline: true,
    },
  ];

  const categories = [
    { id: 'all', name: 'All Topics', icon: '🎯' },
    { id: 'algorithms', name: 'Algorithms', icon: '⚡' },
    { id: 'system-design', name: 'System Design', icon: '🏗️' },
    { id: 'behavioral', name: 'Behavioral', icon: '🤝' },
    { id: 'frontend', name: 'Frontend', icon: '🎨' },
    { id: 'backend', name: 'Backend', icon: '⚙️' },
  ];

  const filteredAgents = aiAgents.filter(agent => {
    if (selectedCategory === 'all') return true;
    return agent.expertise.some(exp => 
      exp.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  });

  const startPracticeSession = async (agentId: string) => {
    setSelectedAgent(agentId);
    
    try {
      // Start practice session via API
      const response = await apiService.startPracticeSession(agentId);
      
      if (response.success && response.data) {
        const { room_name, room_token } = response.data;
        
        // Navigate to interview with LiveKit info
        navigate(`/interview/${room_name}?token=${room_token}&type=practice&agent=${agentId}`);
      } else {
        console.error('Failed to start practice session:', response.error);
        // Fallback to direct navigation
        navigate(`/practice-session/${agentId}`);
      }
    } catch (error) {
      console.error('Error starting practice session:', error);
      // Fallback to direct navigation
      navigate(`/practice-session/${agentId}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Practice Mode</h1>
        <p className="text-gray-600 mt-2">Practice with AI agents specialized in different areas</p>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose a Topic</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedCategory === category.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{category.icon}</div>
              <div className="text-sm font-medium text-gray-900">{category.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* AI Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <div key={agent.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="text-3xl mr-3">{agent.avatar}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-600">{agent.role}</p>
                    <div className="flex items-center mt-1">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        agent.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-xs text-gray-500">
                        {agent.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  {agent.rating}
                </div>
              </div>

              {/* Personality */}
              <p className="text-gray-600 text-sm mb-4">{agent.personality}</p>

              {/* Expertise */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {agent.expertise.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {agent.sessions} sessions
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Available now
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => startPracticeSession(agent.id)}
                disabled={!agent.isOnline}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Practice
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agents available</h3>
          <p className="text-gray-600">Try selecting a different topic or check back later</p>
        </div>
      )}

      {/* Quick Start Section */}
      <div className="mt-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Quick Start Practice</h2>
            <p className="text-primary-100">Jump into a random practice session with any available agent</p>
          </div>
          <button className="bg-white text-primary-600 px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors">
            Start Random Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default PracticeMode; 
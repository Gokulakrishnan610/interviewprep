import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Clock, 
  Target, 
  Users,
  Star,
  Play
} from 'lucide-react';

const InterviewSessions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'technical', name: 'Technical' },
    { id: 'behavioral', name: 'Behavioral' },
    { id: 'system-design', name: 'System Design' },
    { id: 'coding', name: 'Coding' },
  ];

  const difficulties = [
    { id: 'all', name: 'All Levels' },
    { id: 'beginner', name: 'Beginner' },
    { id: 'intermediate', name: 'Intermediate' },
    { id: 'advanced', name: 'Advanced' },
  ];

  const sessions = [
    {
      id: '1',
      title: 'Software Engineering Mock Interview',
      description: 'Comprehensive technical interview covering algorithms, data structures, and system design.',
      category: 'technical',
      difficulty: 'intermediate',
      duration: 45,
      questions: 12,
      rating: 4.8,
      participants: 1247,
      isPopular: true,
    },
    {
      id: '2',
      title: 'Behavioral Interview Practice',
      description: 'Practice common behavioral questions and learn the STAR method.',
      category: 'behavioral',
      difficulty: 'beginner',
      duration: 30,
      questions: 8,
      rating: 4.6,
      participants: 892,
      isPopular: false,
    },
    {
      id: '3',
      title: 'System Design Deep Dive',
      description: 'Advanced system design questions for senior engineering roles.',
      category: 'system-design',
      difficulty: 'advanced',
      duration: 60,
      questions: 6,
      rating: 4.9,
      participants: 567,
      isPopular: true,
    },
    {
      id: '4',
      title: 'Coding Interview Prep',
      description: 'Practice coding problems with real-time feedback and solutions.',
      category: 'coding',
      difficulty: 'intermediate',
      duration: 40,
      questions: 10,
      rating: 4.7,
      participants: 1034,
      isPopular: false,
    },
    {
      id: '5',
      title: 'Frontend Development Interview',
      description: 'JavaScript, React, and frontend architecture questions.',
      category: 'technical',
      difficulty: 'intermediate',
      duration: 35,
      questions: 9,
      rating: 4.5,
      participants: 756,
      isPopular: false,
    },
    {
      id: '6',
      title: 'Leadership & Management',
      description: 'Questions for engineering leadership and management roles.',
      category: 'behavioral',
      difficulty: 'advanced',
      duration: 50,
      questions: 7,
      rating: 4.4,
      participants: 423,
      isPopular: false,
    },
  ];

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || session.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || session.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return '💻';
      case 'behavioral': return '🤝';
      case 'system-design': return '🏗️';
      case 'coding': return '⌨️';
      default: return '📋';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Interview Sessions</h1>
        <p className="text-gray-600 mt-2">Choose from our curated collection of mock interviews</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {difficulties.map(difficulty => (
              <option key={difficulty.id} value={difficulty.id}>
                {difficulty.name}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedDifficulty('all');
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => (
          <div key={session.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{getCategoryIcon(session.category)}</span>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(session.difficulty)}`}>
                      {session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1)}
                    </span>
                    {session.isPopular && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Popular
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  {session.rating}
                </div>
              </div>

              {/* Title and Description */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{session.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{session.description}</p>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {session.duration} min
                </div>
                <div className="flex items-center">
                  <Target className="w-4 h-4 mr-1" />
                  {session.questions} questions
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {session.participants}
                </div>
              </div>

              {/* Action Button */}
              <Link
                to={`/interview/${session.id}`}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default InterviewSessions; 
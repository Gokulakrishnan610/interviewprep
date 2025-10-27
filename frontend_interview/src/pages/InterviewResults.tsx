import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Award, 
  TrendingUp, 
  MessageSquare, 
  Brain, 
  Target,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Clock
} from 'lucide-react';

interface InterviewScores {
  technical_score: number;
  communication_score: number;
  confidence_score: number;
  problem_solving_score: number;
  overall_score: number;
  feedback_text: string;
  strengths: string[];
  improvement_areas: string[];
}

const InterviewResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { scores, duration, sessionId } = location.state as { 
    scores: InterviewScores, 
    duration: number,
    sessionId: string 
  };

  if (!scores) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Results Available</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const ScoreCard = ({ title, score, icon: Icon }: { title: string, score: number, icon: any }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${getScoreBgColor(score)}`}>
            <Icon className={`w-6 h-6 ${getScoreColor(score)}`} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
          {score.toFixed(0)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className={`h-3 rounded-full transition-all duration-500 ${
            score >= 80 ? 'bg-green-600' : score >= 60 ? 'bg-yellow-600' : 'bg-red-600'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interview Results</h1>
              <p className="text-gray-600 mt-2">Session ID: {sessionId}</p>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={20} />
              <span>Duration: {formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Overall Score */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Overall Performance</h2>
              <p className="text-primary-100">Your comprehensive interview score</p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold">{scores.overall_score.toFixed(0)}</div>
              <div className="text-primary-100 mt-2">out of 100</div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ScoreCard 
            title="Technical Skills" 
            score={scores.technical_score} 
            icon={Brain}
          />
          <ScoreCard 
            title="Communication" 
            score={scores.communication_score} 
            icon={MessageSquare}
          />
          <ScoreCard 
            title="Confidence" 
            score={scores.confidence_score} 
            icon={TrendingUp}
          />
          <ScoreCard 
            title="Problem Solving" 
            score={scores.problem_solving_score} 
            icon={Target}
          />
        </div>

        {/* Detailed Feedback */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Strengths */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Strengths</h3>
            </div>
            <ul className="space-y-3">
              {scores.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Areas for Improvement</h3>
            </div>
            <ul className="space-y-3">
              {scores.improvement_areas.map((area, index) => (
                <li key={index} className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Feedback Text */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Detailed Feedback</h3>
          </div>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {scores.feedback_text}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/interview-sessions')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Start Another Interview
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewResults;

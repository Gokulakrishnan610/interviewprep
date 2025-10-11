import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class InterviewConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'interview_{self.session_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial connection message
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to interview session'
        }))

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'start_interview':
                await self.handle_start_interview(data)
            elif message_type == 'audio_data':
                await self.handle_audio_data(data)
            elif message_type == 'end_interview':
                await self.handle_end_interview(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Server error: {str(e)}'
            }))

    async def handle_start_interview(self, data):
        """Handle interview session start"""
        try:
            # Send session ready message with mock data
            await self.send(text_data=json.dumps({
                'type': 'session_ready',
                'session_id': self.session_id,
                'livekit_info': {
                    'room_name': self.session_id,
                    'token': f'mock_token_{self.session_id}',
                    'url': 'wss://mock.livekit.cloud'
                },
                'session_data': {
                    'title': 'Mock Interview Session',
                    'description': 'Practice interview session',
                    'difficulty': 'intermediate',
                    'duration': 30
                }
            }))
            
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Failed to start interview: {str(e)}'
            }))

    async def handle_audio_data(self, data):
        """Handle incoming audio data from client"""
        try:
            # Send mock AI response
            await self.send(text_data=json.dumps({
                'type': 'ai_response',
                'message': 'Thank you for your response. Can you tell me more about your experience?',
                'audio_data': None,
                'timestamp': '2024-01-01T00:00:00Z'
            }))
                
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Failed to process audio: {str(e)}'
            }))

    async def handle_end_interview(self, data):
        """Handle interview session end"""
        try:
            # Send mock feedback
            feedback = {
                'overall_score': 85,
                'communication_score': 80,
                'technical_score': 90,
                'problem_solving_score': 85,
                'confidence_score': 80,
                'strengths': ['Good technical knowledge', 'Clear communication'],
                'areas_for_improvement': ['More specific examples', 'Better time management'],
                'detailed_feedback': 'Overall good performance with room for improvement.',
                'recommendations': ['Practice with more scenarios', 'Work on time management']
            }
            
            # Send feedback to client
            await self.send(text_data=json.dumps({
                'type': 'interview_feedback',
                'feedback': feedback
            }))
            
            # Send session ended message
            await self.send(text_data=json.dumps({
                'type': 'session_ended',
                'session_id': self.session_id,
                'feedback': feedback
            }))
            
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Failed to end interview: {str(e)}'
            }))


    # WebSocket message handlers
    async def interview_message(self, event):
        """Handle messages sent to the interview group"""
        message = event['message']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'interview_message',
            'message': message
        }))

    async def ai_response(self, event):
        """Handle AI responses"""
        await self.send(text_data=json.dumps({
            'type': 'ai_response',
            'message': event['message'],
            'audio_data': event.get('audio_data'),
            'timestamp': event.get('timestamp')
        }))

    async def interview_feedback(self, event):
        """Handle interview feedback"""
        await self.send(text_data=json.dumps({
            'type': 'interview_feedback',
            'feedback': event['feedback']
        }))

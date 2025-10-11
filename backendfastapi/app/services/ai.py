import google.generativeai as genai
from app.core.config import settings

class AIService:
    def __init__(self):
        # Initialize Gemini AI
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        
        # Set up the Gemini model with configuration
        model = genai.GenerativeModel('gemini-pro')
        generation_config = genai.types.GenerationConfig(
            temperature=0.7,
            max_output_tokens=1024,
            top_p=0.8,
            top_k=40
        )
        self.model = model

    async def analyze_interview(self, interview_text: str, context: dict = None):
        try:
            # Prepare the prompt
            prompt = f"""
            Analyze the following interview response and provide detailed feedback:
            
            Response: {interview_text}
            
            Please provide:
            1. Technical accuracy
            2. Communication clarity
            3. Confidence level
            4. Areas for improvement
            5. Overall score (0-100)
            """
            
            response = self.model.generate_content(prompt)
            response_text = response.text if hasattr(response, 'text') else str(response)
            
            # Process and structure the response
            feedback = self._structure_feedback(response_text)
            
            return feedback
        except Exception as e:
            raise Exception(f"Interview analysis failed: {str(e)}")

    async def analyze_sentiment(self, text: str):
        try:
            # Use Gemini for sentiment analysis
            prompt = f"""
            Analyze the sentiment of the following text and respond with either POSITIVE or NEGATIVE,
            followed by a confidence score between 0 and 1:

            Text: {text}
            """
            
            response = self.model.generate_content(prompt)
            response_text = response.text if hasattr(response, 'text') else str(response)
            
            # Parse response
            lines = response_text.strip().split('\n')
            label = lines[0].strip() if lines else "NEUTRAL"
            score = 0.5  # Default score
            
            # Try to extract score from response
            for line in lines:
                if line.replace('.', '').strip().isdigit():
                    score = float(line.strip())
                    break
            
            return {
                "label": label,
                "score": score
            }
        except Exception as e:
            raise Exception(f"Sentiment analysis failed: {str(e)}")

    def _structure_feedback(self, raw_feedback: str):
        # Parse and structure the raw feedback
        # This is a placeholder implementation
        return {
            "technical_score": 0.0,
            "communication_score": 0.0,
            "confidence_score": 0.0,
            "overall_score": 0.0,
            "feedback": raw_feedback,
            "improvement_areas": [],
            "strengths": []
        }
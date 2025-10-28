"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  // Temporarily return mock data for testing
  console.log("getInterviewById called with id:", id);
  if (id.startsWith("mock-")) {
    return {
      id: id,
      userId: "test-user",
      role: "Software Engineer",
      level: "Mid-level",
      questions: ["What is your experience with React?", "Explain component lifecycle"],
      techstack: ["React", "JavaScript", "TypeScript"],
      type: "Technical Interview",
      createdAt: new Date().toISOString(),
      finalized: true,
    };
  }
  return null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  // Temporarily return mock data for testing
  console.log("getFeedbackByInterviewId called with interviewId:", interviewId, "userId:", userId);
  return {
    id: "mock-feedback-" + interviewId,
    interviewId: interviewId,
    totalScore: 85,
    categoryScores: [
      {
        name: "Communication Skills",
        score: 90,
        comment: "Clear and articulate responses"
      },
      {
        name: "Technical Knowledge",
        score: 80,
        comment: "Good understanding of core concepts"
      },
      {
        name: "Problem-Solving",
        score: 85,
        comment: "Logical approach to problems"
      }
    ],
    strengths: ["Good communication", "Solid technical foundation"],
    areasForImprovement: ["Could provide more detailed examples", "Practice system design questions"],
    finalAssessment: "Strong candidate with good potential. Ready for mid-level positions.",
    createdAt: new Date().toISOString(),
  };
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  // Temporarily return mock data for testing
  console.log("getLatestInterviews called with userId:", userId, "limit:", limit);
  return [
    {
      id: "mock-latest-1",
      userId: "other-user",
      role: "Full Stack Developer",
      level: "Senior",
      questions: ["What is MERN stack?", "Explain JWT authentication"],
      techstack: ["React", "Node.js", "MongoDB"],
      type: "Technical",
      createdAt: new Date().toISOString(),
      finalized: true,
    },
  ];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  // Temporarily return mock data for testing
  console.log("getInterviewsByUserId called with userId:", userId);
  return [
    {
      id: "mock-interview-1",
      userId: userId,
      role: "Frontend Developer",
      level: "Mid-level",
      questions: ["What is React?", "Explain useState"],
      techstack: ["JavaScript", "React"],
      type: "Technical",
      createdAt: new Date().toISOString(),
      finalized: true,
    },
    {
      id: "mock-interview-2",
      userId: userId,
      role: "Backend Developer",
      level: "Senior",
      questions: ["What is REST?", "Explain database indexing"],
      techstack: ["Python", "Django"],
      type: "System Design",
      createdAt: new Date().toISOString(),
      finalized: true,
    },
  ];
}


import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, OptimizedResume, ProposedChanges, QuizQuestion } from "./types";

export const analyzeResume = async (resume: string, jobDescription: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Analyze the following RESUME against the JOB DESCRIPTION.
      JOB DESCRIPTION: ${jobDescription}
      RESUME CONTENT: ${resume}
    `,
    config: {
      systemInstruction: "You are an expert Senior Technical Recruiter and ATS Specialist. Provide a meticulous analysis of how well a candidate's resume matches a specific job description. Identify missing technical keywords, soft skills, and provide actionable bulleted feedback for resume sections.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matchPercentage: { type: Type.NUMBER },
          overallSummary: { type: Type.STRING },
          missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          softSkillsMissing: { type: Type.ARRAY, items: { type: Type.STRING } },
          contentImprovements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                section: { type: Type.STRING },
                suggestion: { type: Type.STRING }
              },
              required: ["section", "suggestion"]
            }
          },
          atsOptimizationTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          matchingStrengths: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["matchPercentage", "overallSummary", "missingKeywords", "softSkillsMissing", "contentImprovements", "atsOptimizationTips", "matchingStrengths"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from analysis engine");
  return JSON.parse(text);
};

export const proposeChanges = async (resume: string, jobDescription: string, missingKeywords: string[]): Promise<ProposedChanges> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Based on the resume and job description, propose specific improvements.
      JOB DESCRIPTION: ${jobDescription}
      KEYWORDS TO INTEGRATE: ${missingKeywords.join(", ")}
      RESUME: ${resume}
    `,
    config: {
      systemInstruction: "You are a professional Resume Editor. Propose exactly how you will integrate missing keywords and improve existing bullet points. Be specific about the 'original' text vs the 'improved' version. Predict what the new match score will be (0-100).",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          integratedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          phrasingImprovements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                section: { type: Type.STRING },
                original: { type: Type.STRING },
                improved: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["section", "original", "improved", "reason"]
            }
          },
          predictedScore: { type: Type.NUMBER }
        },
        required: ["integratedKeywords", "phrasingImprovements", "predictedScore"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Proposal failed");
  return JSON.parse(text);
};

export const optimizeResumeToSchema = async (resume: string, jobDescription: string, missingKeywords: string[]): Promise<OptimizedResume> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `
      Optimize this resume for the following job. Use professional phrasing and integrate all missing keywords.
      JOB DESCRIPTION: ${jobDescription}
      MISSING KEYWORDS TO INTEGRATE: ${missingKeywords.join(", ")}
      ORIGINAL RESUME: ${resume}
    `,
    config: {
      systemInstruction: "You are a professional resume architect. Output the optimized resume content exclusively in JSON format. For the 'profile', 'education.details', and 'experience.details' fields, provide content in pointer format (using dashes '-'). Each pointer on a new line.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          jobTitle: { type: Type.STRING },
          profile: { type: Type.STRING },
          contact: {
            type: Type.OBJECT,
            properties: {
              phone: { type: Type.STRING },
              website: { type: Type.STRING },
              email: { type: Type.STRING }
            },
            required: ["phone", "website", "email"]
          },
          hobbies: { type: Type.ARRAY, items: { type: Type.STRING } },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                school: { type: Type.STRING },
                dates: { type: Type.STRING },
                details: { type: Type.STRING }
              },
              required: ["school", "dates", "details"]
            }
          },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                company: { type: Type.STRING },
                role: { type: Type.STRING },
                dates: { type: Type.STRING },
                details: { type: Type.STRING }
              },
              required: ["company", "role", "dates", "details"]
            }
          },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["name", "jobTitle", "profile", "contact", "hobbies", "education", "experience", "skills"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Optimization failed");
  return JSON.parse(text);
};

export const generateAptitudeQuiz = async (jobDescription: string): Promise<QuizQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Generate 8 industry-level recruitment assessment questions based on this job description.
      
      JOB DESCRIPTION:
      ${jobDescription}

      REQUIREMENTS:
      1. Level: Tier-1 Software Company Aptitude Round (e.g., Google, Amazon, Microsoft standard).
      2. Distribution: 
         - 2 Quantitative (Complex probability, P&C, or Time/Distance).
         - 2 Logical Reasoning (Syllogism, Data Sufficiency, or Seating Arrangement).
         - 4 Technical/Core CS (DSA, OS, Database, or System Design concepts relevant to the role).
      3. Options: 4 highly plausible options per question.
    `,
    config: {
      systemInstruction: "You are a Senior Assessment Engineer at a top-tier tech firm. Create challenging, interview-grade questions that test deep understanding rather than rote memorization. Ensure the 'category' accurately reflects the type of question generated.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            category: { type: Type.STRING, enum: ['Logical', 'Quantitative', 'Technical', 'Verbal', 'System Design'] }
          },
          required: ["question", "options", "correctAnswer", "explanation", "category"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Quiz generation failed");
  return JSON.parse(text);
};

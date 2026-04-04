import {
  Code2,
  FileText,
  Mail,
  Lightbulb,
  GraduationCap,
  Languages,
  PenTool,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';

export interface PromptTemplate {
  id: string;
  label: string;
  description: string;
  text: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'code-review',
    label: 'Code Review',
    description: 'Review code for bugs & best practices',
    text: 'Please review the following code for bugs, performance issues, and best practices. Provide specific suggestions for improvement:\n\n',
    icon: Code2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'blog-post',
    label: 'Blog Post',
    description: 'Write a well-structured blog post',
    text: 'Write a well-structured blog post about the following topic. Include an engaging title, introduction, key sections with headings, and a conclusion:\n\n',
    icon: PenTool,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-500/10',
  },
  {
    id: 'email-draft',
    label: 'Email Draft',
    description: 'Draft a professional email',
    text: 'Help me draft a professional email to the following recipient about the topic below. Keep it concise, polite, and well-structured:\n\n',
    icon: Mail,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    description: 'Generate creative ideas',
    text: 'Help me brainstorm ideas for the following. Give me a diverse range of creative and practical suggestions:\n\n',
    icon: Lightbulb,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'explain',
    label: 'Explain Like I\'m 5',
    description: 'Simple explanations for any topic',
    text: 'Explain the following topic like I\'m 5 years old. Use simple words, relatable analogies, and avoid jargon:\n\n',
    icon: GraduationCap,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/10',
  },
  {
    id: 'translate',
    label: 'Translate',
    description: 'Translate text to another language',
    text: 'Translate the following text to [target language]. Preserve the original tone and meaning:\n\n',
    icon: Languages,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Condense text into key points',
    text: 'Summarize the following text concisely. Highlight the key points, main arguments, and important takeaways:\n\n',
    icon: FileText,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'checklist',
    label: 'Action Plan',
    description: 'Create a step-by-step plan',
    text: 'Help me create a detailed, actionable checklist/plan for the following goal. Break it down into clear steps with priorities:\n\n',
    icon: ListChecks,
    color: 'text-lime-600 dark:text-lime-400',
    bgColor: 'bg-lime-500/10',
  },
];

/** Extended emoji set for the custom reaction picker */
export const EXTENDED_REACTION_EMOJIS = [
  '😀', '😂', '😍', '🥰', '😎',
  '🤔', '😮', '😢', '😡', '👍',
  '👎', '🔥', '💯', '❤️', '🎉',
  '🙏', '💡', '🚀', '✅', '⭐',
];

import {
  BriefcaseBusiness,
  CarFront,
  CircleParking,
  Gauge,
  Leaf,
  Mountain,
  Route,
  ShieldCheck,
  ShoppingBag,
  Star,
  Sun,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Message, WizardAnswers, ChatErrorType } from '@/lib/types/chat';

export const STEP_COUNT = 5;
export const RESULTS_STEP = 4;
export const MAX_DRIVING_CHOICES = 3;
export const MAX_DISPLAYED_RESULTS = 5;
export const MAX_HISTORY_MESSAGES = 20;

export const steps = [
  'Your routine',
  'What matters',
  'Budget & Age',
  'Practical fit',
  'Your matches',
];

export const drivingOptions: { label: string; hint: string; icon: LucideIcon }[] = [
  { label: 'Daily commute', hint: 'Mostly weekday miles', icon: BriefcaseBusiness },
  { label: 'Family life', hint: 'School runs and passengers', icon: Users },
  { label: 'City errands', hint: 'Short trips and tight parking', icon: ShoppingBag },
  { label: 'Road trips', hint: 'Long weekends and highways', icon: Route },
  { label: 'Outdoors & gear', hint: 'Bikes, trails, or rough roads', icon: Mountain },
  { label: 'Work use', hint: 'Clients, tools, or deliveries', icon: CarFront },
];

export const priorityOptions: { label: string; icon: LucideIcon }[] = [
  { label: 'Safety tech', icon: ShieldCheck },
  { label: 'Low running cost', icon: Leaf },
  { label: 'Comfort', icon: Sun },
  { label: 'Easy parking', icon: CircleParking },
  { label: 'Cargo room', icon: ShoppingBag },
  { label: 'Fun to drive', icon: Gauge },
  { label: 'Winter ready', icon: Mountain },
  { label: 'Premium feel', icon: Star },
];

export const stepCopy = [
  {
    eyebrow: 'Start with real life, not specs',
    title: 'What does a normal week on the road look like?',
    body: 'Pick the situations that happen most. Two or three is plenty, and you can always add context in chat.',
  },
  {
    eyebrow: 'Your non-negotiables',
    title: 'What should your next car be especially good at?',
    body: 'Choose up to three. I will translate them into the features and specifications that matter.',
  },
  {
    eyebrow: 'Keep the cost comfortable',
    title: 'What can you spend, and how new do you want it?',
    body: "Set your top price and the year range you're comfortable with.",
  },
  {
    eyebrow: 'A quick reality check',
    title: 'A few details that can change the answer.',
    body: 'These help me rule out cars that look good on paper but will not work day to day.',
  },
  {
    eyebrow: 'Shortlist ready',
    title: 'Potential strong fits, based on your needs.',
    body: 'Ask Cora to compare or refine anything.',
  },
];

export const initialAnswers: WizardAnswers = {
  driving: [],
  priorities: [],
  seats: '5 people',
  parking: 'Driveway',
  powertrain: 'Open to any',
  price: 31000,
  yearMin: 2019,
  yearMax: 2025,
  notes: '',
};

export const initialMessages: Message[] = [
  {
    id: 'init-1',
    role: 'assistant',
    content:
      'I will handle the car jargon. Use the guided choices for the basics, and tell me anything unusual here whenever it comes to mind.',
  },
];

export const ERROR_MESSAGES: Record<ChatErrorType, string> = {
  rate_limit: 'Too many requests — please wait a moment and try again',
  connection: "Couldn't reach the AI service — check your connection and retry",
  api_error: 'The AI service returned an error — please try again',
  unknown: 'Something went wrong — please try again',
};

export const WIZARD_TRIGGER_MESSAGE = 'Find me the best matching cars based on my profile.';

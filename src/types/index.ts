export type Category =
  | 'AIs'
  | 'Enhancements'
  | 'Projects'
  | 'Licenses'
  | 'Services'
  | 'Securities'
  | 'Product Replacements'
  | 'Infrastructure'
  | 'Others';

export const CATEGORIES: Category[] = [
  'AIs',
  'Enhancements',
  'Projects',
  'Licenses',
  'Services',
  'Securities',
  'Product Replacements',
  'Infrastructure',
  'Others',
];

export type Status = 'Active' | 'Pending' | 'Delayed' | 'Completed';
export const STATUSES: Status[] = ['Active', 'Pending', 'Delayed', 'Completed'];

export type Urgency = 'High' | 'Medium' | 'Low';
export const URGENCIES: Urgency[] = ['High', 'Medium', 'Low'];

export type Severity = 'Low' | 'Medium' | 'High';
export const SEVERITIES: Severity[] = ['Low', 'Medium', 'High'];

export interface Initiative {
  id: string;
  category: Category;
  name: string;
  description: string;
  owner: string;
  currentProcess: string;
  enhancedProcess: string;
  budget: string;
  demandNumber: string;
  status: Status;
  urgency: Urgency;
  comments: string;
  implementer: string;
  logDate: string;
  logDescription: string;
  severity: Severity;
  updatedAt: string;
  createdByEmail?: string;
}

export interface AuditLog {
  id: string;
  initiativeId: string;
  initiativeName: string;
  logDate: string;
  logDescription: string;
  logSeverity: Severity;
  status: Status;
  category: Category;
  ownerName?: string;
}

export interface Owner {
  id: string;
  name: string;
}

export type Role = 'User' | 'Manager' | 'Admin';

export interface MemoDraft {
  initiativeId: string;
  to: string;
  from: string;
  date: string;
  reference: string;
  subject: string;
  introduction: string;
  body: string;
  conclusion: string;
  attachment: string;
}

export interface MemoRecord {
  id: string;
  initiativeId: string;
  initiativeName: string;
  category: Category;
  fileName: string;
  createdAt: string;
  updatedAt: string;
  pdfDataUri: string;
  draft: MemoDraft;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export type TabId = 'home' | 'initiatives' | 'audit-logs' | 'dashboard' | 'admin';

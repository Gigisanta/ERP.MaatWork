export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'advisor' | 'manager' | 'admin';
  phone?: string;
  avatar?: string;
  department?: string;
  position?: string;

  teamId?: string;
  managerId?: string;
  isActive: boolean;
  isApproved: boolean;
  joinedAt: string;
  lastActivity?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  permissions: string[];
  skills: string[];
  goals: TeamMemberGoal[];
  performance: PerformanceData;
  contactsAssigned: number;
  dealsAssigned: number;
  territory?: Territory;
  schedule?: Schedule;
}

export interface TeamMemberGoal {
  id: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceData {
  rating: number;
  trend: 'up' | 'down' | 'stable';
  rank: number;
  totalRank: number;
  metrics: {
    contactsCreated: number;
    dealsWon: number;
    revenue: number;
    conversionRate: number;
    responseTime: number;
    customerSatisfaction: number;
  };
  achievements: Achievement[];
  lastReview?: string;
  nextReview?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  category: 'sales' | 'customer_service' | 'teamwork' | 'leadership' | 'innovation';
}

export interface Territory {
  id: string;
  name: string;
  description?: string;
  regions: string[];
  industries: string[];
  accountTypes: string[];
}

export interface Schedule {
  timezone: string;
  workingHours: {
    monday: WorkingDay;
    tuesday: WorkingDay;
    wednesday: WorkingDay;
    thursday: WorkingDay;
    friday: WorkingDay;
    saturday?: WorkingDay;
    sunday?: WorkingDay;
  };
  breaks: Break[];
  vacations: Vacation[];
}

export interface WorkingDay {
  isWorking: boolean;
  startTime: string;
  endTime: string;
}

export interface Break {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  recurring: boolean;
  days?: string[];
}

export interface Vacation {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  type: 'vacation' | 'sick_leave' | 'personal' | 'other';
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  managerId: string;
  managerName?: string;
  members: TeamMember[];
  goals: TeamGoal[];
  performance: TeamPerformance;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface TeamGoal {
  id: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamPerformance {
  totalRevenue: number;
  totalContacts: number;
  totalDeals: number;
  conversionRate: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  goalAchievementRate: number;
  memberPerformance: Array<{
    memberId: string;
    memberName: string;
    performance: PerformanceData;
  }>;
  trends: {
    revenue: 'up' | 'down' | 'stable';
    contacts: 'up' | 'down' | 'stable';
    deals: 'up' | 'down' | 'stable';
    satisfaction: 'up' | 'down' | 'stable';
  };
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  invitedBy: string;
  invitedByName: string;
  invitedEmail: string;
  role: 'advisor' | 'manager';
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  message?: string;
}
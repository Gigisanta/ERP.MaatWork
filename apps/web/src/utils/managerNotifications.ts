import React from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { TeamMetrics, AdvisorMetrics } from '../types/metrics';
import { Contact } from '../types/crm';
import { TeamMember } from '../types/team';

export interface ManagerNotificationConfig {
  teamPerformanceAlerts: boolean;
  advisorPerformanceAlerts: boolean;
  contactAssignmentAlerts: boolean;
  goalAchievementAlerts: boolean;
  lowPerformanceAlerts: boolean;
  newContactAlerts: boolean;
}

export interface PerformanceThresholds {
  lowConversionRate: number; // Below this percentage
  highConversionRate: number; // Above this percentage
  lowRevenue: number; // Below this amount
  highRevenue: number; // Above this amount
  inactivityDays: number; // Days without activity
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  lowConversionRate: 0.05, // 5%
  highConversionRate: 0.25, // 25%
  lowRevenue: 1000,
  highRevenue: 10000,
  inactivityDays: 7
};

class ManagerNotificationService {
  private config: ManagerNotificationConfig;
  private thresholds: PerformanceThresholds;
  private notificationStore: any;

  constructor() {
    this.config = {
      teamPerformanceAlerts: true,
      advisorPerformanceAlerts: true,
      contactAssignmentAlerts: true,
      goalAchievementAlerts: true,
      lowPerformanceAlerts: true,
      newContactAlerts: true
    };
    this.thresholds = DEFAULT_THRESHOLDS;
  }

  setNotificationStore(store: any) {
    this.notificationStore = store;
  }

  updateConfig(newConfig: Partial<ManagerNotificationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  updateThresholds(newThresholds: Partial<PerformanceThresholds>) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  // Team Performance Notifications
  checkTeamPerformance(currentMetrics: TeamMetrics, previousMetrics?: TeamMetrics) {
    if (!this.config.teamPerformanceAlerts || !this.notificationStore) return;

    const notifications = [];

    // Check conversion rate trends
    if (previousMetrics) {
      const conversionChange = currentMetrics.conversionRate - previousMetrics.conversionRate;
      
      if (conversionChange < -0.05) { // 5% decrease
        notifications.push({
          type: 'warning' as const,
          title: 'Disminución en Tasa de Conversión del Equipo',
          message: `La tasa de conversión del equipo ha disminuido un ${Math.abs(conversionChange * 100).toFixed(1)}% respecto al período anterior.`,
          category: 'team_performance',
          priority: 'high' as const,
          data: {
            current: currentMetrics.conversionRate,
            previous: previousMetrics.conversionRate,
            change: conversionChange
          }
        });
      } else if (conversionChange > 0.05) { // 5% increase
        notifications.push({
          type: 'success' as const,
          title: 'Mejora en Tasa de Conversión del Equipo',
          message: `¡Excelente! La tasa de conversión del equipo ha mejorado un ${(conversionChange * 100).toFixed(1)}%.`,
          category: 'team_performance',
          priority: 'medium' as const,
          data: {
            current: currentMetrics.conversionRate,
            previous: previousMetrics.conversionRate,
            change: conversionChange
          }
        });
      }

      // Check revenue trends
      const revenueChange = ((currentMetrics.revenue - previousMetrics.revenue) / previousMetrics.revenue) * 100;
      
      if (revenueChange < -10) { // 10% decrease
        notifications.push({
          type: 'error' as const,
          title: 'Disminución Significativa en Ingresos',
          message: `Los ingresos del equipo han disminuido un ${Math.abs(revenueChange).toFixed(1)}% respecto al período anterior.`,
          category: 'team_performance',
          priority: 'high' as const,
          data: {
            current: currentMetrics.revenue,
            previous: previousMetrics.revenue,
            changePercent: revenueChange
          }
        });
      } else if (revenueChange > 15) { // 15% increase
        notifications.push({
          type: 'success' as const,
          title: 'Crecimiento Excepcional en Ingresos',
          message: `¡Felicitaciones! Los ingresos del equipo han crecido un ${revenueChange.toFixed(1)}%.`,
          category: 'team_performance',
          priority: 'medium' as const,
          data: {
            current: currentMetrics.revenue,
            previous: previousMetrics.revenue,
            changePercent: revenueChange
          }
        });
      }
    }

    // Check absolute thresholds
    if (currentMetrics.conversionRate < this.thresholds.lowConversionRate) {
      notifications.push({
        type: 'warning' as const,
        title: 'Tasa de Conversión Baja del Equipo',
        message: `La tasa de conversión del equipo (${(currentMetrics.conversionRate * 100).toFixed(1)}%) está por debajo del umbral mínimo.`,
        category: 'team_performance',
        priority: 'high' as const,
        data: {
          current: currentMetrics.conversionRate,
          threshold: this.thresholds.lowConversionRate
        }
      });
    }

    // Send notifications using unified store API
    notifications.forEach(n => {
      this.notificationStore.createNotification({
        user_id: 'current-user',
        type: n.type,
        title: n.title,
        message: n.message,
        priority: n.priority,
        data: { category: n.category, ...n.data }
      });
    });
  }

  // Individual Advisor Performance Notifications
  checkAdvisorPerformance(advisorMetrics: AdvisorMetrics[], teamMembers: TeamMember[]) {
    if (!this.config.advisorPerformanceAlerts || !this.notificationStore) return;

    const notifications = [];

    advisorMetrics.forEach(advisor => {
      const member = teamMembers.find(m => m.id === advisor.advisorId);
      const advisorName = advisor.advisorName || member?.name || advisor.advisorId;

      // Low performance alerts
      if (this.config.lowPerformanceAlerts) {
        if (advisor.conversionRate < this.thresholds.lowConversionRate) {
          notifications.push({
            type: 'warning' as const,
            title: 'Rendimiento Bajo Detectado',
            message: `${advisorName} tiene una tasa de conversión baja (${(advisor.conversionRate * 100).toFixed(1)}%).`,
            category: 'advisor_performance',
            priority: 'medium' as const,
            data: {
              advisorId: advisor.advisorId,
              advisorName,
              conversionRate: advisor.conversionRate,
              threshold: this.thresholds.lowConversionRate
            }
          });
        }

        if (advisor.revenue < this.thresholds.lowRevenue) {
          notifications.push({
            type: 'info' as const,
            title: 'Ingresos Bajos',
            message: `${advisorName} ha generado ingresos por debajo del objetivo este período.`,
            category: 'advisor_performance',
            priority: 'low' as const,
            data: {
              advisorId: advisor.advisorId,
              advisorName,
              revenue: advisor.revenue,
              threshold: this.thresholds.lowRevenue
            }
          });
        }
      }

      // High performance recognition
      if (advisor.conversionRate > this.thresholds.highConversionRate) {
        notifications.push({
          type: 'success' as const,
          title: 'Excelente Rendimiento',
          message: `¡${advisorName} está teniendo un rendimiento excepcional con ${(advisor.conversionRate * 100).toFixed(1)}% de conversión!`,
          category: 'advisor_performance',
          priority: 'low' as const,
          data: {
            advisorId: advisor.advisorId,
            advisorName,
            conversionRate: advisor.conversionRate
          }
        });
      }

      if (advisor.revenue > this.thresholds.highRevenue) {
        notifications.push({
          type: 'success' as const,
          title: 'Meta de Ingresos Superada',
          message: `¡${advisorName} ha superado la meta de ingresos con €${advisor.revenue.toLocaleString()}!`,
          category: 'advisor_performance',
          priority: 'low' as const,
          data: {
            advisorId: advisor.advisorId,
            advisorName,
            revenue: advisor.revenue
          }
        });
      }
    });

    // Send notifications
    notifications.forEach(notification => {
      this.notificationStore.addNotification(notification);
    });
  }

  // Contact Assignment Notifications
  notifyContactAssignment(contact: Contact, fromAdvisor?: string, toAdvisor?: string) {
    if (!this.config.contactAssignmentAlerts || !this.notificationStore) return;

    let message = '';
    if (fromAdvisor && toAdvisor) {
      message = `El contacto ${contact.name} ha sido reasignado de ${fromAdvisor} a ${toAdvisor}.`;
    } else if (toAdvisor) {
      message = `El contacto ${contact.name} ha sido asignado a ${toAdvisor}.`;
    } else {
      message = `El contacto ${contact.name} ha sido desasignado.`;
    }

    this.notificationStore.createNotification({
      user_id: 'current-user',
      type: 'info' as const,
      title: 'Contacto Reasignado',
      message,
      priority: 'low' as const,
      data: {
        category: 'contact_management',
        contactId: contact.id,
        contactName: contact.name,
        fromAdvisor,
        toAdvisor
      }
    });
  }

  // New Contact Notifications
  notifyNewContact(contact: Contact, assignedAdvisor?: string) {
    if (!this.config.newContactAlerts || !this.notificationStore) return;

    const message = assignedAdvisor 
      ? `Nuevo contacto ${contact.name} asignado a ${assignedAdvisor}.`
      : `Nuevo contacto ${contact.name} agregado al sistema.`;

    this.notificationStore.createNotification({
      user_id: 'current-user',
      type: 'info' as const,
      title: 'Nuevo Contacto',
      message,
      priority: 'low' as const,
      data: {
        category: 'contact_management',
        contactId: contact.id,
        contactName: contact.name,
        assignedAdvisor,
        source: contact.source
      }
    });
  }

  // Goal Achievement Notifications
  notifyGoalAchievement(type: 'team' | 'advisor', achiever: string, goalType: string, value: number, target: number) {
    if (!this.config.goalAchievementAlerts || !this.notificationStore) return;

    const percentage = ((value / target) * 100).toFixed(1);
    const message = type === 'team' 
      ? `¡El equipo ha alcanzado el ${percentage}% de la meta de ${goalType}!`
      : `¡${achiever} ha alcanzado el ${percentage}% de la meta de ${goalType}!`;

    this.notificationStore.createNotification({
      user_id: 'current-user',
      type: 'success' as const,
      title: 'Meta Alcanzada',
      message,
      priority: 'medium' as const,
      data: {
        category: 'goal_achievement',
        type,
        achiever,
        goalType,
        value,
        target,
        percentage: parseFloat(percentage)
      }
    });
  }

  // Inactivity Notifications
  checkInactiveContacts(contacts: Contact[]) {
    if (!this.notificationStore) return;

    const now = new Date();
    const inactiveThreshold = new Date(now.getTime() - (this.thresholds.inactivityDays * 24 * 60 * 60 * 1000));
    
    const inactiveContacts = contacts.filter(contact => {
      const lastActivity = contact.lastActivity ? new Date(contact.lastActivity) : new Date(contact.createdAt);
      return lastActivity < inactiveThreshold && 
             !['closed_won', 'closed_lost'].includes(contact.status);
    });

    if (inactiveContacts.length > 0) {
      this.notificationStore.createNotification({
        user_id: 'current-user',
        type: 'warning' as const,
        title: 'Contactos Inactivos Detectados',
        message: `Hay ${inactiveContacts.length} contacto(s) sin actividad por más de ${this.thresholds.inactivityDays} días.`,
        priority: 'medium' as const,
        data: {
          category: 'contact_management',
          inactiveCount: inactiveContacts.length,
          inactiveContacts: inactiveContacts.map(c => ({
            id: c.id,
            name: c.name,
            assignedTo: c.assignedTo,
            lastActivity: c.lastActivity
          }))
        }
      });
    }
  }

  // Bulk notification for multiple events
  processBulkNotifications(events: Array<{
    type: 'team_performance' | 'advisor_performance' | 'contact_assignment' | 'new_contact' | 'goal_achievement';
    data: any;
  }>) {
    events.forEach(event => {
      switch (event.type) {
        case 'team_performance':
          this.checkTeamPerformance(event.data.current, event.data.previous);
          break;
        case 'advisor_performance':
          this.checkAdvisorPerformance(event.data.advisorMetrics, event.data.teamMembers);
          break;
        case 'contact_assignment':
          this.notifyContactAssignment(event.data.contact, event.data.fromAdvisor, event.data.toAdvisor);
          break;
        case 'new_contact':
          this.notifyNewContact(event.data.contact, event.data.assignedAdvisor);
          break;
        case 'goal_achievement':
          this.notifyGoalAchievement(
            event.data.type,
            event.data.achiever,
            event.data.goalType,
            event.data.value,
            event.data.target
          );
          break;
      }
    });
  }
}

// Singleton instance
export const managerNotificationService = new ManagerNotificationService();

// React hook for easy integration
export const useManagerNotifications = () => {
  const notificationStore = useNotificationStore();
  
  React.useEffect(() => {
    managerNotificationService.setNotificationStore(notificationStore);
  }, [notificationStore]);

  return {
    service: managerNotificationService,
    updateConfig: (config: Partial<ManagerNotificationConfig>) => 
      managerNotificationService.updateConfig(config),
    updateThresholds: (thresholds: Partial<PerformanceThresholds>) => 
      managerNotificationService.updateThresholds(thresholds),
    checkTeamPerformance: (current: TeamMetrics, previous?: TeamMetrics) => 
      managerNotificationService.checkTeamPerformance(current, previous),
    checkAdvisorPerformance: (advisorMetrics: AdvisorMetrics[], teamMembers: TeamMember[]) => 
      managerNotificationService.checkAdvisorPerformance(advisorMetrics, teamMembers),
    notifyContactAssignment: (contact: Contact, fromAdvisor?: string, toAdvisor?: string) => 
      managerNotificationService.notifyContactAssignment(contact, fromAdvisor, toAdvisor),
    notifyNewContact: (contact: Contact, assignedAdvisor?: string) => 
      managerNotificationService.notifyNewContact(contact, assignedAdvisor),
    notifyGoalAchievement: (type: 'team' | 'advisor', achiever: string, goalType: string, value: number, target: number) => 
      managerNotificationService.notifyGoalAchievement(type, achiever, goalType, value, target),
    checkInactiveContacts: (contacts: Contact[]) => 
      managerNotificationService.checkInactiveContacts(contacts)
  };
};

export default managerNotificationService;
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TeamMetrics, AdvisorMetrics } from '../types/metrics';
import { Contact } from '../types/crm';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportData {
  teamMetrics?: TeamMetrics[];
  advisorMetrics?: AdvisorMetrics[];
  contacts?: Contact[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExportOptions {
  filename?: string;
  includeCharts?: boolean;
  format?: 'xlsx' | 'csv' | 'pdf';
  sections?: ('overview' | 'advisors' | 'contacts' | 'performance')[];
}

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

const formatDate = (date: Date): string => {
  return format(date, 'dd/MM/yyyy', { locale: es });
};

// Excel Export Functions
export const exportToExcel = async (data: ExportData, options: ExportOptions = {}): Promise<void> => {
  const {
    filename = `reporte_equipo_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sections = ['overview', 'advisors', 'contacts', 'performance']
  } = options;

  const workbook = XLSX.utils.book_new();

  // Overview Sheet
  if (sections.includes('overview') && data.teamMetrics?.length) {
    const overviewData = data.teamMetrics.map(metric => ({
      'Fecha': formatDate(new Date(metric.date)),
      'Total Contactos': metric.totalContacts,
      'Contactos Activos': metric.activeContacts,
      'Conversiones': metric.conversions,
      'Tasa Conversión': formatPercentage(metric.conversionRate),
      'Ingresos': formatCurrency(metric.revenue),
      'Promedio por Asesor': formatCurrency(metric.avgRevenuePerAdvisor),
      'Asesores Activos': metric.activeAdvisors
    }));

    const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Resumen Equipo');
  }

  // Advisors Performance Sheet
  if (sections.includes('advisors') && data.advisorMetrics?.length) {
    const advisorData = data.advisorMetrics.map(advisor => ({
      'ID Asesor': advisor.advisorId,
      'Nombre': advisor.advisorName || 'N/A',
      'Fecha': formatDate(new Date(advisor.date)),
      'Contactos Asignados': advisor.contactsAssigned,
      'Contactos Activos': advisor.activeContacts,
      'Conversiones': advisor.conversions,
      'Tasa Conversión': formatPercentage(advisor.conversionRate),
      'Ingresos Generados': formatCurrency(advisor.revenue),
      'Llamadas Realizadas': advisor.callsMade || 0,
      'Emails Enviados': advisor.emailsSent || 0,
      'Tareas Completadas': advisor.tasksCompleted || 0,
      'Puntuación': advisor.performanceScore?.toFixed(2) || 'N/A'
    }));

    const advisorSheet = XLSX.utils.json_to_sheet(advisorData);
    XLSX.utils.book_append_sheet(workbook, advisorSheet, 'Rendimiento Asesores');
  }

  // Contacts Sheet
  if (sections.includes('contacts') && data.contacts?.length) {
    const contactData = data.contacts.map(contact => ({
      'ID': contact.id,
      'Nombre': contact.name,
      'Email': contact.email,
      'Teléfono': contact.phone || 'N/A',
      'Estado': contact.status,
      'Asesor Asignado': contact.assignedTo || 'Sin asignar',
      'Fecha Creación': formatDate(new Date(contact.createdAt)),
      'Última Actividad': contact.lastActivity ? formatDate(new Date(contact.lastActivity)) : 'N/A',
      'Valor Estimado': contact.estimatedValue ? formatCurrency(contact.estimatedValue) : 'N/A',
      'Fuente': contact.source || 'N/A'
    }));

    const contactSheet = XLSX.utils.json_to_sheet(contactData);
    XLSX.utils.book_append_sheet(workbook, contactSheet, 'Contactos');
  }

  // Performance Comparison Sheet
  if (sections.includes('performance') && data.advisorMetrics?.length) {
    const performanceData = data.advisorMetrics
      .reduce((acc, metric) => {
        const existing = acc.find(item => item.advisorId === metric.advisorId);
        if (existing) {
          existing.totalRevenue += metric.revenue;
          existing.totalConversions += metric.conversions;
          existing.totalContacts += metric.contactsAssigned;
        } else {
          acc.push({
            advisorId: metric.advisorId,
            advisorName: metric.advisorName || 'N/A',
            totalRevenue: metric.revenue,
            totalConversions: metric.conversions,
            totalContacts: metric.contactsAssigned,
            avgPerformanceScore: metric.performanceScore || 0
          });
        }
        return acc;
      }, [] as any[])
      .map(advisor => ({
        'Asesor': advisor.advisorName,
        'Total Ingresos': formatCurrency(advisor.totalRevenue),
        'Total Conversiones': advisor.totalConversions,
        'Total Contactos': advisor.totalContacts,
        'Tasa Conversión Promedio': formatPercentage(advisor.totalConversions / advisor.totalContacts || 0),
        'Puntuación Promedio': advisor.avgPerformanceScore.toFixed(2)
      }))
      .sort((a, b) => parseFloat(b['Puntuación Promedio']) - parseFloat(a['Puntuación Promedio']));

    const performanceSheet = XLSX.utils.json_to_sheet(performanceData);
    XLSX.utils.book_append_sheet(workbook, performanceSheet, 'Comparativa Rendimiento');
  }

  // Download file
  XLSX.writeFile(workbook, filename);
};

// CSV Export Functions
export const exportToCSV = async (data: ExportData, options: ExportOptions = {}): Promise<void> => {
  const {
    filename = `reporte_equipo_${format(new Date(), 'yyyy-MM-dd')}.csv`,
    sections = ['advisors']
  } = options;

  let csvContent = '';

  if (sections.includes('advisors') && data.advisorMetrics?.length) {
    const headers = [
      'ID Asesor', 'Nombre', 'Fecha', 'Contactos Asignados', 'Contactos Activos',
      'Conversiones', 'Tasa Conversión', 'Ingresos Generados', 'Puntuación'
    ];

    csvContent += headers.join(',') + '\n';

    data.advisorMetrics.forEach(advisor => {
      const row = [
        advisor.advisorId,
        `"${advisor.advisorName || 'N/A'}"`,
        formatDate(new Date(advisor.date)),
        advisor.contactsAssigned,
        advisor.activeContacts,
        advisor.conversions,
        formatPercentage(advisor.conversionRate),
        formatCurrency(advisor.revenue),
        advisor.performanceScore?.toFixed(2) || 'N/A'
      ];
      csvContent += row.join(',') + '\n';
    });
  }

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// PDF Export Functions
export const exportToPDF = async (data: ExportData, options: ExportOptions = {}): Promise<void> => {
  const {
    filename = `reporte_equipo_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
    sections = ['overview', 'advisors']
  } = options;

  const doc = new jsPDF();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.text('Reporte de Rendimiento del Equipo', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.text(`Generado el: ${formatDate(new Date())}`, 20, yPosition);
  yPosition += 20;

  // Team Overview Section
  if (sections.includes('overview') && data.teamMetrics?.length) {
    doc.setFontSize(16);
    doc.text('Resumen del Equipo', 20, yPosition);
    yPosition += 10;

    const latestMetrics = data.teamMetrics[data.teamMetrics.length - 1];
    const overviewData = [
      ['Total de Contactos', latestMetrics.totalContacts.toString()],
      ['Contactos Activos', latestMetrics.activeContacts.toString()],
      ['Conversiones', latestMetrics.conversions.toString()],
      ['Tasa de Conversión', formatPercentage(latestMetrics.conversionRate)],
      ['Ingresos Totales', formatCurrency(latestMetrics.revenue)],
      ['Asesores Activos', latestMetrics.activeAdvisors.toString()]
    ];

    doc.autoTable({
      startY: yPosition,
      head: [['Métrica', 'Valor']],
      body: overviewData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;
  }

  // Advisors Performance Section
  if (sections.includes('advisors') && data.advisorMetrics?.length) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.text('Rendimiento por Asesor', 20, yPosition);
    yPosition += 10;

    const advisorTableData = data.advisorMetrics.slice(0, 10).map(advisor => [
      advisor.advisorName || 'N/A',
      advisor.contactsAssigned.toString(),
      advisor.conversions.toString(),
      formatPercentage(advisor.conversionRate),
      formatCurrency(advisor.revenue),
      advisor.performanceScore?.toFixed(1) || 'N/A'
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Asesor', 'Contactos', 'Conversiones', 'Tasa Conv.', 'Ingresos', 'Puntuación']],
      body: advisorTableData,
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 25 }
      }
    });
  }

  // Save PDF
  doc.save(filename);
};

// Main export function
export const exportTeamReport = async (
  data: ExportData,
  exportFormat: 'xlsx' | 'csv' | 'pdf' = 'xlsx',
  options: ExportOptions = {}
): Promise<void> => {
  try {
    switch (exportFormat) {
      case 'xlsx':
        await exportToExcel(data, { ...options, format: exportFormat });
        break;
      case 'csv':
        await exportToCSV(data, { ...options, format: exportFormat });
        break;
      case 'pdf':
        await exportToPDF(data, { ...options, format: exportFormat });
        break;
      default:
        throw new Error(`Formato no soportado: ${exportFormat}`);
    }
  } catch (error) {
    console.error('Error al exportar reporte:', error);
    throw error;
  }
};

// Quick export functions for common use cases
export const exportTeamOverview = async (teamMetrics: TeamMetrics[], exportFormat: 'xlsx' | 'csv' | 'pdf' = 'xlsx') => {
  return exportTeamReport(
    { teamMetrics },
    exportFormat,
    { sections: ['overview'], filename: `resumen_equipo_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}` }
  );
};

export const exportAdvisorPerformance = async (advisorMetrics: AdvisorMetrics[], exportFormat: 'xlsx' | 'csv' | 'pdf' = 'xlsx') => {
  return exportTeamReport(
    { advisorMetrics },
    exportFormat,
    { sections: ['advisors', 'performance'], filename: `rendimiento_asesores_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}` }
  );
};

export const exportTeamContacts = async (contacts: Contact[], exportFormat: 'xlsx' | 'csv' | 'pdf' = 'xlsx') => {
  return exportTeamReport(
    { contacts },
    exportFormat,
    { sections: ['contacts'], filename: `contactos_equipo_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}` }
  );
};

export const exportFullTeamReport = async (
  teamMetrics: TeamMetrics[],
  advisorMetrics: AdvisorMetrics[],
  contacts: Contact[],
  exportFormat: 'xlsx' | 'csv' | 'pdf' = 'xlsx'
) => {
  return exportTeamReport(
    { teamMetrics, advisorMetrics, contacts },
    exportFormat,
    { 
      sections: ['overview', 'advisors', 'contacts', 'performance'],
      filename: `reporte_completo_equipo_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`
    }
  );
};
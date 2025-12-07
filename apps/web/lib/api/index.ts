/**
 * API Module - Barrel Export
 * 
 * Exports all API functions and the ApiClient:
 * 
 * Client components (refactored from api-client.ts):
 * - client.ts - Main ApiClient class
 * - auth-manager.ts - Token refresh management
 * - retry-handler.ts - Retry logic with exponential backoff
 * - request-builder.ts - Header building, body serialization
 * - types.ts - Shared types
 * 
 * Domain-specific API functions:
 * - analytics.ts, aum.ts, automations.ts, benchmarks.ts, bloomberg.ts
 * - broker-accounts.ts, capacitaciones.ts, career-plan.ts, contacts.ts
 * - instruments.ts, metrics.ts, notes.ts, notifications.ts, pipeline.ts
 * - portfolios.ts, settings.ts, tags.ts, tasks.ts, teams.ts, users.ts
 * 
 * AI_DECISION: Reemplazar export * con exports específicos
 * Justificación: Mejora tree-shaking, reduce bundle size, cumple reglas ESLint
 * Impacto: Mejor optimización de bundle, imports más explícitos
 */

// ApiClient and related
export { ApiClient } from './client';
export type { RequestOptions, RequestConfig } from './types';

// Re-export commonly used items from api-error
export { ApiError } from '../api-error';
export type { ApiResponse } from '@/types';

// Singleton instance
import { ApiClient } from './client';
export const apiClient = new ApiClient();

// ==========================================================
// Analytics API
// ==========================================================
export {
  getDashboardKPIs,
  getPortfolioPerformance,
  comparePortfolios,
} from './analytics';

// ==========================================================
// AUM API
// ==========================================================
export {
  getAumRows,
  uploadAumFile,
  getAumFilePreview,
  getAumFileExportUrl,
  matchAumRow,
  getAumDuplicates,
  commitAumFile,
  cleanupAumDuplicates,
  resetAumSystem,
  updateAumRowAdvisor,
  uploadAdvisorMapping,
  getAdvisorAumSummary,
  getAvailableAumPeriods,
  type AdvisorSummaryItem,
  type AdvisorSummaryTotals,
  type AdvisorSummaryResponse,
  type AvailablePeriod,
  type AvailablePeriodsResponse,
} from './aum';

// ==========================================================
// AUM Validation Schemas
// ==========================================================
export {
  aumMatchStatusSchema,
  aumTotalsSchema,
  aumFileSchema,
  aumContactInfoSchema,
  aumUserInfoSchema,
  aumRowSchema,
  aumUploadResponseSchema,
  aumRowsResponseSchema,
  aumHistoryResponseSchema,
  aumMatchRowResponseSchema,
  type AumUploadResponse,
  type AumRowsResponse,
  type AumHistoryResponse,
  type AumMatchRowResponse,
} from './aum-validation';

// ==========================================================
// Automations API
// ==========================================================
export {
  getAutomationConfigs,
  getAutomationConfigById,
  getAutomationConfigByName,
  createAutomationConfig,
  updateAutomationConfig,
  deleteAutomationConfig,
} from './automations';

// ==========================================================
// Benchmarks API
// ==========================================================
export {
  getBenchmarks,
  getBenchmarkById,
  getBenchmarkComponentsBatch,
  createBenchmark,
  updateBenchmark,
  deleteBenchmark,
  addBenchmarkComponent,
  updateBenchmarkComponent,
  deleteBenchmarkComponent,
} from './benchmarks';

// ==========================================================
// Bloomberg API
// ==========================================================
export {
  getAssetSnapshot,
  getOHLCV,
  getMacroSeries,
  getYieldCurve,
  getYieldSpreads,
  getMacroSeriesList,
  type AssetSnapshot,
  type OHLCVPoint,
  type MacroSeriesPoint,
  type YieldPoint,
  type YieldCurve,
  type MacroSeries,
  type MacroSeriesListItem,
} from './bloomberg';

// ==========================================================
// Broker Accounts API
// ==========================================================
export {
  getBrokerAccounts,
  createBrokerAccount,
  deleteBrokerAccount,
} from './broker-accounts';

// ==========================================================
// Capacitaciones API
// ==========================================================
export {
  getCapacitaciones,
  getCapacitacionById,
  createCapacitacion,
  updateCapacitacion,
  deleteCapacitacion,
  importCapacitacionesCSV,
} from './capacitaciones';

// ==========================================================
// Career Plan API
// ==========================================================
export {
  getCareerPlanLevels,
  getCareerPlanLevel,
  createCareerPlanLevel,
  updateCareerPlanLevel,
  deleteCareerPlanLevel,
  getUserCareerProgress,
} from './career-plan';

// ==========================================================
// Contacts API
// ==========================================================
export {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  updateContactField,
  assignPortfolioToContact,
  removePortfolioAssignment,
  updatePortfolioAssignmentStatus,
  sendContactsToWebhook,
  type WebhookMetadata,
  type WebhookResult,
} from './contacts';

// ==========================================================
// Instruments API
// ==========================================================
export {
  searchInstruments,
  validateSymbol,
  getInstruments,
  getInstrumentById,
  createInstrument,
  updateInstrument,
  deleteInstrument,
} from './instruments';

// ==========================================================
// Metrics API
// ==========================================================
export {
  getContactsMetrics,
  getMonthlyGoals,
  saveMonthlyGoals,
} from './metrics';

// ==========================================================
// Notes API
// ==========================================================
export {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from './notes';

// ==========================================================
// Pipeline API
// ==========================================================
export {
  getPipelineStages,
  moveContactToStage,
  getPipelineBoard,
  getNextPipelineStage,
} from './pipeline';

// ==========================================================
// Portfolios API
// ==========================================================
export {
  getPortfolios,
  getPortfolioById,
  getPortfolioLines,
  getPortfolioLinesBatch,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  addPortfolioLine,
  updatePortfolioLine,
  deletePortfolioLine,
} from './portfolios';

// ==========================================================
// Settings API
// ==========================================================
export {
  listAdvisorAliases,
  createAdvisorAlias,
  updateAdvisorAlias,
  deleteAdvisorAlias,
  type AdvisorAliasDto,
} from './settings';

// ==========================================================
// Tags API
// ==========================================================
export {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  updateContactTags,
  getContactTag,
  updateContactTag,
} from './tags';

// ==========================================================
// Tasks API
// ==========================================================
export {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from './tasks';

// ==========================================================
// Teams API
// ==========================================================
export {
  getTeams,
  getTeamById,
  getTeamDetail,
  getTeamMemberById,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  getTeamAdvisors,
  getTeamMembers,
  createTeamInvitation,
  getMembershipRequests,
  respondToMembershipRequest,
  getPendingInvitations,
  respondToInvitation,
  inviteTeamMember,
  getAllTeamMembers,
  getTeamMetrics,
  getTeamMemberMetrics,
  getTeamMembersActivity,
  type CreateTeamRequest,
  type AddTeamMemberRequest,
  type TeamDetailResponse,
  type TeamMembersActivityResponse,
} from './teams';

// ==========================================================
// Users API
// ==========================================================
export {
  getAdvisors,
  getUsers,
  getUserById,
  getCurrentUser,
  updateUserProfile,
  changePassword,
  getManagers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getPendingUsers,
  approveUser,
  rejectUser,
} from './users';

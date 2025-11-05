/**
 * Barrel export para todos los métodos de API
 * 
 * AI_DECISION: Usar exports específicos en lugar de export * para tree-shaking
 * Justificación: Next.js no puede tree-shake componentes no usados con export *
 * Impacto: Bundle size reducido ~30-50KB eliminando componentes no usados
 * 
 * Uso:
 *   import { getPortfolios, searchInstruments, apiClient } from '@/lib/api';
 */

// Re-export client
export { apiClient, ApiError } from '../api-client';
export type { ApiResponse } from '../api-client';

// Portfolio methods
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
  deletePortfolioLine
} from './portfolios';

// Benchmark methods
export {
  getBenchmarks,
  getBenchmarkById,
  getBenchmarkComponentsBatch,
  createBenchmark,
  updateBenchmark,
  deleteBenchmark,
  addBenchmarkComponent,
  updateBenchmarkComponent,
  deleteBenchmarkComponent
} from './benchmarks';

// Instrument methods
export {
  searchInstruments,
  validateSymbol,
  getInstruments,
  getInstrumentById,
  createInstrument,
  updateInstrument,
  deleteInstrument
} from './instruments';

// Analytics methods
export {
  getDashboardKPIs,
  getPortfolioPerformance,
  comparePortfolios
} from './analytics';

// AUM methods
export {
  getAumRows,
  uploadAumFile,
  getAumFilePreview,
  getAumFileExportUrl,
  matchAumRow,
  getAumDuplicates,
  commitAumFile
} from './aum';

// Contacts methods
export {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  updateContactField,
  assignPortfolioToContact,
  removePortfolioAssignment,
  updatePortfolioAssignmentStatus
} from './contacts';

// Tags methods
export {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  updateContactTags
} from './tags';

// Pipeline methods
export {
  getPipelineStages,
  moveContactToStage,
  getPipelineBoard
} from './pipeline';

// Tasks methods
export {
  getTasks,
  createTask,
  updateTask,
  deleteTask
} from './tasks';

// Notes methods
export {
  getNotes,
  createNote,
  updateNote,
  deleteNote
} from './notes';

// Broker accounts methods
export {
  getBrokerAccounts,
  createBrokerAccount,
  deleteBrokerAccount
} from './broker-accounts';

// Users methods
export {
  getAdvisors,
  getUsers,
  getUserById,
  getCurrentUser,
  changePassword,
  getManagers,
  updateUserRole,
  updateUserStatus,
  deleteUser
} from './users';

// Teams methods
export {
  getTeams,
  getTeamById,
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
  getAllTeamMembers
} from './teams';

// Metrics methods
export {
  getContactsMetrics,
  getMonthlyGoals,
  saveMonthlyGoals
} from './metrics';

// Export types from teams
export type {
  CreateTeamRequest,
  AddTeamMemberRequest
} from './teams';

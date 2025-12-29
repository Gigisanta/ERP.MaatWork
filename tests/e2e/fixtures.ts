import { test as base } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { ContactsPage } from './pages/ContactsPage';
import { ContactDetailPage } from './pages/ContactDetailPage';
import { AumPage } from './pages/AumPage';
import { PortfoliosPage } from './pages/PortfoliosPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PipelinePage } from './pages/PipelinePage';
import { AdminPage } from './pages/AdminPage';
import { BenchmarksPage } from './pages/BenchmarksPage';
import { AutomationsPage } from './pages/AutomationsPage';

type MyFixtures = {
  authPage: AuthPage;
  contactsPage: ContactsPage;
  contactDetailPage: ContactDetailPage;
  aumPage: AumPage;
  portfoliosPage: PortfoliosPage;
  analyticsPage: AnalyticsPage;
  pipelinePage: PipelinePage;
  adminPage: AdminPage;
  benchmarksPage: BenchmarksPage;
  automationsPage: AutomationsPage;
};

export const test = base.extend<MyFixtures>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },
  contactsPage: async ({ page }, use) => {
    await use(new ContactsPage(page));
  },
  contactDetailPage: async ({ page }, use) => {
    await use(new ContactDetailPage(page));
  },
  aumPage: async ({ page }, use) => {
    await use(new AumPage(page));
  },
  portfoliosPage: async ({ page }, use) => {
    await use(new PortfoliosPage(page));
  },
  analyticsPage: async ({ page }, use) => {
    await use(new AnalyticsPage(page));
  },
  pipelinePage: async ({ page }, use) => {
    await use(new PipelinePage(page));
  },
  adminPage: async ({ page }, use) => {
    await use(new AdminPage(page));
  },
  benchmarksPage: async ({ page }, use) => {
    await use(new BenchmarksPage(page));
  },
  automationsPage: async ({ page }, use) => {
    await use(new AutomationsPage(page));
  },
});

export { expect } from '@playwright/test';

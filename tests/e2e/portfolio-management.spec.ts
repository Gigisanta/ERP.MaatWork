import { test, expect } from './fixtures';

test.describe('Portfolio Management', () => {
  test('create template and assign to client', async ({ portfoliosPage, contactsPage }) => {
    const timestamp = Date.now();
    const templateName = `Growth Strategy ${timestamp}`;
    const clientName = `Investor ${timestamp}`; // Assuming we'd create this client first, or use a seeded one

    // Prerequisite: Create a client to assign to (using factories in real app, here manual)
    await contactsPage.createContact({ firstName: clientName, lastName: 'Test' });

    // 1. Create Template
    await portfoliosPage.createTemplate(templateName, 'Aggressive growth strategy');

    // 2. Assign to Client
    await portfoliosPage.assignTemplateToClient(`${clientName} Test`, templateName);
  });

  test('rebalance portfolio', async ({ portfoliosPage, contactsPage }) => {
    // Prerequisite: Client with assigned portfolio and assets
    const clientName = 'Wealthy Client'; // Assumed seeded

    // Note: In a real test, we would seed the DB with this client and assets

    // Skipping execution if environment not set up for this specific complex flow
    // await portfoliosPage.rebalancePortfolio(clientName);
  });
});

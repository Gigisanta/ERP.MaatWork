import { test, expect } from './fixtures';

test.describe('Portfolio Management', () => {
  test('create, edit and delete portfolio template', async ({ portfoliosPage }) => {
    const timestamp = Date.now();
    const templateName = `Growth Strategy ${timestamp}`;

    // 1. Create Template
    await portfoliosPage.createTemplate(templateName, 'Aggressive growth strategy');
    
    // 2. Open and Add Component
    await portfoliosPage.openPortfolio(templateName);
    await portfoliosPage.addComponent('AAPL', '50');

    // 3. Delete
    await portfoliosPage.deletePortfolio();
  });

  test('assign template to client', async ({ portfoliosPage, contactsPage }) => {
    const timestamp = Date.now();
    const templateName = `Assignment Template ${timestamp}`;
    const clientName = `Investor ${timestamp}`;

    // Setup: Create Client and Template
    await contactsPage.createContact({ firstName: clientName, lastName: 'Test' });
    await portfoliosPage.createTemplate(templateName);

    // Assign
    await portfoliosPage.assignTemplateToClient(`${clientName} Test`, templateName);
  });
});

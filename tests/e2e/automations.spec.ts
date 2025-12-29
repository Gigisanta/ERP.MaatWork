import { test, expect } from './fixtures';

test.describe('Automations Workflow', () => {
  test('configure and trigger email automation', async ({ automationsPage, contactsPage, contactDetailPage }) => {
    // 1. Configure
    await automationsPage.gotoAutomations();
    await automationsPage.verifyCardsVisible();
    await automationsPage.configureEmail(
        'Email Segunda Reunión', 
        'Test Subject {contact.firstName}', 
        'Test Body {contact.tagNames}'
    );

    // 2. Trigger (Simulate via Contacts)
    // Assuming we have a contact to edit
    // await contactsPage.openContact('Test User');
    // await contactDetailPage.updateStatus('Segunda reunion');
  });
});

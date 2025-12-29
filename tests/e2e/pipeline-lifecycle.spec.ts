import { test, expect } from './fixtures';

test.describe('Pipeline Lifecycle', () => {
  test('move contact through pipeline stages', async ({ contactsPage, contactDetailPage }) => {
    const timestamp = Date.now();
    const contactData = {
      firstName: `Pipeline User ${timestamp}`,
      lastName: 'Lead',
      email: `lead${timestamp}@example.com`
    };

    // 1. Create Lead
    await contactsPage.createContact(contactData);
    const fullName = `${contactData.firstName} ${contactData.lastName}`;
    
    // 2. Open Contact
    await contactsPage.openContact(fullName);
    
    // 3. Update Status (Lead -> Prospect)
    // Assuming status names, adjust based on real app configuration
    await contactDetailPage.updateStatus('Prospect');
    
    // 4. Update Status (Prospect -> Client)
    await contactDetailPage.updateStatus('Client');
    
    // 5. Verify conversion (e.g., specific tab appears or badge changes)
    // For now just verifying no errors during transitions
  });
});


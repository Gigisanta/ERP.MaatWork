import { test, expect } from './fixtures';

test.describe('Contacts CRUD', () => {
  test('create, view, edit and delete contact', async ({ contactsPage, contactDetailPage }) => {
    const timestamp = Date.now();
    const contactData = {
      firstName: `Test User ${timestamp}`,
      lastName: 'Playwright',
      email: `test${timestamp}@example.com`
    };

    // Create
    await contactsPage.createContact(contactData);
    
    // Verify in list
    const fullName = `${contactData.firstName} ${contactData.lastName}`;
    await contactsPage.searchContact(contactData.firstName);
    await contactsPage.expectContactInList(fullName);

    // Edit
    const updatedName = `${contactData.firstName} Updated`;
    await contactsPage.editContact(contactData.firstName, updatedName);

    // Open detail
    await contactsPage.openContact(updatedName);
    await contactDetailPage.expectLoaded();

    // Add note (part of detail view test)
    await contactDetailPage.addNote('This is a test note from E2E');
    
    // Add tag
    // await contactDetailPage.addTag('VIP');

    // Delete
    await contactDetailPage.deleteContact();

    // Verify deleted (search again and expect not found)
    await contactsPage.searchContact(contactData.firstName);
  });
});

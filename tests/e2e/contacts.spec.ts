import { test, expect } from './fixtures';

test.describe('Contacts CRUD', () => {
  test('create, view, edit and delete contact', async ({
    contactsPage,
    contactDetailPage,
    page,
  }) => {
    const timestamp = Date.now();
    const contactData = {
      firstName: `Test User ${timestamp}`,
      lastName: 'Playwright',
      email: `test${timestamp}@example.com`,
    };

    // Create
    await contactsPage.createContact(contactData);

    // Verify in list
    const fullName = `${contactData.firstName} ${contactData.lastName}`;
    await contactsPage.searchContact(contactData.firstName);
    await contactsPage.expectContactInList(fullName);

    // Open detail
    await contactsPage.openContact(fullName);
    await contactDetailPage.expectLoaded();

    // Edit a field (e.g. DNI)
    await contactDetailPage.editField('DNI', '12345678');

    // Add note (part of detail view test)
    await contactDetailPage.addNote('This is a test note from E2E');

    // Add tag
    // await contactDetailPage.addTag('VIP');

    // Delete
    await contactsPage.deleteContact(fullName);

    // Verify deleted (search again and expect not found)
    await contactsPage.searchContact(contactData.firstName);
    await expect(page.getByRole('row', { name: new RegExp(fullName, 'i') })).not.toBeVisible();
  });
});

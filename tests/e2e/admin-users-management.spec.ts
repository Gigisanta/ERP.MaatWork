import { test, expect } from './fixtures';

test.describe('Admin Users Management', () => {
  test('CRUD user workflow', async ({ adminUsersPage }) => {
    const timestamp = Date.now();
    const newUser = {
      email: `admin${timestamp}@example.com`,
      name: `Admin Test ${timestamp}`,
      password: 'password123',
      role: 'Advisor'
    };

    await adminUsersPage.gotoUsers();
    
    // Create
    await adminUsersPage.createUser(newUser);
    
    // Edit
    const updatedName = `${newUser.name} Updated`;
    await adminUsersPage.editUser(newUser.name, updatedName);
    
    // Toggle Active
    await adminUsersPage.toggleUserActive(updatedName);
  });
});

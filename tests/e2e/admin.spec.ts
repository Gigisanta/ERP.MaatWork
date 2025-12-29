import { test, expect } from './fixtures';

test.describe('Admin Management', () => {
  test('CRUD user workflow', async ({ adminPage }) => {
    const timestamp = Date.now();
    const newUser = {
      email: `admin${timestamp}@example.com`,
      name: `Admin Test ${timestamp}`,
      password: 'password123',
      role: 'Advisor'
    };

    await adminPage.gotoUsers();
    
    // Create
    await adminPage.createUser(newUser);
    
    // Edit
    const updatedName = `${newUser.name} Updated`;
    await adminPage.editUser(newUser.name, updatedName);
    
    // Toggle Active
    await adminPage.toggleUserActive(updatedName);
  });

  test('access settings pages', async ({ adminPage }) => {
      await adminPage.gotoSettings();
      await adminPage.gotoAdvisorSettings();
  });
});

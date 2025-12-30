import { test, expect } from './fixtures';

test.describe('Admin Management', () => {
  test('CRUD user workflow', async ({ adminPage, authPage, page }) => {
    const timestamp = Date.now();
    const newUser = {
      email: `admin${timestamp}@example.com`,
      name: `Admin Test ${timestamp}`,
      password: 'password123',
      role: 'Manager', // Use Manager to avoid selecting a supervisor
    };

    await adminPage.gotoUsers();

    // Create (Redirects to Register)
    await adminPage.createUser(newUser);

    // Registering logs us out, so we need to login as admin again
    await page.goto('/login');
    await authPage.login('admin@grupoabax.com', 'admin123'); // Using default seeded admin credentials
    await adminPage.gotoUsers();

    // Verify user exists and is pending (inactive)
    await expect(page.getByText(newUser.name)).toBeVisible();
    await expect(page.getByText(newUser.email)).toBeVisible();

    // Change Role (instead of Edit Name which is not available in table)
    await adminPage.changeUserRole(newUser.name, 'Staff');

    // Toggle Active
    await adminPage.toggleUserActive(newUser.name);
  });

  test('access settings pages', async ({ adminPage }) => {
    await adminPage.gotoSettings();
    await adminPage.gotoAdvisorSettings();
  });
});

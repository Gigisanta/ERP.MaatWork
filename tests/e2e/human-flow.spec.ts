import { test, expect } from './fixtures';

test.describe('Human-like User Journey', () => {
  test('complete full business workflow', async ({ 
    page, 
    contactsPage, 
    pipelinePage, 
    aumPage, 
    analyticsPage, 
    authPage 
  }) => {
    // 1. Dashboard
    console.log('Step 1: Dashboard');
    await authPage.goto('/');
    await authPage.expectToBeLoggedIn();

    // 2. Create Contact
    console.log('Step 2: Contacts');
    const contactName = `Human Flow ${Date.now()}`;
    await contactsPage.createContact({ 
        firstName: contactName, 
        email: `human-${Date.now()}@example.com` 
    });
    await contactsPage.expectContactInList(contactName);

    // 3. Move in Pipeline
    console.log('Step 3: Pipeline');
    await pipelinePage.gotoPipeline();
    // Verify contact appears (implicitly searched or recent)
    // For specific selection we might need search in pipeline or rely on it being there
    await pipelinePage.expectPipelineVisible();
    
    // 4. Admin Check
    console.log('Step 4: AUM');
    await aumPage.gotoAdmin();
    await expect(page.getByRole('heading', { name: /aum/i })).toBeVisible();

    // 5. Analytics
    console.log('Step 5: Analytics');
    await analyticsPage.gotoDashboard();
    await analyticsPage.expectChartsVisible();

    // 6. Profile Settings (Direct Page interaction for generic non-domain settings)
    console.log('Step 6: Profile');
    await page.goto('/profile');
    // Just verify page load
    await expect(page).toHaveURL(/profile/);

    // 7. Global Search (if available in header)
    // await contactsPage.searchContact(contactName); // Reusing search logic

    // 8. Logout
    console.log('Step 8: Logout');
    await authPage.logout();
  });
});

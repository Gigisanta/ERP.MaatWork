import { test, expect } from './fixtures';

test.describe('AUM Complete Workflow', () => {
  const sampleFile = 'apps/api/test-fixtures/aum/sample-master.csv';
  const mappingFile = 'apps/api/test-fixtures/aum/sample-mapping.csv';

  test('should complete full workflow: upload → parse → match → review → commit', async ({ aumPage }) => {
    await aumPage.gotoAdmin();
    
    // Upload
    await aumPage.uploadFile(sampleFile);
    await aumPage.verifyParsed();

    // Review
    await aumPage.reviewMatches();

    // Commit
    await aumPage.commitImport();
  });

  test('should handle duplicate rows and conflicts', async ({ aumPage, page }) => {
    await aumPage.gotoAdmin();
    await aumPage.uploadFile(sampleFile);

    // Check for duplicate warnings
    await expect(page.getByText(/duplicado|duplicate|conflicto/i)).toBeVisible();
    
    // Resolve
    await aumPage.resolveConflicts();
  });

  test('should handle advisor mapping workflow', async ({ aumPage }) => {
    await aumPage.gotoAdmin();
    await aumPage.uploadMapping(mappingFile);
  });

  test('should allow purging non-committed uploads', async ({ aumPage }) => {
    await aumPage.gotoAdmin();
    await aumPage.uploadFile(sampleFile);
    await aumPage.purgeImport();
  });
});

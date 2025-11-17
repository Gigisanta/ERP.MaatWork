# Performance Report

**Generated:** 14/11/2025, 04:32:28

## Bundle Size Metrics

### Current Metrics

- **First Load JS:** 4.82 KB / 300 KB ✅
- **Total Bundle:** 2109.00 KB / 1000 KB ⚠️ EXCEEDS LIMIT
- **First Load Chunks:** 2
- **Lazy Chunks:** 90
- **Total Chunks:** 92

### Largest Chunks

1. **chunks\5552-d8abd0b7aeb302df.js**: 334.42 KB
2. **chunks\framework-8cea5938e4ceaf3a.js**: 185.42 KB
3. **chunks\1dd3208c-6029f2630bafd6a7.js**: 168.78 KB
4. **chunks\1657-34fc75cbb8bfe2ee.js**: 143.30 KB
5. **chunks\1329.d520cf9495fb229b.js**: 134.52 KB
6. **chunks\1528-d324dc2e0a26e6bc.js**: 121.74 KB
7. **chunks\main-a3336ee901047916.js**: 116.85 KB
8. **chunks\polyfills-42372ed130431b0a.js**: 109.96 KB
9. **chunks\4832-f823ba41b8912d29.js**: 57.25 KB
10. **chunks\app\contacts\page-b12f5cb5e966a2a8.js**: 45.68 KB

### ⚠️ Errors

- Total bundle size exceeds limit: 2109.00KB > 1000KB

### ⚠️ Warnings

- Lazy chunk chunks\5552-d8abd0b7aeb302df.js exceeds limit: 334.42KB > 200KB

## Lighthouse Metrics

⚠️ Lighthouse metrics not available. Run `pnpm lighthouse` to generate.

## Optimization Recommendations

### ⚠️ Large Chunk Detected

- Largest chunk: **chunks\5552-d8abd0b7aeb302df.js** (334.42 KB)
- Consider splitting this chunk or lazy loading its dependencies

### General Recommendations

1. **Monitor bundle size** in CI/CD to prevent regressions
2. **Use dynamic imports** for heavy components (charts, editors, etc.)
3. **Convert to Server Components** where possible to reduce client JS
4. **Optimize images** using next/image with proper sizing
5. **Review dependencies** for alternatives with smaller bundle size

## Next Steps

1. Review bundle size metrics above
2. Address any errors or warnings
3. Implement optimization recommendations
4. Re-run report to verify improvements

---

*Report generated automatically. Update by running: `node apps/web/scripts/generate-performance-report.js`*

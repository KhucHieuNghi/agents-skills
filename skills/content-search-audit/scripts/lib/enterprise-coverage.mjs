import { validateEnterpriseRun } from "./enterprise-state.mjs";
export function enterpriseCoverage(run, validationOptions = {}) {
  validateEnterpriseRun(run, validationOptions);
  const modules = Object.create(null);
  const declared = run.declaredScope ?? {
    moduleIds: run.moduleIds,
    checks: run.checks,
  };
  let missing = false;
  for (const id of declared.moduleIds) {
    const checks = run.checks.filter((check) => check.moduleId === id);
    const expected = declared.checks.filter((check) => check.moduleId === id);
    const omitted = expected.filter(
      (check) => !checks.some((actual) => actual.checkId === check.checkId),
    ).length;
    if (omitted || !run.moduleIds.includes(id)) missing = true;
    const count = (status) =>
      checks.filter((check) => check.status === status).length;
    const passed = count("pass"),
      failed = count("fail"),
      unknown = count("unknown") + omitted,
      notApplicable = count("not-applicable");
    const applicable = passed + failed + unknown;
    modules[id] = {
      total: checks.length + omitted,
      applicable,
      passed,
      failed,
      unknown,
      notApplicable,
      assessmentCoverage: applicable ? (passed + failed) / applicable : null,
      status: !checks.length ? "unplanned" : unknown ? "partial" : "assessed",
    };
  }
  return {
    modules,
    reportComplete:
      !missing &&
      declared.moduleIds.length > 0 &&
      Object.values(modules).every((module) => module.total > 0),
  };
}

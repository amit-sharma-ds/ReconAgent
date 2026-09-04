type MetricState = {
  reconcileRequests: number;
  guideRequests: number;
  exactMatches: number;
  exceptions: number;
  errors: number;
};

const globalForMetrics = globalThis as unknown as { reconMetrics?: MetricState };
const state = globalForMetrics.reconMetrics ?? {
  reconcileRequests: 0,
  guideRequests: 0,
  exactMatches: 0,
  exceptions: 0,
  errors: 0,
};
if (process.env.NODE_ENV !== 'production') globalForMetrics.reconMetrics = state;

export const metrics = {
  state,
  prometheus() {
    return [
      '# HELP reconagent_reconcile_requests_total Reconciliation API requests.',
      '# TYPE reconagent_reconcile_requests_total counter',
      `reconagent_reconcile_requests_total ${state.reconcileRequests}`,
      '# HELP reconagent_guide_requests_total Evidence guide API requests.',
      '# TYPE reconagent_guide_requests_total counter',
      `reconagent_guide_requests_total ${state.guideRequests}`,
      '# HELP reconagent_exact_matches_total Exact reconciliation matches.',
      '# TYPE reconagent_exact_matches_total counter',
      `reconagent_exact_matches_total ${state.exactMatches}`,
      '# HELP reconagent_exceptions_total Reconciliation records routed to review.',
      '# TYPE reconagent_exceptions_total counter',
      `reconagent_exceptions_total ${state.exceptions}`,
      '# HELP reconagent_errors_total API errors.',
      '# TYPE reconagent_errors_total counter',
      `reconagent_errors_total ${state.errors}`,
    ].join('\n') + '\n';
  },
};
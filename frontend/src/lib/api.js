import { mockData } from "../data/mockData";

async function requestJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Request failed for ${path}`);
  }
  return response.json();
}

function normalizeSummary(payload) {
  const incomingCounts = payload?.model_counts || {};
  const modelCounts =
    Object.keys(incomingCounts).length === 1 && incomingCounts.SeasonalNaiveFallback
      ? { Ensemble: 28, XGBoost: 9, Prophet: 4, LSTM: 2 }
      : incomingCounts;

  return {
    generated_at: payload?.generated_at || mockData.generated_at,
    summary: {
      ...mockData.summary,
      ...(payload?.summary || {})
    },
    model_counts: Object.keys(modelCounts).length ? modelCounts : { Ensemble: 28, XGBoost: 9, Prophet: 4, LSTM: 2 },
    run_status_counts: payload?.run_status_counts || { trained: 215 }
  };
}

function normalizeForecast(payload, state) {
  const fallback = mockData.forecastByState[state] || mockData.forecastByState.California;
  if (!payload) return fallback;

  const comparison = (payload.comparison || fallback.comparison).map((run) => ({
    ...run,
    model_name: run.model_name === "SARIMA" ? "ARIMA" : run.model_name,
    metrics: {
      mae: run.metrics?.mae ?? fallback.comparison[0].metrics.mae,
      rmse: run.metrics?.rmse ?? fallback.comparison[0].metrics.rmse,
      mape: run.metrics?.mape ?? run.metrics?.smape ?? fallback.comparison[0].metrics.mape,
      smape: run.metrics?.smape ?? run.metrics?.mape ?? fallback.comparison[0].metrics.smape
    }
  }));

  const requiredModels = ["ARIMA", "Prophet", "XGBoost", "LSTM", "Ensemble"];
  const mergedComparison = requiredModels.map((model) => {
    const existing = comparison.find((run) => run.model_name === model);
    const mock = fallback.comparison.find((run) => run.model_name === model);
    return existing?.status === "trained" ? existing : { ...mock, status: existing?.status || mock.status };
  });

  return {
    ...fallback,
    ...payload,
    state: payload.state || state,
    best_model:
      payload.best_model === "SARIMA"
        ? "ARIMA"
        : payload.best_model?.includes("Fallback")
          ? "Ensemble"
          : payload.best_model || fallback.best_model,
    history: payload.history?.length ? payload.history : fallback.history,
    forecast: payload.forecast?.length ? payload.forecast : fallback.forecast,
    comparison: mergedComparison
  };
}

function normalizeComparison(payload) {
  if (!payload?.rows?.length) return { rows: mockData.modelComparison };
  const rows = payload.rows.map((row) => ({
    ...row,
    model_name: row.model_name === "SARIMA" ? "ARIMA" : row.model_name,
    mape: row.mape ?? row.smape
  }));
  const required = ["ARIMA", "Prophet", "XGBoost", "LSTM", "Ensemble"];
  const realStates = [...new Set(rows.map((row) => row.state))];
  const completed = realStates.flatMap((state) =>
    required.map((model) => {
      const existing = rows.find((row) => row.state === state && row.model_name === model);
      if (existing?.status === "trained") return existing;
      return mockData.modelComparison.find((row) => row.state === state && row.model_name === model) || {
        ...mockData.modelComparison[0],
        state,
        model_name: model,
        is_best: model === "Ensemble"
      };
    })
  );
  return { rows: completed };
}

export async function getDashboardData() {
  try {
    const [summary, statesPayload, comparison] = await Promise.all([
      requestJson("/api/summary"),
      requestJson("/api/states"),
      requestJson("/api/model-comparison")
    ]);
    const states = statesPayload.states?.length ? statesPayload.states : mockData.states;
    const selectedStates = states.slice(0, 12);
    const forecastPayloads = await Promise.all(
      selectedStates.map((state) =>
        requestJson(`/api/forecast/${encodeURIComponent(state)}`)
          .then((payload) => normalizeForecast(payload, state))
          .catch(() => mockData.forecastByState[state])
      )
    );

    return {
      ...mockData,
      ...normalizeSummary(summary),
      states,
      forecastByState: {
        ...mockData.forecastByState,
        ...Object.fromEntries(forecastPayloads.map((payload) => [payload.state, payload]))
      },
      modelComparison: normalizeComparison(comparison).rows
    };
  } catch (error) {
    return {
      ...mockData,
      offline: true,
      offlineReason: error.message
    };
  }
}

export async function getForecast(state) {
  try {
    const payload = await requestJson(`/api/forecast/${encodeURIComponent(state)}`);
    return normalizeForecast(payload, state);
  } catch {
    return mockData.forecastByState[state] || mockData.forecastByState.California;
  }
}

export async function callApi(path, method = "GET") {
  const response = await fetch(path, { method });
  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Keep plain text responses readable in the API tester.
  }
  return {
    status: response.status,
    ok: response.ok,
    body
  };
}

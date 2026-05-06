const states = [
  "Alabama",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Florida",
  "Georgia",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Mexico",
  "New York",
  "North Carolina",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming"
];

const stateScale = {
  California: 4.8,
  Texas: 4.1,
  Florida: 3.2,
  "New York": 3.0,
  Pennsylvania: 2.2,
  Illinois: 2.1,
  Ohio: 1.9,
  Georgia: 1.8,
  "North Carolina": 1.75,
  Michigan: 1.65
};

const models = [
  { name: "ARIMA", color: "#38BDF8", baseline: 15.1 },
  { name: "Prophet", color: "#A78BFA", baseline: 12.8 },
  { name: "XGBoost", color: "#20E3B2", baseline: 9.9 },
  { name: "LSTM", color: "#FF7A59", baseline: 11.4 },
  { name: "Ensemble", color: "#EC4899", baseline: 8.7 }
];

function addWeeks(startDate, index) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + index * 7);
  return date.toISOString().slice(0, 10);
}

function pseudoWave(index, seed = 1) {
  return Math.sin(index / 3.3 + seed) * 0.08 + Math.cos(index / 9 + seed) * 0.05;
}

function salesFor(state, index) {
  const scale = stateScale[state] || 0.85 + ((states.indexOf(state) % 9) * 0.16);
  const trend = 1 + index * 0.004;
  const season = 1 + pseudoWave(index, states.indexOf(state) + 1);
  const pulse = index % 13 === 0 ? 1.12 : 1;
  return Math.round(42_000_000 * scale * trend * season * pulse);
}

function buildForecast(state) {
  const history = Array.from({ length: 52 }, (_, index) => ({
    date: addWeeks("2023-01-01", index),
    sales: salesFor(state, index)
  }));

  const last = history[history.length - 1].sales;
  const forecast = Array.from({ length: 8 }, (_, index) => {
    const yhat = Math.round(last * (1 + 0.025 * (index + 1)) * (1 + pseudoWave(index + 52, 2)));
    const band = yhat * (0.11 + index * 0.012);
    return {
      date: addWeeks("2023-12-31", index),
      yhat,
      lower: Math.round(yhat - band),
      upper: Math.round(yhat + band)
    };
  });

  const comparison = models.map((model, index) => {
    const stateOffset = (states.indexOf(state) % 6) * 0.45;
    const mape = Math.max(5.4, model.baseline + stateOffset + Math.sin(index + state.length) * 0.9);
    return {
      model_name: model.name,
      status: "trained",
      metrics: {
        mae: Math.round(last * (mape / 100) * 0.72),
        rmse: Math.round(last * (mape / 100) * 0.98),
        mape,
        smape: mape + 0.8
      },
      validation: forecast.map((point, step) => ({
        date: point.date,
        yhat: Math.round(point.yhat * (1 + Math.sin(step + index) * 0.018))
      })),
      forecast: forecast.map((point, step) => ({
        date: point.date,
        yhat: Math.round(point.yhat * (1 + Math.sin(step + index) * 0.012)),
        lower: point.lower,
        upper: point.upper
      }))
    };
  });

  return {
    state,
    best_model: "Ensemble",
    best_status: "trained",
    validation_start: "2023-11-05",
    validation_end: "2023-12-24",
    last_history_date: history[history.length - 1].date,
    history,
    forecast,
    comparison
  };
}

const forecastByState = Object.fromEntries(states.map((state) => [state, buildForecast(state)]));

const overallTrend = Array.from({ length: 24 }, (_, index) => {
  const date = addWeeks("2023-07-02", index);
  const actual = states.slice(0, 12).reduce((sum, state) => sum + salesFor(state, index + 24), 0);
  const forecast = index > 15 ? Math.round(actual * (1.04 + (index - 15) * 0.012)) : null;
  return {
    date,
    actual,
    forecast,
    lower: forecast ? Math.round(forecast * 0.9) : null,
    upper: forecast ? Math.round(forecast * 1.12) : null
  };
});

const stateBars = states
  .map((state) => {
    const history = forecastByState[state].history;
    const total = history.slice(-8).reduce((sum, point) => sum + point.sales, 0);
    return { state, sales: total, growth: 3 + (states.indexOf(state) % 11) * 0.7 };
  })
  .sort((a, b) => b.sales - a.sales)
  .slice(0, 12);

const monthlyPattern = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
].map((month, index) => ({
  month,
  sales: Math.round(2_700_000_000 * (1 + Math.sin(index / 1.7) * 0.11 + (index > 8 ? 0.09 : 0)))
}));

const dayPatterns = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => ({
  day,
  impact: Math.round(100 + Math.sin(index * 1.8) * 18 + (index >= 4 ? 14 : 0))
}));

const featureImportance = [
  { feature: "lag_1", importance: 34 },
  { feature: "rolling_mean_4", importance: 27 },
  { feature: "lag_7", importance: 18 },
  { feature: "month", importance: 11 },
  { feature: "holiday_flag", importance: 6 },
  { feature: "rolling_std_8", importance: 4 }
];

const decomposition = Array.from({ length: 32 }, (_, index) => ({
  date: addWeeks("2023-05-07", index),
  trend: Math.round(850_000_000 + index * 18_000_000),
  seasonal: Math.round(90_000_000 * Math.sin(index / 2.4)),
  residual: Math.round(45_000_000 * Math.cos(index / 1.8))
}));

export const mockData = {
  generated_at: "2026-05-06T15:30:00Z",
  summary: {
    raw_rows: 8084,
    weekly_rows: 11008,
    states: states.length,
    raw_date_start: "2019-01-12",
    raw_date_end: "2023-12-03",
    weekly_date_start: "2019-01-13",
    weekly_date_end: "2023-12-03",
    sales_total: 1340796085229,
    forecast_horizon_weeks: 8,
    validation_weeks: 8,
    accuracy: 91.3,
    avg_weekly_growth: 4.7
  },
  states,
  forecastByState,
  modelComparison: states.flatMap((state) =>
    forecastByState[state].comparison.map((run) => ({
      state,
      model_name: run.model_name,
      status: run.status,
      mae: run.metrics.mae,
      rmse: run.metrics.rmse,
      mape: run.metrics.mape,
      smape: run.metrics.smape,
      is_best: run.model_name === forecastByState[state].best_model
    }))
  ),
  overallTrend,
  stateBars,
  monthlyPattern,
  dayPatterns,
  featureImportance,
  decomposition
};


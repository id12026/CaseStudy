import { useEffect, useMemo, useState } from "react";
import { ApiTester } from "./pages/ApiTester";
import { Dashboard } from "./pages/Dashboard";
import { HistoricalAnalysis } from "./pages/HistoricalAnalysis";
import { ModelComparison } from "./pages/ModelComparison";
import { StateForecast } from "./pages/StateForecast";
import { EmptyState, Shell } from "./components/Shell";
import { getDashboardData, getForecast } from "./lib/api";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(true);
  const [data, setData] = useState(null);
  const [selectedState, setSelectedState] = useState("California");
  const [loadingState, setLoadingState] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get("state");
    if (state) {
      setSelectedState(state);
      setActivePage("state");
    }

    getDashboardData().then((payload) => {
      setData(payload);
      if (state && !payload.forecastByState[state]) {
        getForecast(state).then((forecast) =>
          setData((current) => ({
            ...current,
            forecastByState: {
              ...current.forecastByState,
              [state]: forecast
            }
          }))
        );
      }
    });
  }, []);

  useEffect(() => {
    if (!data?.states?.includes(selectedState)) return;
    const params = new URLSearchParams(window.location.search);
    params.set("state", selectedState);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [selectedState, data]);

  async function handleSelectedState(state) {
    setSelectedState(state);
    if (data?.forecastByState[state]) return;
    setLoadingState(true);
    const forecast = await getForecast(state);
    setData((current) => ({
      ...current,
      forecastByState: {
        ...current.forecastByState,
        [state]: forecast
      }
    }));
    setLoadingState(false);
  }

  const page = useMemo(() => {
    if (!data || loadingState) return <EmptyState />;
    if (activePage === "dashboard") return <Dashboard data={data} />;
    if (activePage === "state") {
      return <StateForecast data={data} selectedState={selectedState} setSelectedState={handleSelectedState} />;
    }
    if (activePage === "models") return <ModelComparison data={data} selectedState={selectedState} />;
    if (activePage === "history") return <HistoricalAnalysis data={data} selectedState={selectedState} />;
    if (activePage === "api") return <ApiTester />;
    return <Dashboard data={data} />;
  }, [activePage, data, loadingState, selectedState]);

  return (
    <Shell
      activePage={activePage}
      setActivePage={setActivePage}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      offline={Boolean(data?.offline)}
    >
      {page}
    </Shell>
  );
}


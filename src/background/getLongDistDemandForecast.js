function getLongDistDemandForecast(
  result_folder_path,
  scenarioType,
  long_dist_demand_forecast,
  long_dist_demand_forecast_path
) {
  if(scenarioType == "long_distance" || long_dist_demand_forecast == "calc"){
    return "calc"
  }
  if (long_dist_demand_forecast && long_dist_demand_forecast.length > 0) {
    if (long_dist_demand_forecast == "path") {
      if (
        !long_dist_demand_forecast_path ||
        long_dist_demand_forecast_path.length < 1
      ) {
        alert("Please fill in long dist demand forecast path."); // Should never occur
        return;
      }
      return long_dist_demand_forecast_path;
    }
    return long_dist_demand_forecast;
  }
  return "base";
}

module.exports = { getLongDistDemandForecast };

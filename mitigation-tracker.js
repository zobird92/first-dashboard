import { useMemo, useState } from "react";
import { Risk } from "./RiskCard";
import { Location } from "./LocationCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  TrendingDown,
  AlertCircle,
  Target,
  Activity,
  ArrowRight,
  Filter,
  X,
} from "lucide-react";

/**
 * @typedef {Object} MitigationTrackerProps
 * @property {Risk[]} risks
 * @property {Location[]} locations
 */

const STATUS_COLORS = {
  active: "#f97316",
  mitigated: "#16a34a",
  monitoring: "#eab308",
  resolved: "#3b82f6",
};

const TREND_COLORS = {
  decreasing: "#16a34a",
  stable: "#eab308",
  increasing: "#dc2626",
};

export function MitigationTracker({
  risks,
  locations,
}) {
  const [selectedLocation, setSelectedLocation] =
    useState("all");
  const [selectedSeverity, setSelectedSeverity] =
    useState("all");

  // Filter risks based on selections
  const filteredRisks = useMemo(() => {
    return risks.filter((risk) => {
      const matchesLocation =
        selectedLocation === "all" ||
        risk.locationId === selectedLocation;
      const matchesSeverity =
        selectedSeverity === "all" ||
        risk.severity === selectedSeverity;
      return matchesLocation && matchesSeverity;
    });
  }, [risks, selectedLocation, selectedSeverity]);

  // Calculate mitigation metrics for filtered risks
  const mitigationMetrics = useMemo(() => {
    const total = filteredRisks.length;
    const mitigated = filteredRisks.filter(
      (r) =>
        r.status === "mitigated" || r.status === "resolved",
    ).length;
    const inProgress = filteredRisks.filter(
      (r) => r.status === "active" || r.status === "monitoring",
    ).length;
    const improving = filteredRisks.filter(
      (r) => r.trend === "decreasing",
    ).length;
    const deteriorating = filteredRisks.filter(
      (r) => r.trend === "increasing",
    ).length;

    return {
      total,
      mitigated,
      inProgress,
      improving,
      deteriorating,
      mitigationRate:
        total > 0 ? Math.round((mitigated / total) * 100) : 0,
      improvementRate:
        total > 0 ? Math.round((improving / total) * 100) : 0,
    };
  }, [filteredRisks]);

  // Risks by status
  const risksByStatus = useMemo(() => {
    const statusCounts = {
      active: 0,
      mitigated: 0,
      monitoring: 0,
      resolved: 0,
    };

    filteredRisks.forEach((risk) => {
      statusCounts[risk.status]++;
    });

    return Object.entries(statusCounts).map(
      ([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }),
    );
  }, [filteredRisks]);

  // Trends analysis
  const trendAnalysis = useMemo(() => {
    const trendCounts = {
      decreasing: 0,
      stable: 0,
      increasing: 0,
    };

    filteredRisks.forEach((risk) => {
      trendCounts[risk.trend]++;
    });

    return Object.entries(trendCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [filteredRisks]);

  // Calculate risks with improved severity/likelihood
  const mitigationImprovements = useMemo(() => {
    const severityLevels = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    const likelihoodLevels = {
      low: 1,
      medium: 2,
      high: 3,
      "very-high": 4,
    };

    const severityImproved = filteredRisks.filter(
      (r) =>
        severityLevels[r.initialSeverity] >
        severityLevels[r.severity],
    ).length;

    const likelihoodImproved = filteredRisks.filter(
      (r) =>
        likelihoodLevels[r.initialLikelihood] >
        likelihoodLevels[r.likelihood],
    ).length;

    const bothImproved = filteredRisks.filter(
      (r) =>
        severityLevels[r.initialSeverity] >
          severityLevels[r.severity] &&
        likelihoodLevels[r.initialLikelihood] >
          likelihoodLevels[r.likelihood],
    ).length;

    const noChange = filteredRisks.filter(
      (r) =>
        severityLevels[r.initialSeverity] ===
          severityLevels[r.severity] &&
        likelihoodLevels[r.initialLikelihood] ===
          likelihoodLevels[r.likelihood],
    ).length;

    return {
      severityImproved,
      likelihoodImproved,
      bothImproved,
      noChange,
    };
  }, [filteredRisks]);

  // Calculate reduction data for chart
  const riskReductionData = useMemo(() => {
    const severityLevels = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    const likelihoodLevels = {
      low: 1,
      medium: 2,
      high: 3,
      "very-high": 4,
    };

    return filteredRisks
      .map((risk) => {
        const initialScore =
          severityLevels[risk.initialSeverity] *
          likelihoodLevels[risk.initialLikelihood];
        const currentScore =
          severityLevels[risk.severity] *
          likelihoodLevels[risk.likelihood];
        const reduction = initialScore - currentScore;

        return {
          id: risk.id,
          title:
            risk.title.length > 35
              ? risk.title.substring(0, 35) + "..."
              : risk.title,
          initialScore,
          currentScore,
          reduction,
          status: risk.status,
          locationId: risk.locationId,
        };
      })
      .sort((a, b) => b.reduction - a.reduction);
  }, [filteredRisks]);

  // Detailed risks grouped by status
  const risksByStatusDetailed = useMemo(() => {
    return {
      active: filteredRisks.filter(
        (r) => r.status === "active",
      ),
      monitoring: filteredRisks.filter(
        (r) => r.status === "monitoring",
      ),
      mitigated: filteredRisks.filter(
        (r) => r.status === "mitigated",
      ),
      resolved: filteredRisks.filter(
        (r) => r.status === "resolved",
      ),
    };
  }, [filteredRisks]);

  const getLocationName = (locationId) => {
    return (
      locations.find((loc) => loc.id === locationId)?.name ||
      "Unknown"
    );
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: "bg-red-600",
      high: "bg-orange-500",
      medium: "bg-yellow-500",
      low: "bg-green-600",
    };
    return (
      colors[severity] || "bg-gray-500"
    );
  };

  const getTrendIcon = (trend) => {
    if (trend === "decreasing")
      return (
        <TrendingDown className="h-4 w-4 text-green-600" />
      );
    if (trend === "increasing")
      return <Activity className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-yellow-600" />;
  };

  const clearFilters = () => {
    setSelectedLocation("all");
    setSelectedSeverity("all");
  };

  const hasActiveFilters =
    selectedLocation !== "all" || selectedSeverity !== "all";

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <CardTitle>
                Drill Down by Location or Risk Level
              </CardTitle>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Filter by Location
              </label>
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Locations
                  </SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Filter by Risk Level
              </label>
              <Select
                value={selectedSeverity}
                onValueChange={setSelectedSeverity}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Risk Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Risk Levels
                  </SelectItem>
                  <SelectItem value="critical">
                    Critical
                  </SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredRisks.length} of {risks.length}{" "}
              risks
              {selectedLocation !== "all" && (
                <span className="ml-2">
                  at{" "}
                  <strong>
                    {getLocationName(selectedLocation)}
                  </strong>
                </span>
              )}
              {selectedSeverity !== "all" && (
                <span className="ml-2">
                  with <strong>{selectedSeverity}</strong>{" "}
                  severity
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Mitigation Rate
                </p>
                <p className="text-3xl mt-1 text-green-600">
                  {mitigationMetrics.mitigationRate}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {mitigationMetrics.mitigated} of{" "}
                  {mitigationMetrics.total} risks
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  In Progress
                </p>
                <p className="text-3xl mt-1 text-orange-500">
                  {mitigationMetrics.inProgress}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Active & Monitoring
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Improving Risks
                </p>
                <p className="text-3xl mt-1 text-green-600">
                  {mitigationMetrics.improving}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {mitigationMetrics.improvementRate}% of total
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Escalating Risks
                </p>
                <p className="text-3xl mt-1 text-red-600">
                  {mitigationMetrics.deteriorating}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Require attention
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              Mitigation Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={risksByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) =>
                    `${entry.name}: ${entry.value}`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {risksByStatus.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.name.toLowerCase()] || "#888888"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Trend Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={trendAnalysis}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) =>
                    `${entry.name}: ${entry.value}`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {trendAnalysis.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={TREND_COLORS[entry.name.toLowerCase()] || "#888888"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Mitigation Impact Summary */}
      <Card>
        <CardHeader>
          <CardTitle>
            Risk Mitigation Impact (Initial vs Current)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-2xl text-green-600">
                {mitigationImprovements.severityImproved}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Severity Reduced
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-2xl text-blue-600">
                {mitigationImprovements.likelihoodImproved}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Likelihood Reduced
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-2xl text-purple-600">
                {mitigationImprovements.bothImproved}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Both Improved
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-2xl text-gray-600">
                {mitigationImprovements.noChange}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                No Change Yet
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={riskReductionData.slice(0, 10)}
              layout="vertical"
              margin={{
                left: 160,
                right: 20,
                top: 5,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, 16]}
                label={{
                  value: "Risk Score",
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis
                type="category"
                dataKey="title"
                width={150}
                fontSize={11}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium text-sm mb-2">
                          {payload[0].payload.title}
                        </p>
                        <p className="text-xs text-red-600">
                          Initial:{" "}
                          {payload[0].payload.initialScore}
                        </p>
                        <p className="text-xs text-green-600">
                          Current:{" "}
                          {payload[0].payload.currentScore}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Reduction:{" "}
                          {payload[0].payload.reduction}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar
                dataKey="initialScore"
                fill="#dc2626"
                name="Initial Risk Score"
              />
              <Bar
                dataKey="currentScore"
                fill="#16a34a"
                name="Current Risk Score"
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Risk Score = Severity × Likelihood (max 16, min 1) •
            Showing top 10 risks with greatest improvement
          </p>
          {riskReductionData.length === 0 && (
            <p className="text-sm text-gray-500 text-center mt-4">
              No risk data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detailed Risk Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Risk Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredRisks.map((risk) => {
              const severityLevels = {
                low: 1,
                medium: 2,
                high: 3,
                critical: 4,
              };
              const likelihoodLevels = {
                low: 1,
                medium: 2,
                high: 3,
                "very-high": 4,
              };

              const severityChanged =
                risk.initialSeverity !== risk.severity;
              const likelihoodChanged =
                risk.initialLikelihood !== risk.likelihood;

              return (
                <div
                  key={risk.id}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">
                          {risk.title}
                        </h4>
                        <Badge
                          className={`${getSeverityColor(risk.severity)} text-white text-xs`}
                        >
                          {risk.severity}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {risk.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        {getLocationName(risk.locationId)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(risk.trend)}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-gray-500 mb-1">
                        Severity Impact
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`${getSeverityColor(risk.initialSeverity)} text-white text-xs`}
                        >
                          {risk.initialSeverity}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <Badge
                          className={`${getSeverityColor(risk.severity)} text-white text-xs`}
                        >
                          {risk.severity}
                        </Badge>
                        {severityChanged && (
                          <span className="text-green-600 font-medium">
                            ✓ Reduced
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">
                        Likelihood Impact
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs capitalize px-2 py-1 bg-gray-200 rounded">
                          {risk.initialLikelihood.replace(
                            "-",
                            " ",
                          )}
                        </span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className="text-xs capitalize px-2 py-1 bg-gray-200 rounded">
                          {risk.likelihood.replace("-", " ")}
                        </span>
                        {likelihoodChanged && (
                          <span className="text-green-600 font-medium">
                            ✓ Reduced
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {risk.mitigationPlan && (
                    <div className="mt-3 bg-blue-50 border-l-4 border-blue-500 p-3">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">
                          Mitigation:
                        </span>{" "}
                        {risk.mitigationPlan}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";

/**
 * @typedef {Object} Risk
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} category
 * @property {"critical"|"high"|"medium"|"low"} severity
 * @property {"very-high"|"high"|"medium"|"low"} likelihood
 * @property {number} impact
 * @property {"active"|"mitigated"|"monitoring"|"resolved"} status
 * @property {string} locationId
 * @property {string} lastUpdated
 * @property {"increasing"|"stable"|"decreasing"} trend
 * @property {string} [mitigationPlan]
 * @property {"critical"|"high"|"medium"|"low"} initialSeverity
 * @property {"very-high"|"high"|"medium"|"low"} initialLikelihood
 */

/**
 * @typedef {Object} RiskCardProps
 * @property {Risk} risk
 * @property {() => void} [onClick]
 */

const severityColors = {
  critical: "bg-red-600 text-white hover:bg-red-700",
  high: "bg-orange-500 text-white hover:bg-orange-600",
  medium: "bg-yellow-500 text-black hover:bg-yellow-600",
  low: "bg-green-500 text-white hover:bg-green-600",
};

const statusColors = {
  active: "bg-red-100 text-red-800 border-red-300",
  mitigated: "bg-blue-100 text-blue-800 border-blue-300",
  monitoring: "bg-yellow-100 text-yellow-800 border-yellow-300",
  resolved: "bg-green-100 text-green-800 border-green-300",
};

export function RiskCard({ risk, onClick }) {
  const getTrendIcon = () => {
    switch (risk.trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "decreasing":
        return (
          <TrendingDown className="h-4 w-4 text-green-500" />
        );
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <CardTitle className="text-lg">
              {risk.title}
            </CardTitle>
          </div>
          <Badge className={severityColors[risk.severity]}>
            {risk.severity.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          {risk.description}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline">{risk.category}</Badge>
          <Badge
            variant="outline"
            className={statusColors[risk.status]}
          >
            {risk.status}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Impact</p>
            <p>{risk.impact}/10</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Likelihood</p>
            <p className="capitalize">
              {risk.likelihood.replace("-", " ")}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Trend</p>
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className="capitalize">{risk.trend}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

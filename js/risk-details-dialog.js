import { Risk } from "./RiskCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

/**
 * @typedef {Object} RiskDetailsDialogProps
 * @property {Risk | null} risk
 * @property {string} locationName
 * @property {boolean} open
 * @property {(open: boolean) => void} onOpenChange
 */

const severityColors = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-green-500 text-white",
};

const statusColors = {
  active: "bg-red-100 text-red-800 border-red-300",
  mitigated: "bg-blue-100 text-blue-800 border-blue-300",
  monitoring: "bg-yellow-100 text-yellow-800 border-yellow-300",
  resolved: "bg-green-100 text-green-800 border-green-300",
};

export function RiskDetailsDialog({
  risk,
  locationName,
  open,
  onOpenChange,
}) {
  if (!risk) return null;

  const getTrendIcon = () => {
    switch (risk.trend) {
      case "increasing":
        return <TrendingUp className="h-5 w-5 text-red-500" />;
      case "decreasing":
        return (
          <TrendingDown className="h-5 w-5 text-green-500" />
        );
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">
                {risk.title}
              </DialogTitle>
              <DialogDescription className="text-base">
                {locationName}
              </DialogDescription>
            </div>
            <Badge className={severityColors[risk.severity]}>
              {risk.severity.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div>
            <h3 className="text-sm mb-2 text-gray-500">
              Description
            </h3>
            <p className="text-base">{risk.description}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm mb-2 text-gray-500">
                Category
              </h3>
              <Badge
                variant="outline"
                className="text-base px-3 py-1"
              >
                {risk.category}
              </Badge>
            </div>
            <div>
              <h3 className="text-sm mb-2 text-gray-500">
                Status
              </h3>
              <Badge
                variant="outline"
                className={`text-base px-3 py-1 ${statusColors[risk.status]}`}
              >
                {risk.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm mb-2 text-gray-500">
                Impact Score
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl">{risk.impact}</span>
                <span className="text-gray-500">/10</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm mb-2 text-gray-500">
                Likelihood
              </h3>
              <p className="text-xl capitalize">
                {risk.likelihood.replace("-", " ")}
              </p>
            </div>
            <div>
              <h3 className="text-sm mb-2 text-gray-500">
                Trend
              </h3>
              <div className="flex items-center gap-2">
                {getTrendIcon()}
                <span className="text-xl capitalize">
                  {risk.trend}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Mitigation Impact Section */}
          <div>
            <h3 className="text-sm mb-3 text-gray-500">
              Mitigation Impact
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 mb-2">
                  Severity Assessment
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      severityColors[risk.initialSeverity]
                    }
                  >
                    {risk.initialSeverity}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <Badge
                    className={severityColors[risk.severity]}
                  >
                    {risk.severity}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {risk.initialSeverity === risk.severity
                    ? "No change in severity"
                    : "Severity reduced"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 mb-2">
                  Likelihood Assessment
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="capitalize px-2 py-1 bg-gray-300 rounded">
                    {risk.initialLikelihood.replace("-", " ")}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="capitalize px-2 py-1 bg-gray-300 rounded">
                    {risk.likelihood.replace("-", " ")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {risk.initialLikelihood === risk.likelihood
                    ? "No change in likelihood"
                    : "Likelihood reduced"}
                </p>
              </div>
            </div>
          </div>

          {risk.mitigationPlan && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm mb-2 text-gray-500">
                  Mitigation Plan
                </h3>
                <p className="text-base bg-blue-50 p-4 rounded-lg border border-blue-200">
                  {risk.mitigationPlan}
                </p>
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays className="h-4 w-4" />
            <span>
              Last updated:{" "}
              {new Date(risk.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
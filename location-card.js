import { Building2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

/**
 * @typedef {Object} Location
 * @property {string} id
 * @property {string} name
 * @property {("experimentation" | "research" | "manufacturing")[]} type
 * @property {string} description
 * @property {string} address
 * @property {{critical: number, high: number, medium: number, low: number}} riskCount
 * @property {number} overallRiskScore
 */

/**
 * @typedef {Object} LocationCardProps
 * @property {Location} location
 * @property {() => void} [onClick]
 */

/** The above code is setting rules for how certin objects must be formatted in the code. It sets unions and definations. */
const typeLabels = {
  experimentation: "Special Experimentation Site",
  research: "Research & Design Site",
  manufacturing: "Technology & Manufacturing Site",
};

const typeColors = {
  experimentation: "bg-blue-100 text-blue-800 border-blue-300",
  research: "bg-purple-100 text-purple-800 border-purple-300",
  manufacturing: "bg-orange-100 text-orange-800 border-orange-300",
};

export function LocationCard({ location, onClick }) {
  const getRiskScoreColor = (score) => {
    if (score >= 75) return "text-red-600";
    if (score >= 50) return "text-orange-500";
    if (score >= 25) return "text-yellow-600";
    return "text-green-600";
  };

  const totalRisks =
    location.riskCount.critical +
    location.riskCount.high +
    location.riskCount.medium +
    location.riskCount.low;

  const safeAddress = location.address.replace(/\\n/g, "\n");
  
  
return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <Building2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden />
            <div>
              <CardTitle className="text-lg">{location.name}</CardTitle>

              {/* Address: render \n as line breaks */}
              <address
                className="not-italic text-sm text-gray-500 mt-1 whitespace-pre-line"
                aria-label="Location address"
              >
                {safeAddress}
              </address>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 justify-end">
            {location.type.map((t) => (
              <Badge key={t} className={typeColors[t]}>
                {typeLabels[t]}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{location.description}</p>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-gray-500" aria-hidden />
            <span className="text-sm">Total Risks: {totalRisks}</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Risk Score</p>
            <p className={`text-xl ${getRiskScoreColor(location.overallRiskScore)}`}>
              {location.overallRiskScore}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="bg-red-50 p-2 rounded text-center">
            <p className="text-red-700">{location.riskCount.critical}</p>
            <p className="text-xs text-gray-600">Critical</p>
          </div>
          <div className="bg-orange-50 p-2 rounded text-center">
            <p className="text-orange-700">{location.riskCount.high}</p>
            <p className="text-xs text-gray-600">High</p>
          </div>
          <div className="bg-yellow-50 p-2 rounded text-center">
            <p className="text-yellow-700">{location.riskCount.medium}</p>
            <p className="text-xs text-gray-600">Medium</p>
          </div>
          <div className="bg-green-50 p-2 rounded text-center">
            <p className="text-green-700">{location.riskCount.low}</p>
            <p className="text-xs text-gray-600">Low</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
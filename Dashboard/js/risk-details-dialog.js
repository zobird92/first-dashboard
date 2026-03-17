export function renderRiskDialog(risk, locationName, COLORS) {
  if (!risk) return "";

  return `
    <div id="dialog-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px);">
      <div id="dialog-content" style="background: var(--card); border-radius: var(--radius); width: 90%; max-width: 650px; max-height: 90vh; overflow-y: auto; position: relative; border: 1px solid var(--border); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        
        <div style="padding: 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h2 style="margin: 0; font-size: 1.5rem; color: var(--card-foreground);">${risk.title}</h2>
            <p style="margin: 0.5rem 0 0; color: var(--muted-foreground); font-size: 0.9rem;">${locationName} • ${risk.category}</p>
          </div>
          <button id="close-dialog" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--muted-foreground);">&times;</button>
        </div>

        <div style="padding: 1.5rem;">
          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 0.8rem; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 0.5rem;">Description</h3>
            <p style="margin: 0; line-height: 1.6;">${risk.description}</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; padding: 1rem; background: var(--secondary); border-radius: var(--radius);">
            <div>
              <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">SEVERITY</p>
              <p style="margin: 0; font-weight: 600; color: ${COLORS[risk.severity]}">${risk.severity.toUpperCase()}</p>
            </div>
            <div>
              <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">STATUS</p>
              <p style="margin: 0; font-weight: 600;">${risk.status.toUpperCase()}</p>
            </div>
          </div>

          <div>
            <h3 style="font-size: 0.8rem; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 0.5rem;">Mitigation Plan</h3>
            <div style="padding: 1rem; border-left: 4px solid var(--primary); background: rgba(0, 102, 102, 0.05);">
              <p style="margin: 0; font-style: italic;">${risk.mitigationPlan || "No mitigation plan currently on file."}</p>
            </div>
          </div>
        </div>

        <div style="padding: 1rem 1.5rem; background: var(--secondary); border-top: 1px solid var(--border); text-align: right;">
          <span style="font-size: 0.8rem; color: var(--muted-foreground);">Last Updated: ${risk.lastUpdated}</span>
        </div>
      </div>
    </div>
  `;
}
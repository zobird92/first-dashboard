/**
 * location-card.js - A Vanilla JS component for site cards
 */
export function renderLocationCard(location, totalRisks, siteScore) {
  return `
    <div class="location-card" data-location-id="${location.id}" style="padding: 1.5rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); border-top: 5px solid var(--primary); cursor: pointer; transition: transform 0.2s;">
      <div style="margin-bottom: 1rem;">
        <h3 style="margin: 0; color: var(--foreground); font-size: 1.25rem;">${location.name}</h3>
        <p style="font-size: 0.85rem; color: var(--muted-foreground); margin-top: 0.25rem; line-height: 1.4;">${location.address}</p>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-top: 1px solid var(--border); padding-top: 1rem;">
        <div>
          <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); font-weight: 600;">Total Risks</span>
          <p style="margin: 0; font-weight: 700; font-size: 1.4rem; color: var(--foreground);">${totalRisks}</p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); font-weight: 600;">Site Score</span>
          <p style="margin: 0; font-weight: 700; font-size: 1.4rem; color: var(--primary);">${siteScore}</p>
        </div>
      </div>
    </div>
  `;
}
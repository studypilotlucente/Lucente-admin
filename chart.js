export function renderCharts(sessions, team) {
  renderWeeklyChart(sessions);
  renderTeamProductivity(sessions, team);
}

function renderWeeklyChart(sessions) {
  const chart = document.getElementById("weeklyChart");
  if (!chart) return;

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const totals = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0
  };

  sessions.forEach(session => {
    if (!session.startTime) return;

    const date = new Date(session.startTime);
    const dayName = days[(date.getDay() + 6) % 7];

    totals[dayName] += session.totalMinutes || 0;
  });

  const maxMinutes = Math.max(...Object.values(totals), 60);

  chart.innerHTML = days.map(day => {
    const minutes = totals[day];
    const hours = (minutes / 60).toFixed(1);
    const width = Math.min(100, (minutes / maxMinutes) * 100);

    return `
      <div class="bar-row">
        <div class="bar-label">
          <span>${day}</span>
          <span>${hours}h</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${width}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderTeamProductivity(sessions, team) {
  const container = document.getElementById("teamProductivity");
  if (!container) return;

  const totals = {};

  team.forEach(person => {
    totals[person] = 0;
  });

  sessions.forEach(session => {
    if (!session.person) return;
    totals[session.person] += session.totalMinutes || 0;
  });

  const maxMinutes = Math.max(...Object.values(totals), 60);

  container.innerHTML = team.map(person => {
    const minutes = totals[person] || 0;
    const hours = (minutes / 60).toFixed(1);
    const width = Math.min(100, (minutes / maxMinutes) * 100);

    return `
      <div class="bar-row">
        <div class="bar-label">
          <span>${person}</span>
          <span>${hours}h</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${width}%"></div>
        </div>
      </div>
    `;
  }).join("");
}
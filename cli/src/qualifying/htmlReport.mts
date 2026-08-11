import { mkdir, writeFile } from "fs/promises"
import { dirname } from "path"
import { prepareStatement } from "lib"
import type { Pool } from "lib"
import type { QualifyingReportData, TimeDiffResult, PeriodDiffResult, TimeDiffRow, PeriodDiffRow } from "./reportData.mjs"

const escapeHtml = ( value: unknown ): string =>
  String( value ?? "" )
    .replace( /&/g, "&amp;" )
    .replace( /</g, "&lt;" )
    .replace( />/g, "&gt;" )
    .replace( /"/g, "&quot;" )

const CSS = `
  :root {
    --bg: #F2F6F7; --surface: #FFFFFF; --surface-2: #E7EEF0; --border: #D3DEE1;
    --text: #10262E; --text-muted: #4B6167; --accent: #0B7285; --accent-strong: #075E6E;
    --good: #2F9E44; --good-bg: #E6F6E9; --warn: #C24C05; --warn-bg: #FDEEE3;
    --info: #6741D9; --info-bg: #F1EDFC; --neutral: #5C6670; --neutral-bg: #EEF1F3;
    --shadow: 0 1px 2px rgba(16,38,46,0.06), 0 8px 24px -12px rgba(16,38,46,0.12);
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0B1B20; --surface: #12262C; --surface-2: #17323A; --border: #234046;
      --text: #E6F1F3; --text-muted: #9FB8BD; --accent: #2FB7C9; --accent-strong: #63D4E3;
      --good: #57C77B; --good-bg: #163425; --warn: #FF922B; --warn-bg: #3A2712;
      --info: #A594FF; --info-bg: #241C42; --neutral: #9AA7AE; --neutral-bg: #1B2C31;
      --shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -12px rgba(0,0,0,0.5); }
  }
  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.55; padding: 40px 20px 80px; margin: 0; }
  .page { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
  h1, h2 { font-family: "Archivo Narrow", "Roboto Condensed", "Arial Narrow", sans-serif; font-weight: 700; margin: 0; }
  .mono { font-family: ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }
  header { display: flex; flex-direction: column; gap: 6px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
  .eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 12px; font-weight: 600; color: var(--accent); }
  h1 { font-size: 30px; }
  .meta { color: var(--text-muted); font-size: 14px; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .tile { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 4px; }
  .tile .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); font-weight: 600; }
  .tile .value { font-family: "Archivo Narrow", "Roboto Condensed", "Arial Narrow", sans-serif; font-size: 28px; font-weight: 700; color: var(--accent-strong); }
  section.report { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); overflow: hidden; }
  .report-head { padding: 18px 22px; display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 10px; border-bottom: 1px solid var(--border); background: var(--surface-2); }
  .report-head h2 { font-size: 18px; }
  .report-head .desc { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
  .chipset { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { display: inline-flex; align-items: baseline; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 12.5px; font-weight: 600; white-space: nowrap; }
  .chip .n { font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .chip.good { background: var(--good-bg); color: var(--good); }
  .chip.warn { background: var(--warn-bg); color: var(--warn); }
  .chip.neutral { background: var(--neutral-bg); color: var(--neutral); }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  thead th { text-align: left; padding: 10px 22px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); border-bottom: 1px solid var(--border); white-space: nowrap; }
  tbody td { padding: 8px 22px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: var(--surface-2); }
  td.time, td.date { font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  td.date.empty { color: var(--text-muted); }
  .cat-badge, .status-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
  .cat-badge.value-diff, .status-pill.differ { background: var(--warn-bg); color: var(--warn); }
  .cat-badge.format-issue { background: var(--info-bg); color: var(--info); }
  .cat-badge.missing-value, .status-pill.neutral { background: var(--neutral-bg); color: var(--neutral); }
  .status-pill.good { background: var(--good-bg); color: var(--good); }
  .empty-note { padding: 16px 22px; color: var(--text-muted); font-size: 13.5px; border-bottom: 1px solid var(--border); }
  .controls { padding: 14px 22px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; border-bottom: 1px solid var(--border); }
  .search-box { flex: 1; min-width: 200px; padding: 7px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 13.5px; }
  .filter-chip { border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; }
  .filter-chip.active { background: var(--accent); border-color: var(--accent); color: var(--surface); }
  th.sortable { cursor: pointer; user-select: none; }
  th.sortable .arrow { opacity: 0.4; margin-left: 3px; }
  th.sortable.active .arrow { opacity: 1; color: var(--accent); }
  .result-count { padding: 8px 22px; font-size: 12px; color: var(--text-muted); }
  footer { border-top: 1px solid var(--border); padding-top: 18px; font-size: 13px; color: var(--text-muted); }
`

const statusLabel: Record<string, string> = {
  match: "Match", differ: "Differ", "only-in-a": "Only A", "only-in-b": "Only B",
  "only-in-staged": "Only staged", "only-in-live": "Only live",
}

const timeTableSection = ( id: string, title: string, desc: string, result: TimeDiffResult, includeCategory: boolean ): string => {
  const { aLabel, bLabel, counts, diffs } = result
  const rowsJson = JSON.stringify( diffs.map( ( d: TimeDiffRow ) => ( {
    area: d.areaName, gender: d.gender, age: d.age, course: d.course.toUpperCase(),
    stroke: d.stroke.replace( /_/g, " " ), distance: d.distance,
    a: d.aTimeString ?? "-", b: d.bTimeString ?? "-",
    delta: d.deltaSeconds ?? null, status: d.status, category: d.category ?? null,
  } ) ) )

  const categoryChips = includeCategory
    ? [ "value-diff", "format-issue", "missing-value" ]
      .map( c => {
        const n = diffs.filter( d => d.category === c ).length
        return n ? `<button class="filter-chip" data-cat="${c}">${c} <span class="mono">${n}</span></button>` : ""
      } ).join( "" )
    : ""

  return `
  <section class="report">
    <div class="report-head">
      <div><h2>${escapeHtml( title )}</h2><div class="desc">${escapeHtml( desc )}</div></div>
      <div class="chipset">
        <span class="chip good">match <span class="n">${counts.match}</span></span>
        <span class="chip warn">differ <span class="n">${counts.differ}</span></span>
        <span class="chip neutral">only ${escapeHtml( aLabel )} <span class="n">${counts.onlyA}</span></span>
        <span class="chip neutral">only ${escapeHtml( bLabel )} <span class="n">${counts.onlyB}</span></span>
      </div>
    </div>
    ${ diffs.length ? `
    <div class="controls">
      <input type="text" class="search-box" id="search-${id}" placeholder="Filter by county, stroke, gender, age…">
      <button class="filter-chip active" data-cat="all">All <span class="mono">${diffs.length}</span></button>
      ${categoryChips}
    </div>
    <div class="result-count" id="count-${id}"></div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="sortable" data-key="area">County <span class="arrow">↕</span></th>
            <th class="sortable" data-key="gender">Gender <span class="arrow">↕</span></th>
            <th class="sortable" data-key="age">Age <span class="arrow">↕</span></th>
            <th>Course</th>
            <th class="sortable" data-key="stroke">Stroke <span class="arrow">↕</span></th>
            <th>Distance</th>
            <th>${escapeHtml( aLabel )}</th>
            <th>${escapeHtml( bLabel )}</th>
            <th class="sortable" data-key="delta">Δ <span class="arrow">↕</span></th>
            ${includeCategory ? "<th>Category</th>" : "<th>Status</th>"}
          </tr>
        </thead>
        <tbody id="tbody-${id}"></tbody>
      </table>
    </div>
    <script>window.__reportTables = window.__reportTables || {}; window.__reportTables[${JSON.stringify( id )}] = { rows: ${rowsJson}, includeCategory: ${includeCategory} };</script>
    ` : `<div class="empty-note">No differences — every overlapping row matches.</div>` }
  </section>`
}

const periodsSection = ( result: PeriodDiffResult, year: number ): string => {
  const rowsJson = JSON.stringify( result.diffs.map( ( d: PeriodDiffRow ) => ( {
    area: d.areaName, status: d.status,
    stagedStart: d.stagedStart ?? "-", stagedEnd: d.stagedEnd ?? "-", stagedLastRace: d.stagedLastRace ?? "-",
    liveStart: d.liveStart ?? "-", liveEnd: d.liveEnd ?? "-", liveLastRace: d.liveLastRace ?? "-",
  } ) ) )

  return `
  <section class="report">
    <div class="report-head">
      <div><h2>Qualifying periods — swimming-times.com vs live QualifyingPeriods</h2><div class="desc">Qualifying window and championship last-race date, per county, ${year}</div></div>
      <div class="chipset">
        <span class="chip good">match <span class="n">${result.counts.match}</span></span>
        <span class="chip warn">differ <span class="n">${result.counts.differ}</span></span>
        <span class="chip neutral">only staged <span class="n">${result.counts.onlyStaged}</span></span>
        <span class="chip neutral">only live <span class="n">${result.counts.onlyLive}</span></span>
      </div>
    </div>
    <div class="empty-note">
      ${result.stagedCount} staged periods · ${result.liveCount} live rows ·
      <strong style="color:var(--accent-strong);">${result.withChampionshipDates}/${result.stagedCount}</strong>
      have an explicit championship-dates last race date (the rest are correctly left unset)
    </div>
    ${ result.diffs.length ? `
    <div class="result-count" id="count-periods"></div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>County</th><th>Staged start</th><th>Staged end</th><th>Staged last race</th><th>Live start</th><th>Live end</th><th>Live last race</th><th>Status</th></tr>
        </thead>
        <tbody id="tbody-periods"></tbody>
      </table>
    </div>
    <script>window.__periodRows = ${rowsJson};</script>
    ` : "" }
  </section>`
}

const versionMismatchSection = ( data: QualifyingReportData ): string => {
  if ( !data.swimturnVersionMismatches.length ) return ""
  const rows = data.swimturnVersionMismatches.map( m => `
    <tr>
      <td>${escapeHtml( m.areaName )}</td>
      <td class="mono">${escapeHtml( m.scope )}</td>
      <td class="mono">${escapeHtml( m.sourceYear ?? "-" )}</td>
      <td><span class="mono" style="font-size:12px;color:var(--text-muted);">${escapeHtml( m.sourceUrl ?? "-" )}</span></td>
    </tr>` ).join( "" )

  return `
  <section class="report">
    <div class="report-head">
      <div><h2>swimturn.com — stale seasons</h2><div class="desc">Leagues whose published standard isn't yet on the ${data.year} cycle</div></div>
      <div class="chipset"><span class="chip neutral">${data.swimturnVersionMismatches.length} leagues</span></div>
    </div>
    <div class="table-wrap">
      <table><thead><tr><th>Area</th><th>Scope</th><th>Published season</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
  </section>`
}

const CLIENT_SCRIPT = `
(function () {
  function renderDiffTable(id) {
    var config = (window.__reportTables || {})[id];
    if (!config) return;
    var state = { search: "", category: "all", sortKey: null, sortDir: 1 };
    var searchEl = document.getElementById("search-" + id);
    var countEl = document.getElementById("count-" + id);
    var tbody = document.getElementById("tbody-" + id);
    var section = tbody.closest("section");

    function render() {
      var rows = config.rows;
      if (state.category !== "all") rows = rows.filter(function (r) { return r.category === state.category || r.status === state.category; });
      if (state.search) {
        var q = state.search.toLowerCase();
        rows = rows.filter(function (r) {
          return [r.area, r.stroke, r.gender, r.age].some(function (v) { return String(v).toLowerCase().indexOf(q) !== -1; });
        });
      }
      if (state.sortKey) {
        var k = state.sortKey;
        rows = rows.slice().sort(function (a, b) {
          var av = a[k], bv = b[k];
          if (typeof av === "number" || typeof bv === "number") return ((av || 0) - (bv || 0)) * state.sortDir;
          return String(av).localeCompare(String(bv)) * state.sortDir;
        });
      }
      countEl.textContent = "Showing " + rows.length + " of " + config.rows.length + " rows";
      var frag = document.createDocumentFragment();
      rows.forEach(function (r) {
        var tr = document.createElement("tr");
        var deltaStr = r.delta === null || r.delta === undefined ? "-" : ((r.delta > 0 ? "+" : "") + r.delta.toFixed(2) + "s");
        var lastCell = config.includeCategory
          ? (r.category ? '<span class="cat-badge ' + r.category + '">' + r.category + '</span>' : "-")
          : '<span class="status-pill ' + (r.status === "match" ? "good" : r.status === "differ" ? "differ" : "neutral") + '">' + r.status + '</span>';
        tr.innerHTML = "<td>" + r.area + "</td><td>" + r.gender + "</td><td class=\\"mono\\">" + r.age + "</td>" +
          "<td class=\\"mono\\">" + r.course + "</td><td>" + r.stroke + "</td><td class=\\"mono\\">" + r.distance + "</td>" +
          "<td class=\\"time\\">" + r.a + "</td><td class=\\"time\\">" + r.b + "</td><td class=\\"time\\">" + deltaStr + "</td><td>" + lastCell + "</td>";
        frag.appendChild(tr);
      });
      tbody.innerHTML = "";
      tbody.appendChild(frag);
    }

    if (searchEl) searchEl.addEventListener("input", function (e) { state.search = e.target.value; render(); });
    section.querySelectorAll(".filter-chip[data-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        section.querySelectorAll(".filter-chip[data-cat]").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state.category = btn.dataset.cat;
        render();
      });
    });
    section.querySelectorAll("th.sortable").forEach(function (th) {
      th.addEventListener("click", function () {
        var key = th.dataset.key;
        if (state.sortKey === key) state.sortDir *= -1; else { state.sortKey = key; state.sortDir = 1; }
        section.querySelectorAll("th.sortable").forEach(function (h) { h.classList.remove("active"); });
        th.classList.add("active");
        th.querySelector(".arrow").textContent = state.sortDir === 1 ? "↑" : "↓";
        render();
      });
    });
    render();
  }

  Object.keys(window.__reportTables || {}).forEach(renderDiffTable);

  var periodRows = window.__periodRows;
  var periodTbody = document.getElementById("tbody-periods");
  if (periodRows && periodTbody) {
    document.getElementById("count-periods").textContent = "Showing " + periodRows.length + " rows";
    var frag = document.createDocumentFragment();
    periodRows.forEach(function (r) {
      var tr = document.createElement("tr");
      var cls = r.status === "match" ? "good" : r.status === "differ" ? "differ" : "neutral";
      tr.innerHTML = "<td>" + r.area + "</td><td class=\\"date\\">" + r.stagedStart + "</td><td class=\\"date\\">" + r.stagedEnd + "</td>" +
        "<td class=\\"date\\">" + r.stagedLastRace + "</td><td class=\\"date\\">" + r.liveStart + "</td><td class=\\"date\\">" + r.liveEnd + "</td>" +
        "<td class=\\"date\\">" + r.liveLastRace + "</td><td><span class=\\"status-pill " + cls + "\\">" + r.status + "</span></td>";
      frag.appendChild(tr);
    });
    periodTbody.innerHTML = "";
    periodTbody.appendChild(frag);
  }
})();
`

export const renderQualifyingHtmlReport = ( data: QualifyingReportData ): string => {
  const sourceLabel = data.sources.join( " vs " )
  const sections: string[] = []

  if ( data.timesStVsSw ) {
    sections.push( timeTableSection( "st-vs-sw", "swimming-times.com vs swimturn.com", "Matched on scope · area · age · gender · course · stroke · distance", data.timesStVsSw, false ) )
  }
  for ( const source of data.sources ) {
    const result = data.timesVsLive[source]
    if ( result ) sections.push( timeTableSection( `${source}-vs-live`, `${source} vs live QualifyingTimes`, "Where the source disagrees with what's currently saved", result, true ) )
  }
  sections.push( versionMismatchSection( data ) )
  if ( data.periods ) sections.push( periodsSection( data.periods, data.year ) )

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Qualifying Times — Source Reconciliation, ${data.year}</title>
<style>${CSS}</style>
</head>
<body>
<div class="page">
  <header>
    <div class="eyebrow">Fetch CLI · qualifying subcommand</div>
    <h1>Qualifying Times — Source Reconciliation</h1>
    <div class="meta">
      ${data.year} season &nbsp;·&nbsp; <span class="mono">${escapeHtml( sourceLabel )}</span> vs live <span class="mono">QualifyingTimes</span>${data.periods ? " / <span class=\"mono\">QualifyingPeriods</span>" : ""}
      &nbsp;·&nbsp; generated ${escapeHtml( data.generatedAt )} &nbsp;·&nbsp; staged data only, nothing committed
    </div>
  </header>
  <div class="tiles">
    ${data.totals.swimmingTimes ? `<div class="tile"><div class="label">swimming-times.com</div><div class="value">${data.totals.swimmingTimes.toLocaleString()}</div></div>` : ""}
    ${data.totals.swimturn ? `<div class="tile"><div class="label">swimturn.com</div><div class="value">${data.totals.swimturn.toLocaleString()}</div></div>` : ""}
    <div class="tile"><div class="label">Live QualifyingTimes</div><div class="value">${data.totals.live.toLocaleString()}</div></div>
  </div>
  ${sections.join( "\n" )}
  <footer>
    Generated from <span class="mono">fetch qualifying --year ${data.year} --html-report</span> at ${escapeHtml( data.generatedAt )}.
    No staged row has been written to <span class="mono">QualifyingTimes</span> or <span class="mono">QualifyingPeriods</span> — committing is a separate, deliberate step.
  </footer>
</div>
<script>${CLIENT_SCRIPT}</script>
</body>
</html>
`
}

export const writeQualifyingHtmlReport = async ( data: QualifyingReportData, outputPath: string ): Promise<void> => {
  await mkdir( dirname( outputPath ), { recursive: true } )
  await writeFile( outputPath, renderQualifyingHtmlReport( data ), "utf8" )
}

const DEFAULT_RETAIN_COUNT = 30

// Saves the rendered report into QualifyingReports so the admin web UI can list
// and view it — the CLI and web app don't share a filesystem, so the DB is the
// only channel between a periodic/cron fetch run and the browser. Each report is
// several MB of embedded HTML/JSON, so old ones are pruned to keep the table bounded.
export const saveQualifyingHtmlReport = async ( pool: Pool, data: QualifyingReportData, retainCount = DEFAULT_RETAIN_COUNT ): Promise<number> => {
  const insert = prepareStatement<{ year: number, sources: string, html: string }>(
    pool,
    "INSERT INTO QualifyingReports (year, sources, html) VALUES (:year, :sources, :html)"
  )
  const { insertId } = await insert.run( { year: data.year, sources: data.sources.join( "," ), html: renderQualifyingHtmlReport( data ) } )

  const prune = prepareStatement<{ retainCount: number }>(
    pool,
    `DELETE FROM QualifyingReports WHERE id NOT IN (
      SELECT id FROM ( SELECT id FROM QualifyingReports ORDER BY generatedAt DESC LIMIT :retainCount ) AS keep
    )`
  )
  await prune.run( { retainCount } )

  return insertId
}

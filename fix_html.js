const fs = require('fs');

let content = fs.readFileSync('dashboard.html', 'utf8');

const checkboxes_old = '<label style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" value="Ignite"> Ignite</label><label style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" value="Epsilon"> Epsilon</label>';
const checkboxes_new = '<label style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" value="NEPS"> NEPS</label><label style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" value="NEGS"> NEGS</label><label style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" value="Nalanda"> Nalanda</label>';
content = content.replace(checkboxes_old, checkboxes_new);

const overview_header = <!-- Student Performance Overview -->\n        <div class="panel-header" style="margin-top: 3rem; display: flex; justify-content: space-between; align-items: flex-end;">\n          <div>\n            <h1>Student Performance Overview</h1>;
const overview_header_new = <!-- Student Performance Overview -->\n        <div class="panel-header" id="overview-header" style="margin-top: 3rem; display: flex; justify-content: space-between; align-items: flex-end; cursor: pointer; user-select: none;">\n          <div>\n            <h1>Student Performance Overview <span id="overview-toggle-icon" style="font-size: 1rem; margin-left: 0.5rem;">?</span></h1>;
content = content.replace(overview_header, overview_header_new);

const table_wrapper = '<div style="overflow-x: auto; background: var(--surface-card); border-radius: 12px; border: 1px solid var(--border); box-shadow: var(--shadow);">';
const table_wrapper_new = '<div id="overview-content" style="display: none; overflow-x: auto; max-height: 400px; overflow-y: auto; background: var(--surface-card); border-radius: 12px; border: 1px solid var(--border); box-shadow: var(--shadow);">';
content = content.replace(table_wrapper, table_wrapper_new);

const table_head = '<thead style="background: var(--bg); border-bottom: 1px solid var(--border);">';
const table_head_new = '<thead style="background: var(--bg); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10;">';
content = content.replace(table_head, table_head_new);

const insights_header = <!-- Attention & Growth Container -->\n        <div class="panel-header" style="margin-top: 3rem; display: flex; justify-content: space-between; align-items: flex-end;">\n          <div>\n            <h1>Performance Insights</h1>;
const insights_header_new = <!-- Attention & Growth Container -->\n        <div class="panel-header" id="insights-header" style="margin-top: 3rem; display: flex; justify-content: space-between; align-items: flex-end; cursor: pointer; user-select: none;">\n          <div>\n            <h1>Performance Insights <span id="insights-toggle-icon" style="font-size: 1rem; margin-left: 0.5rem;">?</span></h1>;
content = content.replace(insights_header, insights_header_new);

const insights_grid = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1.5rem;">';
const insights_grid_new = '<div id="insights-content" style="display: none; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1.5rem;">';
content = content.replace(insights_grid, insights_grid_new);

let parts = content.split('<!-- Students Requiring Attention -->');
if (parts.length > 1) {
    let second_part = parts[1];
    second_part = second_part.replace(/<div class="submit-card wide-card" style="margin-bottom: 0;">/g, '<div class="submit-card wide-card" style="margin-bottom: 0; max-height: 400px; overflow-y: auto;">');
    content = parts[0] + '<!-- Students Requiring Attention -->' + second_part;
}

const homework_links_ui = <button class="btn btn-primary" id="hw-submit-btn" style="margin-top: 1rem;">Save Homework Link</button>\n          <p id="hw-status" style="margin-top: 1rem; display: none; font-weight: 500;"></p>\n        </div>;
const homework_links_ui_new = <button class="btn btn-primary" id="hw-submit-btn" style="margin-top: 1rem;">Save Homework Link</button>
          <p id="hw-status" style="margin-top: 1rem; display: none; font-weight: 500;"></p>
        </div>
        
        <div class="submit-card wide-card" style="margin-bottom: 3rem; max-height: 400px; overflow-y: auto;">
            <h3 style="margin-bottom: 1rem;">Existing Homework Links</h3>
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
              <thead style="background: var(--bg); position: sticky; top: 0; z-index: 10;">
                <tr>
                  <th style="padding: 1rem; border-bottom: 1px solid var(--border);">Date</th>
                  <th style="padding: 1rem; border-bottom: 1px solid var(--border);">Group</th>
                  <th style="padding: 1rem; border-bottom: 1px solid var(--border);">Link</th>
                  <th style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody id="hw-links-tbody">
                <tr><td colspan="4" style="text-align: center; padding: 1rem; color: var(--text-muted);">Loading links...</td></tr>
              </tbody>
            </table>
        </div>;
content = content.replace(homework_links_ui, homework_links_ui_new);

fs.writeFileSync('dashboard.html', content);

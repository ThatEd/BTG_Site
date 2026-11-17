(function (root) {
  'use strict';
  var busy = false;
  var errors = {
    over_budget: 'The paying side has insufficient funds. No payment was made.',
    price_changed: 'The buyout quote changed. Reopen the contract to review the current amount.',
    contract_not_found: 'That contract has already ended or changed. Refresh the dashboard.',
    contract_expired: 'That contract has already expired.',
    already_pending: 'A mutual exit request is already waiting for a response.',
    change_already_pending: 'A revision of this contract is already open. Revise its terms in the existing offer.',
    invalid_state: 'This agreement or request has changed. Refresh before trying again.',
    invalid_buyout: 'Choose a buyout multiplier from 1.5x to 5x.',
    invalid_year: 'Enter valid start and end years, with the end no earlier than the start.',
    counter_pending: 'A counter-offer is waiting for the team principal to respond.',
    no_seat: 'There is no free seat for this role and contract period. The agreement is waiting for a seat.',
    overlapping_contract: 'An overlapping contract requires official approval.',
    forbidden: 'Only the contract parties can take this action.',
    unauthorized: 'Your session expired. Sign in again.',
    signing_failed: 'The signature could not be completed. No partial signing payment was kept.',
    invalid_contract_dates: 'The contract has incomplete dates and needs an official correction.'
  };
  function errorText(code) { return errors[code] || ('Could not complete the action: ' + (code || 'unknown error')); }
  function money(value) { return '$' + Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function esc(value) { return BTG.esc(String(value == null ? '' : value)); }
  async function refresh() {
    var selected = CURRENT_USER && CURRENT_USER.role === 'tp' ? selectedTpTeam() : null;
    var data = await callGateway('session', {});
    if (!data.ok) throw new Error(errorText(data.error));
    onLoginSuccess(data);
    if (selected && CURRENT_USER.role === 'tp') { TP_TEAM_SEL = selected; populateTpTeamSwitch(); renderContracts(); }
    showDashTab('contracts');
  }
  function modal(id, title, content) {
    var old = document.getElementById(id); if (old) old.remove();
    var overlay = document.createElement('div'); overlay.id = id; overlay.className = 'modal-overlay open';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', title);
    overlay.innerHTML = '<div class="modal"><div class="modal-header"><div class="modal-title">' + esc(title) + '</div>'
      + '<button type="button" class="modal-close" aria-label="Close">×</button></div><div class="modal-body">' + content + '</div></div>';
    overlay.querySelector('.modal-close').onclick = function () { if (!busy) overlay.remove(); };
    overlay.onclick = function (event) { if (event.target === overlay && !busy) overlay.remove(); };
    overlay.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !busy) overlay.remove(); });
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-close').focus();
    return overlay;
  }
  function requestsHtml(role) {
    if (role !== 'driver' && role !== 'tp') return '';
    var requests = (DASH && DASH.terminations) || [];
    if (role === 'tp') requests = requests.filter(function (r) { return r.team === selectedTpTeam(); });
    if (!requests.length) return '';
    return '<div class="ov-card" style="margin-bottom:18px"><div class="ov-card-title">Contract exit requests</div>'
      + requests.slice(0, 20).map(function (r) {
        var actions = '';
        if (r.status === 'pending') {
          var own = r.requested_side === role;
          actions = (own ? [['withdraw','Withdraw request']] : [['accept','Agree to free exit'],['decline','Keep contract']]).map(function (a) {
            return '<button class="action action-quiet action-compact" onclick="actOnContractExit(' + Number(r.contract_id) + ',' + Number(r.request_id) + ',\'' + a[0] + '\')"><span>' + a[1] + '</span></button>';
          }).join('');
        }
        return '<div class="offer"><div class="offer-top"><span>' + esc(r.driver_name) + ' / ' + esc(r.team) + '</span><span class="stamp">' + esc(r.status) + '</span></div>'
          + '<div class="offer-body">Requested by ' + esc(r.requested_by) + ' on ' + esc(r.requested_on) + '. '
          + (r.status === 'forced' ? 'Buyout paid: ' + money(r.paid_amount) : 'A mutual exit costs neither side anything.') + '</div><div class="offer-actions">' + actions + '</div></div>';
      }).join('') + '</div>';
  }
  async function act(contractRow, requestId, exitAction) {
    if (busy) return;
    busy = true;
    try {
      var data = await callGateway('contractExit', { contractRow: contractRow, requestId: requestId, exitAction: exitAction });
      if (!data.ok) { alert(errorText(data.error)); return; }
      await refresh();
    } catch (e) { alert(e.message || 'Could not reach the contract service.'); }
    finally { busy = false; }
  }
  async function openExit(contractRow) {
    if (busy) return;
    busy = true;
    var quote;
    try { quote = await callGateway('contractExitQuote', { contractRow: contractRow }); }
    catch (e) { alert('Could not load the current buyout quote.'); return; }
    finally { busy = false; }
    if (!quote.ok) { alert(errorText(quote.error)); return; }
    var overlay = modal('contract-exit-modal', 'End contract',
      '<p><b>' + esc(quote.driver) + '</b> / ' + esc(quote.team) + ' / ' + esc(quote.from) + '–' + esc(quote.till) + '</p>'
      + '<div class="contract-exit-summary"><div>Remaining salary value <b>' + money(quote.remainingValue) + '</b></div>'
      + '<div>Signed buyout clause <b>' + Number(quote.buyoutMultiplier).toFixed(1) + '×</b></div>'
      + '<div>Unilateral exit payment <b>' + money(quote.buyoutCost) + '</b></div></div>'
      + '<p class="muted">Calculated from game date ' + esc(quote.today) + '. Remaining current-season salary is prorated by day; future seasons count in full. The clause was set when this contract was signed.</p>'
      + '<p>A mutual exit needs the other side’s agreement and is free. A unilateral exit ends the contract immediately and transfers the displayed payment to the other side.</p>'
      + '<div class="offer-actions"><button type="button" class="action action-quiet" data-exit="request"><span>Request mutual free exit</span></button>'
      + '<button type="button" class="action action-lead" data-exit="force"><span>Pay ' + money(quote.buyoutCost) + ' and end contract</span></button></div>'
      + '<div class="result-line" data-result></div>');
    overlay.querySelectorAll('[data-exit]').forEach(function (button) {
      button.onclick = async function () {
        if (busy) return;
        var action = button.dataset.exit;
        if (action === 'force' && !confirm('End this contract now and pay ' + money(quote.buyoutCost) + ' to the other side?')) return;
        busy = true; button.disabled = true;
        try {
          var data = await callGateway('contractExit', { contractRow: contractRow, exitAction: action, maxCost: Number(quote.buyoutCost) });
          if (!data.ok) { showResult(overlay.querySelector('[data-result]'), false, errorText(data.error)); return; }
          overlay.remove(); await refresh();
        } catch (e) { showResult(overlay.querySelector('[data-result]'), false, 'Could not complete the exit. Refresh to check its status.'); }
        finally { busy = false; button.disabled = false; }
      };
    });
  }
  function openCounter(offerRow) {
    var o = offerByRow(offerRow); if (!o || busy) return;
    var base = o.counter || o;
    var overlay = modal('contract-counter-modal', 'Revise contract offer', '<form data-counter-form>'
      + '<div class="field"><label for="counter-role">Role</label><select id="counter-role">' + ROLE_OPTIONS + '</select></div>'
      + '<div class="field"><label for="counter-salary">Annual salary</label><input id="counter-salary" required value="' + esc(base.salary) + '"></div>'
      + '<div class="field-row"><div class="field"><label for="counter-from">From year</label><input id="counter-from" type="number" min="1990" max="2100" required value="' + esc(base.from || CURRENT_YEAR) + '"' + (o.modify ? ' readonly' : '') + '></div>'
      + '<div class="field"><label for="counter-till">End year</label><input id="counter-till" type="number" min="1990" max="2100" required value="' + esc(base.till || CURRENT_YEAR) + '"></div></div>'
      + contractBuyoutSlider('counter-buyout', base.buyoutMultiplier)
      + '<div class="field"><label for="counter-terms">Terms</label><input id="counter-terms" value="' + esc(base.terms) + '"></div>'
      + '<div class="field"><label for="counter-message">Message</label><input id="counter-message"></div>'
      + '<p class="muted">Driving talks can leak. Each revision raises this month’s cumulative chance.</p>'
      + '<button type="submit" class="action action-lead"><span>Send revision</span></button><div class="result-line" data-result></div></form>');
    overlay.querySelector('#counter-role').value = base.role || 'Driving';
    overlay.querySelector('form').onsubmit = async function (event) {
      event.preventDefault(); if (busy) return;
      var salary = parseMoney(overlay.querySelector('#counter-salary').value);
      var from = Number(overlay.querySelector('#counter-from').value), till = Number(overlay.querySelector('#counter-till').value);
      if (!(salary > 0) || till < from) { showResult(overlay.querySelector('[data-result]'), false, 'Enter a positive salary and a valid year range.'); return; }
      busy = true; var button = overlay.querySelector('[type=submit]'); button.disabled = true;
      try {
        var data = await callGateway('respondContractOffer', { offerRow: Number(o.row), response: 'counter', counter: {
          salary: salary, from: from, till: till, role: overlay.querySelector('#counter-role').value,
          buyoutMultiplier: Number(overlay.querySelector('#counter-buyout').value), terms: overlay.querySelector('#counter-terms').value,
          message: overlay.querySelector('#counter-message').value
        } });
        if (!data.ok) { showResult(overlay.querySelector('[data-result]'), false, errorText(data.error)); return; }
        overlay.remove(); await refresh();
      } catch (e) { showResult(overlay.querySelector('[data-result]'), false, 'Could not send the revision. Refresh to check the offer.'); }
      finally { busy = false; button.disabled = false; }
    };
  }
  root.contractActionError = errorText;
  root.contractExitRequestsHtml = requestsHtml;
  root.openContractExit = openExit;
  root.actOnContractExit = act;
  root.ContractWorkflows = { openCounter: openCounter, refresh: refresh };
})(window);

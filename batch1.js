// =========================================
// SIMPLE MSISDN → ICCID LOOKUP (with Close Button)
// =========================================

function showSimpleInput() {
  const style = document.createElement('style');
  style.textContent = `
    .simple-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
      z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .simple-modal {
      background: white; padding: 24px; border-radius: 12px;
      width: 90%; max-width: 450px; box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      position: relative;
    }
    .simple-close {
      position: absolute; top: 12px; right: 12px;
      background: none; border: none; font-size: 20px; cursor: pointer;
      color: #888; width: 28px; height: 28px; display: flex;
      align-items: center; justify-content: center;
      border-radius: 50%;
    }
    .simple-close:hover {
      background: #f0f0f0;
      color: #333;
    }
    .simple-modal h3 {
      margin-top: 0; font-weight: 600; color: #333;
    }
    .simple-textarea {
      width: 100%; height: 180px; padding: 10px;
      border: 1px solid #ddd; border-radius: 6px;
      font-size: 15px; font-family: monospace;
      resize: vertical;
    }
    .simple-btn {
      width: 100%; padding: 10px; font-size: 16px;
      background: #17a2b8; color: white; border: none;
      border-radius: 6px; cursor: pointer; font-weight: 600;
      margin-top: 12px;
    }
    .simple-btn:hover {
      background: #138496;
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'simple-overlay';

  const modal = document.createElement('div');
  modal.className = 'simple-modal';

  // ✅ Close button (top-right ×)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'simple-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
    document.head.removeChild(style);
  };

  const title = document.createElement('h3');
  title.textContent = 'Paste MSISDNs (one per line)';

  const textarea = document.createElement('textarea');
  textarea.className = 'simple-textarea';
  textarea.placeholder = '717814328\n717519988\n717357608';

  const startBtn = document.createElement('button');
  startBtn.className = 'simple-btn';
  startBtn.textContent = 'Start Lookup';
  startBtn.onclick = () => {
    const input = textarea.value.trim();
    if (!input) {
      alert('Please enter at least one MSISDN.');
      return;
    }

    const lines = input.split('\n').map(l => l.trim()).filter(l => l);
    const valid = [];
    const invalid = [];

    for (const line of lines) {
      if (/^71\d{7}$/.test(line)) {
        valid.push(line);
      } else {
        invalid.push(line);
      }
    }

    if (invalid.length) {
      alert(`⚠️ Skipped ${invalid.length} invalid number(s). Must start with "71" and be 9 digits.`);
    }

    if (valid.length === 0) {
      alert('No valid MSISDNs found.');
      return;
    }

    document.body.removeChild(overlay);
    document.head.removeChild(style);
    batchMsisdnToIccidLookup(valid);
  };

  modal.appendChild(closeBtn);
  modal.appendChild(title);
  modal.appendChild(textarea);
  modal.appendChild(startBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  textarea.focus();
}

// =========================================
// BATCH LOOKUP FUNCTION (unchanged)
// =========================================
async function batchMsisdnToIccidLookup(msisdnList) {
  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  function clickHomeLogo() {
    const logo = document.querySelector("img.logoImg");
    if (!logo) return false;
    logo.click();
    return true;
  }

  if (!clickHomeLogo()) {
    console.error("❌ Failed to go home.");
    return;
  }
  await wait(1000);

  const results = [];

  for (const msisdn of msisdnList) {
    const select = document.querySelector("select#idtype");
    if (select) {
      const opt = [...select.options].find(o => o.textContent.trim().toLowerCase() === "msisdn");
      if (opt) {
        select.value = opt.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    await wait(300);

    const input = document.querySelector("input#number");
    if (input) {
      input.value = msisdn;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await wait(200);

    const btn = [...document.querySelectorAll("button.btn.btn-info")].find(b =>
      b.textContent.trim().toLowerCase().includes("search")
    );
    if (btn) btn.click();
    await wait(800);

    let notFound = /subscriber not found/i.test(document.body.innerText);
    let iccid = "";
    if (!notFound) {
      const el = document.querySelector('.customer-details-ans.text-break');
      if (el && el.textContent.trim()) {
        const raw = el.textContent.trim();
        iccid = raw.startsWith("8925263790000") ? raw.replace("8925263790000", "") : raw;
      }
    }

    results.push({ msisdn, iccid: notFound ? "" : iccid });

    if (!clickHomeLogo()) console.warn("⚠️ Home nav failed");
    await wait(1200);
  }

  let out = "MSISDN\tICCID\n";
  out += results.map(r => `${r.msisdn}\t${r.iccid}`).join("\n");
  out += "\n\n=== COPY BELOW ===\n";
  out += results.map(r => r.iccid).join("\n");

  const blob = new Blob([out], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `iccid_results_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// =========================================
// LAUNCH
// =========================================
showSimpleInput();  

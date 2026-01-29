// =========================================
// USER-FRIENDLY BATCH MSISDN → ICCID LOOKUP
// (Preserves MSISDN exactly as pasted)
// =========================================

function showMsisdnInputDialog() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center;
    z-index: 2147483647; font-family: Arial, sans-serif;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white; padding: 20px; border-radius: 8px;
    width: 90%; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  `;

  const title = document.createElement('h3');
  title.textContent = 'Enter MSISDN List';
  title.style.marginTop = '0';

  const instructions = document.createElement('p');
  instructions.innerHTML = 'Paste your MSISDNs exactly as shown — one per line:<br><code>717814328<br>717519988<br>717357608</code>';
  instructions.style.fontSize = '14px';
  instructions.style.color = '#555';
  instructions.style.fontFamily = 'monospace';

  const textarea = document.createElement('textarea');
  textarea.placeholder = '717814328\n717519988\n717357608';
  textarea.rows = 10;
  textarea.style.cssText = `
    width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;
    font-family: monospace; font-size: 14px; margin: 10px 0;
  `;

  const buttonContainer = document.createElement('div');
  buttonContainer.style.textAlign = 'right';

  const startBtn = document.createElement('button');
  startBtn.textContent = 'Start Lookup';
  startBtn.style.cssText = `
    background: #17a2b8; color: white; border: none; padding: 8px 16px;
    border-radius: 4px; cursor: pointer; font-size: 14px;
  `;
  startBtn.onclick = () => {
    const input = textarea.value.trim();
    if (!input) {
      alert('Please enter at least one MSISDN.');
      return;
    }

    // ✅ SPLIT BY NEWLINE ONLY — preserve exact format
    const msisdnList = input
      .split('\n')                     // split by line break
      .map(line => line.trim())        // remove whitespace
      .filter(line => line !== '');    // skip empty lines

    if (msisdnList.length === 0) {
      alert('No valid MSISDNs found.');
      return;
    }

    document.body.removeChild(overlay);
    batchMsisdnToIccidLookup(msisdnList);
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    background: #6c757d; color: white; border: none; padding: 8px 16px;
    border-radius: 4px; cursor: pointer; font-size: 14px; margin-right: 8px;
  `;
  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
  };

  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(startBtn);

  modal.appendChild(title);
  modal.appendChild(instructions);
  modal.appendChild(textarea);
  modal.appendChild(buttonContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  textarea.focus();
}

// =========================================
// BATCH LOOKUP FUNCTION (WITH ENHANCEMENTS)
// =========================================
async function batchMsisdnToIccidLookup(msisdnList) {
  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  function clickHomeLogo() {
    const logo = document.querySelector("img.logoImg");
    if (!logo) {
      console.warn("⚠️ Home logo not found.");
      return false;
    }
    logo.click();
    console.log("🏠 Home logo clicked.");
    return true;
  }

  console.log("🚀 Starting batch MSISDN → ICCID lookup...");
  if (!clickHomeLogo()) {
    console.error("❌ Failed to navigate to home. Aborting.");
    return;
  }
  await wait(1000);

  const results = [];

  for (const msisdn of msisdnList) {
    console.log(`\n🔍 Processing MSISDN: ${msisdn}`);

    // Select MSISDN
    const select = document.querySelector("select#idtype");
    if (!select) {
      results.push({ msisdn, iccid: "" });
      continue;
    }
    const option = [...select.options].find(
      opt => opt.textContent.trim().toLowerCase() === "msisdn"
    );
    if (!option) {
      results.push({ msisdn, iccid: "" });
      continue;
    }
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(300);

    // Fill search
    const input = document.querySelector("input#number");
    if (!input) {
      results.push({ msisdn, iccid: "" });
      continue;
    }
    input.value = msisdn;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(200);

    // Click search
    const searchBtn = [...document.querySelectorAll("button.btn.btn-info")]
      .find(btn => btn.textContent.trim().toLowerCase().includes("search"));
    if (!searchBtn) {
      results.push({ msisdn, iccid: "" });
      continue;
    }
    searchBtn.click();
    await wait(800);

    // Wait for result or "Subscriber not found"
    let notFoundDetected = false;
    let iccid = "";
    let success = false;
    const timeout = 5000;
    const start = performance.now();

    while (performance.now() - start < timeout) {
      if (/subscriber not found/i.test(document.body.innerText)) {
        notFoundDetected = true;
        break;
      }

      const errorEl = document.querySelector('.alert-danger, .text-danger, .modal.show .modal-body');
      if (errorEl && /not found|no record|subscriber not found/i.test(errorEl.textContent)) {
        notFoundDetected = true;
        break;
      }

      const iccidEl = document.querySelector('.customer-details-ans.text-break');
      if (iccidEl && iccidEl.textContent.trim()) {
        iccid = iccidEl.textContent.trim();
        success = true;
        break;
      }

      await wait(200);
    }

    if (notFoundDetected) {
      console.log(`❌ Subscriber not found: ${msisdn}`);
      results.push({ msisdn, iccid: "" }); // Explicit empty string
    } else if (success) {
      console.log(`✅ Found ICCID: ${iccid}`);
      results.push({ msisdn, iccid });
    } else {
      console.warn(`⚠️ Timeout for ${msisdn}`);
      results.push({ msisdn, iccid: "" }); // Explicit empty string
    }

    // Return home
    if (!clickHomeLogo()) {
      console.warn("⚠️ Could not return to home.");
    }
    await wait(1200);
  }

  // =========================================
  // ✅ REQUIREMENT 2.1: FORMAT ICCID OUTPUT
  // Remove prefix "8925263790000" ONLY if at start of string
  // =========================================
  const formattedResults = results.map(r => {
    let cleanIccid = r.iccid;
    // Only remove prefix if present at VERY START (case-sensitive match)
    if (cleanIccid.startsWith('8925263790000')) {
      cleanIccid = cleanIccid.substring(13); // Remove exactly 13 chars
    }
    return { msisdn: r.msisdn, iccid: cleanIccid };
  });

  // =========================================
  // ✅ REQUIREMENT 2.2: USER-FRIENDLY RESULTS MODAL
  // With copy button, download option, and clear empty cells
  // =========================================
  const outputContent = "MSISDN\tICCID\n" + 
    formattedResults.map(r => 
      `${r.msisdn}\t${r.iccid}` // Empty string becomes visible tab gap
    ).join("\n");

  // Create results modal
  const resultsOverlay = document.createElement('div');
  resultsOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center;
    z-index: 2147483647; font-family: Arial, sans-serif;
  `;

  const resultsModal = document.createElement('div');
  resultsModal.style.cssText = `
    background: white; padding: 25px; border-radius: 10px;
    width: 92%; max-width: 750px; box-shadow: 0 5px 30px rgba(0,0,0,0.5);
    max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;
  `;

  // Header
  const header = document.createElement('div');
  header.innerHTML = `<h2 style="margin:0 0 15px 0; color:#1a5fb4">✅ Lookup Complete!</h2>
    <p style="margin:0 0 20px 0; color:#555">
      <strong>${msisdnList.length}</strong> MSISDNs processed • 
      Empty ICCID = Not Found • 
      Prefix "8925263790000" removed from valid ICCIDs
    </p>`;
  resultsModal.appendChild(header);

  // Results display
  const textarea = document.createElement('textarea');
  textarea.value = outputContent;
  textarea.readOnly = true;
  textarea.style.cssText = `
    flex:1; min-height: 250px; width:100%; padding:14px; 
    font-family: monospace; font-size:15px; line-height:1.5;
    border:1px solid #ddd; border-radius:6px; margin-bottom:20px;
    resize: vertical; background:#f9f9f9; color:#222;
  `;
  resultsModal.appendChild(textarea);

  // Button container
  const btnContainer = document.createElement('div');
  btnContainer.style.cssText = `display:flex; gap:12px; justify-content:space-between; flex-wrap:wrap`;

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.innerHTML = '📋 Copy Results';
  copyBtn.style.cssText = `
    flex:1; min-width:150px; padding:12px; background:#28a745; color:white; border:none;
    border-radius:6px; font-size:16px; font-weight:500; cursor:pointer;
    transition:all 0.2s; box-shadow:0 2px 5px rgba(0,0,0,0.2);
  `;
  copyBtn.onmouseover = () => copyBtn.style.background = '#218838';
  copyBtn.onmouseout = () => copyBtn.style.background = '#28a745';
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      showFeedback('✅ Copied to clipboard!', '#d4edda', '#155724');
    } catch (err) {
      // Fallback for restricted environments
      textarea.select();
      document.execCommand('copy');
      showFeedback('✅ Copied (fallback method)', '#d1ecf1', '#0c5460');
    }
  };

  // Download button
  const downloadBtn = document.createElement('button');
  downloadBtn.innerHTML = '📥 Download TXT';
  downloadBtn.style.cssText = `
    flex:1; min-width:150px; padding:12px; background:#17a2b8; color:white; border:none;
    border-radius:6px; font-size:16px; font-weight:500; cursor:pointer;
    transition:all 0.2s; box-shadow:0 2px 5px rgba(0,0,0,0.2);
  `;
  downloadBtn.onmouseover = () => downloadBtn.style.background = '#138496';
  downloadBtn.onmouseout = () => downloadBtn.style.background = '#17a2b8';
  downloadBtn.onclick = () => {
    const blob = new Blob([outputContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `msisdn_iccid_results_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showFeedback('✅ File downloaded!', '#d4edda', '#155724');
  };

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = 'CloseOperation';
  closeBtn.style.cssText = `
    flex:1; min-width:150px; padding:12px; background:#6c757d; color:white; border:none;
    border-radius:6px; font-size:16px; font-weight:500; cursor:pointer;
    transition:all 0.2s; box-shadow:0 2px 5px rgba(0,0,0,0.2);
  `;
  closeBtn.onmouseover = () => closeBtn.style.background = '#5a6268';
  closeBtn.onmouseout = () => closeBtn.style.background = '#6c757d';
  closeBtn.onclick = () => document.body.removeChild(resultsOverlay);

  btnContainer.appendChild(copyBtn);
  btnContainer.appendChild(downloadBtn);
  btnContainer.appendChild(closeBtn);
  resultsModal.appendChild(btnContainer);

  // Feedback helper
  function showFeedback(message, bg, color) {
    if (document.getElementById('result-feedback')) {
      document.getElementById('result-feedback').remove();
    }
    const fb = document.createElement('div');
    fb.id = 'result-feedback';
    fb.innerHTML = message;
    fb.style.cssText = `
      position:absolute; top:15px; right:15px; padding:10px 20px; border-radius:6px;
      background:${bg}; color:${color}; font-weight:500; box-shadow:0 3px 10px rgba(0,0,0,0.2);
      z-index:2147483647; animation:fade 3s forwards;
    `;
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        @keyframes fade { 
          0% { opacity:1; transform:translateY(0); } 
          70% { opacity:1; } 
          100% { opacity:0; transform:translateY(-10px); } 
        }
      </style>
    `);
    resultsModal.appendChild(fb);
    setTimeout(() => fb.remove(), 3000);
  }

  resultsOverlay.appendChild(resultsModal);
  document.body.appendChild(resultsOverlay);
  textarea.focus();
  textarea.select(); // Ready for manual copy if needed

  console.log("📄 Results ready. Modal displayed with formatted output.");
  console.table(formattedResults);
}

// =========================================
// LAUNCH INPUT DIALOG
// =========================================
showMsisdnInputDialog();

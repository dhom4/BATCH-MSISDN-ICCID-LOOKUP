// =========================================
// USER-FRIENDLY BATCH MSISDN ICCID LOOKUP
// =========================================

function showMsisdnInputDialog() {
  // Create a clean modal-style input box
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483647;
    font-family: Arial, sans-serif;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  `;

  const title = document.createElement('h3');
  title.textContent = 'Enter MSISDN List';
  title.style.marginTop = '0';

  const instructions = document.createElement('p');
  instructions.innerHTML = 'Paste one MSISDN per line (e.g.,<br>71xxxxxxx)';
  instructions.style.fontSize = '14px';
  instructions.style.color = '#555';

  const textarea = document.createElement('textarea');
  textarea.placeholder = '71xxxxxxx\n966509876543\n71xxxxxxx';
  textarea.rows = 8;
  textarea.style.cssText = `
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
    font-size: 14px;
    margin: 10px 0;
  `;

  const buttonContainer = document.createElement('div');
  buttonContainer.style.textAlign = 'right';

  const startBtn = document.createElement('button');
  startBtn.textContent = 'Start Lookup';
  startBtn.style.cssText = `
    background: #17a2b8;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  startBtn.onclick = () => {
    const input = textarea.value.trim();
    if (!input) {
      alert('Please enter at least one MSISDN.');
      return;
    }

    // Parse: split by newline, comma, or space; clean & filter
    const msisdnList = input
      .split(/[\n,\s]+/)
      .map(s => s.trim().replace(/\D/g, '')) // Keep only digits
      .filter(s => s.length > 0 && s.length <= 15); // Basic sanity

    if (msisdnList.length === 0) {
      alert('No valid MSISDNs found. Please enter numbers only.');
      return;
    }

    // Clean up UI
    document.body.removeChild(overlay);
    
    // Start the lookup
    batchMsisdnToIccidLookup(msisdnList);
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    background: #6c757d;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin-right: 8px;
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

  // Focus textarea for convenience
  textarea.focus();
}

// =========================================
// BATCH MSISDN TO ICCID LOOKUP (with "Subscriber not found" detection)
// =========================================
async function batchMsisdnToIccidLookup(msisdnList) {
  if (!Array.isArray(msisdnList) || msisdnList.length === 0) {
    console.error("❌ No MSISDN list provided.");
    return;
  }

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

    // --- Select MSISDN ---
    const select = document.querySelector("select#idtype");
    if (!select) {
      console.warn("⚠️ Dropdown not found.");
      results.push({ msisdn, iccid: "" });
      continue;
    }
    const option = [...select.options].find(
      opt => opt.textContent.trim().toLowerCase() === "msisdn"
    );
    if (!option) {
      console.warn("⚠️ MSISDN option not found.");
      results.push({ msisdn, iccid: "" });
      continue;
    }
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(300);

    // --- Fill search ---
    const input = document.querySelector("input#number");
    if (!input) {
      console.warn("⚠️ Search bar not found.");
      results.push({ msisdn, iccid: "" });
      continue;
    }
    input.value = msisdn;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(200);

    // --- Click search ---
    const searchBtn = [...document.querySelectorAll("button.btn.btn-info")]
      .find(btn => btn.textContent.trim().toLowerCase().includes("search"));
    if (!searchBtn) {
      console.warn("⚠️ Search button not found.");
      results.push({ msisdn, iccid: "" });
      continue;
    }
    searchBtn.click();
    await wait(800);

    // --- Wait for result or "not found" ---
    let notFoundDetected = false;
    let iccid = "";
    let success = false;
    const timeout = 5000;
    const start = performance.now();

    while (performance.now() - start < timeout) {
      // Check full page text for "Subscriber not found"
      if (/subscriber not found/i.test(document.body.innerText)) {
        notFoundDetected = true;
        break;
      }

      // Also check common error containers
      const errorEl = document.querySelector('.alert-danger, .text-danger, .modal.show .modal-body');
      if (errorEl && /not found|no record|subscriber not found/i.test(errorEl.textContent)) {
        notFoundDetected = true;
        break;
      }

      // Check for ICCID element
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
      results.push({ msisdn, iccid: "" });
    } else if (success) {
      console.log(`✅ Found ICCID: ${iccid}`);
      results.push({ msisdn, iccid });
    } else {
      console.warn(`⚠️ Timeout for ${msisdn}`);
      results.push({ msisdn, iccid: "" });
    }

    // Return home
    if (!clickHomeLogo()) {
      console.warn("⚠️ Could not return to home.");
    }
    await wait(1200);
  }

  // --- Generate & Download Results ---
  let output = "MSISDN\tICCID\n";
  output += results.map(r => `${r.msisdn}\t${r.iccid}`).join("\n");

  const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `msisdn_iccid_results_${new Date().toISOString().slice(0,10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log("📄 Results file downloaded!");
  console.table(results);
}

// =========================================
// LAUNCH THE USER INTERFACE
// =========================================
showMsisdnInputDialog();

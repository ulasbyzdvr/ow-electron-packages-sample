
// Renderer.ts for TFT Helper Overlay

// TEAM BUILDER: List of champions the user needs
// This will later be populated from the team builder feature
const WANTED_CHAMPIONS: string[] = [
  // Example: Add champion IDs that user wants
  "TFT16_Anivia",
  "TFT16_Blitzcrank",
  "TFT16_Viego",
  // Add more as needed from team builder
];

// Helper to check if a champion is wanted
function isChampionWanted(championId: string): boolean {
  // Direct match
  if (WANTED_CHAMPIONS.includes(championId)) return true;

  // Try without prefix
  const baseName = championId.replace(/^TFT\d+_/, '');
  return WANTED_CHAMPIONS.some(w => w.endsWith(baseName));
}

// Listen for messages from GEP
// @ts-ignore
window.gep.onMessage(function (...args) {
  // Always log to on-screen console for now
  logToScreen(JSON.stringify(args));

  if (args.length >= 2 && args[0] === 'TFT-SHOP-UPDATE') {
    const storeItems = args[1];
    if (Array.isArray(storeItems)) {
      updateOverlay(storeItems);
    }
  } else if (args.length >= 2 && args[0] === 'TFT-SHOP-UPDATE-EMPTY') {
    clearOverlay();
  }
});


function clearOverlay() {
  const container = document.getElementById('shop-overlay');
  if (container) container.innerHTML = '';
}

function updateOverlay(items: any[]) {
  const container = document.getElementById('shop-overlay');
  if (!container) return;

  container.innerHTML = '';

  // Sort items by slot key to ensure correct order
  items.sort((a, b) => {
    if (a.slot < b.slot) return -1;
    if (a.slot > b.slot) return 1;
    return 0;
  });

  const slots = [1, 2, 3, 4, 5];

  slots.forEach(slotNum => {
    const item = items.find(i =>
      i.slot === `shop_${slotNum}` ||
      i.slot === `store_${slotNum}` ||
      i.slot === `slot_${slotNum}` ||
      i.slot.endsWith(`_${slotNum}`)
    );

    const frameDiv = document.createElement('div');
    frameDiv.className = 'shop-card-frame';

    // If no item or sold, make invisible
    if (!item || item.tier === 'sold') {
      frameDiv.classList.add('tier-sold');
      container.appendChild(frameDiv);
      return;
    }

    // Add tier class
    const tierClass = `tier-${item.tier}`;
    if (item.tier === '?') {
      frameDiv.classList.add('tier-unknown');
    } else {
      frameDiv.classList.add(tierClass);
    }

    // Check if this champion is wanted by the team builder
    if (isChampionWanted(item.champion)) {
      const indicator = document.createElement('div');
      indicator.className = 'needed-indicator';
      frameDiv.appendChild(indicator);
    }

    container.appendChild(frameDiv);
  });
}

function logToScreen(msg: string) {
  const consoleDiv = document.getElementById('debug-console');
  if (consoleDiv) {
    consoleDiv.style.display = 'block';
    const p = document.createElement('div');
    p.innerText = `${new Date().toLocaleTimeString()} - ${msg}`;
    consoleDiv.prepend(p);

    // Limit log entries
    while (consoleDiv.children.length > 50) {
      consoleDiv.removeChild(consoleDiv.lastChild!);
    }
  }
}

// Export wanted champions list for external updates (team builder)
// @ts-ignore
window.updateWantedChampions = function (champions: string[]) {
  WANTED_CHAMPIONS.length = 0;
  WANTED_CHAMPIONS.push(...champions);
}

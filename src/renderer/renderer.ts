// Renderer.ts for TFT Helper Overlay
export { };

/* ---------------------------------------------
 * Types
 * --------------------------------------------- */

type Trait = {
  name: string;
  icon?: string;
};

type Champion = {
  id: string;
  name?: string;
  cost: number;
  image: string;
  traits?: Trait[];
};

type ShopItem = {
  slot: string | number;
  champion?: string; // "TFT16_Jinx"
  tier?: number | 'sold';
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gep?: any;
    overlay: {
      getChampionData: () => Promise<Champion[]>;
      setMousePassthrough: (passthrough: boolean) => Promise<void>;
    };
  }
}

/* ---------------------------------------------
 * State / Cache
 * --------------------------------------------- */

// Son shop verileri (anlık güncelleme için)
let LAST_SHOP_ITEMS: ShopItem[] = [];

// Champion Data Cache (ID -> Champion)
const CHAMPION_DATA_CACHE: Record<string, Champion> = {};

// Trait icon URL cache (traitName -> resolved url or empty)
const TRAIT_ICON_RESOLVED: Record<string, string> = {};

/* ---------------------------------------------
 * Helpers
 * --------------------------------------------- */

function safeParseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getWantedChampions(): string[] {
  return safeParseJSON<string[]>(localStorage.getItem('wantedChampions'), []);
}

function setWantedChampions(list: string[]) {
  localStorage.setItem('wantedChampions', JSON.stringify(list));
}

function normalizeChampionNameForSearch(champ: Champion): string {
  // Prefer champ.name if present and different
  let name = champ.name && champ.name !== champ.id ? champ.name : champ.id;
  name = name.replace(/^TFT\d+_/, '');
  // Split CamelCase a bit (keep numbers)
  name = name.replace(/([A-Z])/g, ' $1').trim();
  return name;
}

function normalizeTraitNameKey(name: string) {
  return name.trim();
}

function toLowerTR(s: string) {
  return s.toLocaleLowerCase('tr-TR');
}

function getCostForShopItem(item: ShopItem): number | null {
  // prefer number tier if valid
  if (typeof item.tier === 'number') return item.tier;

  const champId = item.champion;
  if (champId && CHAMPION_DATA_CACHE[champId]?.cost != null) {
    return CHAMPION_DATA_CACHE[champId].cost;
  }
  return null;
}

function getSlotNum(slot: string | number): number | null {
  if (typeof slot === 'number') return slot;
  const s = String(slot);
  // matches "..._1" etc
  const m = s.match(/(\d+)\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function isSold(item: ShopItem | undefined): boolean {
  return !item || item.tier === 'sold';
}

/* ---------------------------------------------
 * Selection Counter
 * --------------------------------------------- */

function updateSelectionCounter() {
  const counter = document.getElementById('selection-counter');
  if (!counter) return;
  const wanted = getWantedChampions();
  counter.textContent = `${wanted.length} şampiyon seçildi`;
}

/* ---------------------------------------------
 * Wanted Champion Update
 * --------------------------------------------- */

function updateWantedChampion(champId: string, isSelected: boolean) {
  let wanted = getWantedChampions();

  if (isSelected) {
    if (!wanted.includes(champId)) wanted.push(champId);
  } else {
    wanted = wanted.filter((id) => id !== champId);
  }

  setWantedChampions(wanted);
  updateSelectionCounter();

  // Shop'u anlık güncelle
  if (LAST_SHOP_ITEMS.length > 0) updateOverlay(LAST_SHOP_ITEMS);
}

/* ---------------------------------------------
 * Filtering (Search + Trait)
 * --------------------------------------------- */

let filterRaf = 0;

function filterChampions() {
  if (filterRaf) cancelAnimationFrame(filterRaf);

  filterRaf = requestAnimationFrame(() => {
    const searchEl = document.getElementById('champion-search') as HTMLInputElement | null;
    const traitEl = document.getElementById('trait-filter') as HTMLInputElement | null;

    const query = toLowerTR((searchEl?.value || '').trim());
    const selectedTrait = (traitEl?.value || '').trim();

    const cards = document.querySelectorAll('.champion-card');
    const costGroups = document.querySelectorAll('.cost-group');

    cards.forEach((card) => {
      const cardEl = card as HTMLElement;
      const champName = toLowerTR(cardEl.dataset.name || '');

      const matchesSearch = query === '' ? true : champName.includes(query);

      let matchesTrait = true;
      if (selectedTrait) {
        const traits = safeParseJSON<string[]>(cardEl.dataset.traits || '[]', []);
        matchesTrait = traits.includes(selectedTrait);
      }

      if (matchesSearch && matchesTrait) cardEl.classList.remove('hidden');
      else cardEl.classList.add('hidden');
    });

    costGroups.forEach((group) => {
      const visibleItems = group.querySelectorAll('.champion-card:not(.hidden)');
      if (visibleItems.length === 0) group.classList.add('hidden');
      else group.classList.remove('hidden');
    });
  });
}

/* ---------------------------------------------
 * Select/Clear All (Visible-aware)
 * --------------------------------------------- */

function selectAllChampions() {
  const cards = document.querySelectorAll('.champion-card');
  const searchBox = document.getElementById('champion-search') as HTMLInputElement | null;
  const traitFilter = document.getElementById('trait-filter') as HTMLInputElement | null;

  const isFilterActive =
    !!(searchBox && searchBox.value.trim() !== '') || !!(traitFilter && traitFilter.value !== '');

  let wanted = getWantedChampions();

  cards.forEach((card) => {
    const el = card as HTMLElement;
    if (isFilterActive && el.classList.contains('hidden')) return;

    el.classList.add('selected');
    const id = el.dataset.champion;
    if (id && !wanted.includes(id)) wanted.push(id);
  });

  setWantedChampions(wanted);
  updateSelectionCounter();

  if (LAST_SHOP_ITEMS.length > 0) updateOverlay(LAST_SHOP_ITEMS);
}

function clearAllChampions() {
  const searchBox = document.getElementById('champion-search') as HTMLInputElement | null;
  const traitFilter = document.getElementById('trait-filter') as HTMLInputElement | null;

  const isFilterActive =
    !!(searchBox && searchBox.value.trim() !== '') || !!(traitFilter && traitFilter.value !== '');

  let wanted = getWantedChampions();

  if (isFilterActive) {
    const visibleCards = document.querySelectorAll('.champion-card:not(.hidden)');
    visibleCards.forEach((card) => {
      const el = card as HTMLElement;
      el.classList.remove('selected');
      const id = el.dataset.champion;
      if (id) wanted = wanted.filter((wid) => wid !== id);
    });
  } else {
    document.querySelectorAll('.champion-card').forEach((card) => {
      (card as HTMLElement).classList.remove('selected');
    });
    wanted = [];
  }

  setWantedChampions(wanted);
  updateSelectionCounter();

  if (LAST_SHOP_ITEMS.length > 0) updateOverlay(LAST_SHOP_ITEMS);
}

/* ---------------------------------------------
 * Trait Icon Resolution
 * --------------------------------------------- */

function buildTraitIconCandidates(name: string, icon?: string): string[] {
  const lowerSafeName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const snakeSafeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const camelSafeName = name.replace(/[^a-zA-Z0-9]/g, '');

  const candidates: string[] = [];

  // Normalize icon url variants coming from data
  const addIconVariants = (url: string) => {
    if (!url) return;
    candidates.push(url);

    // If the url has weird extra suffix before .png, try to normalize it
    // e.g. something.anything.png -> something.png
    candidates.push(url.replace(/\.[a-zA-Z0-9_]+\.png$/, '.png'));

    // If it has _16_ artifact, try without it
    if (url.includes('_16_')) {
      candidates.push(url.replace('_16_', '_'));
      candidates.push(url.replace('_16_', '_').replace(/\.[a-zA-Z0-9_]+\.png$/, '.png'));
    }

    // If it is already .tft_setXX.png, also try plain .png
    candidates.push(url.replace(/\.tft_set\d+\.png$/i, '.png'));
  };

  if (icon) addIconVariants(icon);

  // Important: CDragon often uses this newer naming:
  // trait_icon_{set}_{name}.tft_set{set}.png  (directory listing shows this) :contentReference[oaicite:1]{index=1}
  const base = 'https://raw.communitydragon.org/latest/game/assets/ux/traiticons';

  for (let set = 15; set >= 1; set--) {
    // 1) snake_case
    candidates.push(
      `${base}/trait_icon_${set}_${snakeSafeName}.tft_set${set}.png`,
      `${base}/trait_icon_${set}_${snakeSafeName}.png`
    );

    // 2) lowercase (no underscores)
    candidates.push(
      `${base}/trait_icon_${set}_${lowerSafeName}.tft_set${set}.png`,
      `${base}/trait_icon_${set}_${lowerSafeName}.png`
    );

    // 3) CamelCase / original-ish
    if (camelSafeName && camelSafeName !== lowerSafeName) {
      const stripped = name.replace(/[^a-zA-Z0-9]/g, '');
      candidates.push(
        `${base}/trait_icon_${set}_${camelSafeName}.tft_set${set}.png`,
        `${base}/trait_icon_${set}_${camelSafeName}.png`,
        `${base}/trait_icon_${set}_${stripped}.tft_set${set}.png`,
        `${base}/trait_icon_${set}_${stripped}.png`
      );
    }
  }

  // Generic fallbacks (no set prefix)
  candidates.push(
    `${base}/trait_icon_${snakeSafeName}.png`,
    `${base}/trait_icon_${lowerSafeName}.png`,
    `${base}/${snakeSafeName}.png`,
    `${base}/${lowerSafeName}.png`
  );

  // Extra: some traits are "teamup_trait_..." in the directory too (optional)
  // This won't hurt, just adds a couple fallbacks.
  candidates.push(
    `${base}/teamup_trait_${snakeSafeName}.tft_set16.png`,
    `${base}/teamup_trait_${snakeSafeName}.tft_set15.png`,
    `${base}/teamup_trait_${snakeSafeName}.tft_set14.png`,
    `${base}/teamup_trait_${snakeSafeName}.tft_set13.png`
  );

  return [...new Set(candidates)].filter(Boolean);
}

function renderTraitFallback(hexIcon: HTMLElement, name: string) {
  hexIcon.textContent = name.substring(0, 1).toUpperCase();
  hexIcon.style.color = '#ffd700';
  hexIcon.style.fontSize = '14px';
  hexIcon.style.fontWeight = 'bold';
  hexIcon.style.textAlign = 'center';
  hexIcon.style.lineHeight = '24px';
}

function loadTraitIconInto(hexIcon: HTMLElement, traitName: string, icon?: string) {
  const key = normalizeTraitNameKey(traitName);

  // Pozitif cache varsa kullan
  const cached = TRAIT_ICON_RESOLVED[key];
  if (cached) {
    const img = document.createElement('img');
    img.src = cached; // cache-buster yok
    img.alt = traitName;
    img.onerror = () => {
      // Cached kırıldıysa cache'i sil ve yeniden dene
      delete TRAIT_ICON_RESOLVED[key];
      img.remove();
      loadTraitIconInto(hexIcon, traitName, icon);
    };
    hexIcon.appendChild(img);
    return;
  }

  const candidates = buildTraitIconCandidates(traitName, icon);

  const img = document.createElement('img');
  let idx = 0;

  const tryNext = () => {
    if (idx >= candidates.length) {
      // NEGATIF CACHE YOK -> sadece fallback göster
      img.remove();
      renderTraitFallback(hexIcon, traitName);
      return;
    }
    const url = candidates[idx++];
    img.src = url; // ?v=1 yok
  };

  img.onload = () => {
    // Başarılı olanı cache'le
    TRAIT_ICON_RESOLVED[key] = img.src;
  };

  img.onerror = (e) => {
    // Debug (gerekirse aç)
    // console.error('[TraitIcon] onerror', traitName, img.src, e);
    tryNext();
  };

  hexIcon.appendChild(img);
  tryNext();
}

/* ---------------------------------------------
 * Champion List Population
 * --------------------------------------------- */

async function populateChampionList() {
  const listContainer = document.getElementById('champion-list');
  if (!listContainer) return;

  listContainer.innerHTML = '<div style="color:white; text-align:center; padding:20px;">Yükleniyor...</div>';

  try {
    const champions: Champion[] = await window.overlay.getChampionData();

    // Cache champions + collect traits
    const allTraitsMap = new Map<string, string>();
    champions.forEach((c) => {
      CHAMPION_DATA_CACHE[c.id] = c;

      if (Array.isArray(c.traits)) {
        c.traits.forEach((t) => {
          if (!t?.name) return;
          const k = normalizeTraitNameKey(t.name);
          if (!allTraitsMap.has(k) || (t.icon && !allTraitsMap.get(k))) {
            allTraitsMap.set(k, t.icon || '');
          }
        });
      }
    });

    // Trait Grid
    const traitGrid = document.getElementById('trait-grid');
    const hiddenInput = document.getElementById('trait-filter') as HTMLInputElement | null;
    const clearTraitsBtn = document.getElementById('clear-traits-header-btn');

    const selectTrait = (value: string) => {
      if (!hiddenInput || !traitGrid) return;

      if (hiddenInput.value === value) hiddenInput.value = '';
      else hiddenInput.value = value;

      const items = traitGrid.querySelectorAll('.trait-item');
      const hasSelection = !!hiddenInput.value;

      items.forEach((item) => {
        const itemVal = (item as HTMLElement).dataset.value || '';
        if (itemVal === hiddenInput.value) {
          item.classList.add('active');
          item.classList.remove('inactive');
        } else {
          item.classList.remove('active');
          if (hasSelection) item.classList.add('inactive');
          else item.classList.remove('inactive');
        }
      });

      filterChampions();
    };

    if (clearTraitsBtn) {
      // remove old listeners by clone
      const newBtn = clearTraitsBtn.cloneNode(true) as HTMLElement;
      clearTraitsBtn.parentNode?.replaceChild(newBtn, clearTraitsBtn);

      newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hiddenInput) hiddenInput.value = '';

        traitGrid?.querySelectorAll('.trait-item').forEach((item) => {
          item.classList.remove('active');
          item.classList.remove('inactive');
        });

        filterChampions();
      });
    }

    if (traitGrid) {
      traitGrid.innerHTML = '';
      const sortedTraits = Array.from(allTraitsMap.keys()).sort((a, b) => a.localeCompare(b));

      sortedTraits.forEach((name) => {
        const icon = allTraitsMap.get(name);

        const item = document.createElement('div');
        item.className = 'trait-item';
        item.dataset.value = name;

        const hexIcon = document.createElement('div');
        hexIcon.className = 'trait-icon-hex';

        loadTraitIconInto(hexIcon, name, icon || undefined);

        item.appendChild(hexIcon);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'trait-name';
        nameSpan.textContent = name;
        item.appendChild(nameSpan);

        item.onclick = (e) => {
          e.stopPropagation();
          selectTrait(name);
        };

        traitGrid.appendChild(item);
      });
    }

    // Build champion list grouped by cost
    listContainer.innerHTML = '';

    const championsByCost: Record<string, Champion[]> = {};
    champions.forEach((champ) => {
      const costKey = String(champ.cost);
      if (!championsByCost[costKey]) championsByCost[costKey] = [];
      championsByCost[costKey].push(champ);
    });

    const sortedCosts = Object.keys(championsByCost).sort((a, b) => Number(a) - Number(b));

    const wantedChampions = getWantedChampions();

    sortedCosts.forEach((cost) => {
      const costGroup = document.createElement('div');
      costGroup.className = 'cost-group';
      costGroup.dataset.cost = cost;

      const title = document.createElement('h4');
      let color = '#fff';

      switch (cost) {
        case '1':
          color = '#aeaca9';
          title.textContent = '1 ALTIN';
          break;
        case '2':
          color = '#22c55e';
          title.textContent = '2 ALTIN';
          break;
        case '3':
          color = '#0090ff';
          title.textContent = '3 ALTIN';
          break;
        case '4':
          color = '#a855f7';
          title.textContent = '4 ALTIN';
          break;
        case '5':
          color = '#e7ac0c';
          title.textContent = '5+ ALTIN';
          break;
        case '11':
          color = '#ff0000';
          title.textContent = '11 ALTIN';
          break;
        default:
          title.textContent = `${cost} ALTIN`;
      }

      title.style.color = color;
      title.style.borderColor = color;

      costGroup.appendChild(title);

      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'cost-group-items';

      // sort by id stable
      championsByCost[cost].sort((a, b) => a.id.localeCompare(b.id));

      championsByCost[cost].forEach((champ) => {
        const card = document.createElement('div');
        card.className = 'champion-card';
        card.dataset.champion = champ.id;

        const searchName = normalizeChampionNameForSearch(champ);
        card.dataset.name = searchName;

        const traitNames: string[] = [];
        if (Array.isArray(champ.traits)) {
          champ.traits.forEach((t) => {
            if (t?.name) traitNames.push(t.name);
          });
        }
        card.dataset.traits = JSON.stringify(traitNames);

        // selected state from storage
        if (wantedChampions.includes(champ.id)) card.classList.add('selected');

        const img = document.createElement('img');
        img.src = champ.image;
        img.alt = champ.id;

        img.onerror = () => {
          img.onerror = null;

          const fallbackUrl1 = champ.image.endsWith('.png') ? champ.image.replace('.png', '.jpg') : champ.image;
          if (fallbackUrl1 !== champ.image) {
            img.onerror = () => {
              img.onerror = null;
              img.src =
                'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/-1.png';
            };
            img.src = fallbackUrl1;
          } else {
            img.src =
              'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/-1.png';
          }
        };

        const nameLabel = document.createElement('div');
        nameLabel.className = 'champ-name';
        nameLabel.textContent = normalizeChampionNameForSearch(champ);

        card.appendChild(img);
        card.appendChild(nameLabel);

        card.addEventListener('click', (e) => {
          e.stopPropagation();
          const isSelected = card.classList.toggle('selected');
          updateWantedChampion(champ.id, isSelected);
        });

        itemsContainer.appendChild(card);
      });

      costGroup.appendChild(itemsContainer);
      listContainer.appendChild(costGroup);
    });

    updateSelectionCounter();
  } catch (error) {
    console.error('Şampiyon listesi yüklenemedi:', error);
    listContainer.innerHTML = '<div style="color:red; text-align:center;">Liste yüklenemedi!</div>';
  }
}

/* ---------------------------------------------
 * Overlay & Shop Logic
 * --------------------------------------------- */

function updateOverlay(items: ShopItem[]) {
  LAST_SHOP_ITEMS = items;

  const overlayContainer = document.getElementById('shop-overlay');
  if (!overlayContainer) return;

  overlayContainer.innerHTML = '';

  const wantedChampions = getWantedChampions();

  // normalize items by slot number
  const bySlotNum = new Map<number, ShopItem>();
  items.forEach((it) => {
    const n = getSlotNum(it.slot);
    if (n != null) bySlotNum.set(n, it);
  });

  [1, 2, 3, 4, 5].forEach((slotNum) => {
    const item = bySlotNum.get(slotNum);

    const frame = document.createElement('div');
    frame.className = 'shop-card-frame';

    if (isSold(item)) {
      overlayContainer.appendChild(frame);
      return;
    }

    const cost = getCostForShopItem(item);
    if (cost != null) frame.classList.add(`tier-${cost}`);

    const champId = item.champion || '';
    let isWanted = champId ? wantedChampions.includes(champId) : false;

    // optional fallback partial match
    if (!isWanted && champId) {
      const baseName = champId.replace(/^TFT\d+_/, '');
      isWanted = wantedChampions.some((w) => w.includes(baseName));
    }

    if (isWanted) {
      const indicator = document.createElement('div');
      indicator.className = 'needed-indicator';
      frame.appendChild(indicator);
      frame.classList.add('wanted-glow');
    }

    overlayContainer.appendChild(frame);
  });
}

function clearOverlay() {
  const overlayContainer = document.getElementById('shop-overlay');
  if (overlayContainer) overlayContainer.innerHTML = '';

  LAST_SHOP_ITEMS = [];

  // Overlay temizlendiğinde mouse click-through olsun
  window.overlay?.setMousePassthrough(true);
}

/* ---------------------------------------------
 * Event Listeners Setup
 * --------------------------------------------- */

function setupGepListeners() {
  if (!window.gep) return;

  window.gep.onMessage((message: string, ...args: unknown[]) => {
    if (message === 'TFT-SHOP-UPDATE') {
      const shopItems = (args[0] as ShopItem[]) || [];
      updateOverlay(shopItems);
      return;
    }

    if (
      message === 'TFT-SHOP-UPDATE-EMPTY' ||
      message === 'TFT-GAME-EXIT' ||
      message === 'game-exit'
    ) {
      clearOverlay();
      return;
    }

    if (message === 'console-message') {
      // Main process log
      if (args[1] === 'TFT-SHOP-UPDATE') {
        const items = (args[2] as ShopItem[]) || [];
        updateOverlay(items);
      }
    }
  });
}

function setupSettingsPassthrough() {
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');

  if (!settingsBtn || !settingsPanel) return;

  const setPassthrough = (pass: boolean) => window.overlay?.setMousePassthrough(pass);

  let isInteractive = false;
  let leaveTimeout: number | null = null;
  let lastMouseX = 0;
  let lastMouseY = 0;

  const computeInteractive = () => {
    if (lastMouseX === 0 && lastMouseY === 0) return;

    const el = document.elementFromPoint(lastMouseX, lastMouseY);
    const panelActive = settingsPanel.classList.contains('active');

    const shouldBeInteractive =
      !!el && (settingsBtn.contains(el) || (panelActive && settingsPanel.contains(el)));

    if (shouldBeInteractive === isInteractive) {
      if (shouldBeInteractive && leaveTimeout != null) {
        window.clearTimeout(leaveTimeout);
        leaveTimeout = null;
      }
      return;
    }

    if (shouldBeInteractive) {
      if (leaveTimeout != null) {
        window.clearTimeout(leaveTimeout);
        leaveTimeout = null;
      }
      isInteractive = true;
      setPassthrough(false);
    } else {
      if (leaveTimeout != null) window.clearTimeout(leaveTimeout);
      leaveTimeout = window.setTimeout(() => {
        isInteractive = false;
        setPassthrough(true);
        leaveTimeout = null;
      }, 100);
    }
  };

  const openSettings = () => {
    settingsPanel.classList.add('active');
    computeInteractive();
  };

  const closeSettings = () => {
    settingsPanel.classList.remove('active');
    computeInteractive();
  };

  window.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    computeInteractive();
  });

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (settingsPanel.classList.contains('active')) closeSettings();
    else openSettings();
  });

  document.addEventListener('click', (e) => {
    if (
      settingsPanel.classList.contains('active') &&
      !settingsPanel.contains(e.target as Node) &&
      !settingsBtn.contains(e.target as Node)
    ) {
      closeSettings();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsPanel.classList.contains('active')) closeSettings();
  });
}

function setupSearchAndButtons() {
  const searchBox = document.getElementById('champion-search') as HTMLInputElement | null;
  if (searchBox) {
    searchBox.addEventListener('input', () => filterChampions());
    searchBox.addEventListener('click', (e) => e.stopPropagation());
  }

  document.getElementById('select-all-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    selectAllChampions();
  });

  document.getElementById('clear-all-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearAllChampions();
  });
}

/* ---------------------------------------------
 * Boot
 * --------------------------------------------- */

setupGepListeners();

document.addEventListener('DOMContentLoaded', () => {
  populateChampionList();
  setupSettingsPassthrough();
  setupSearchAndButtons();
});



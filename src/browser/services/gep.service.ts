import { app as electronApp } from 'electron';
import { overwolf } from '@overwolf/ow-electron' // TODO: wil be @overwolf/ow-electron
import EventEmitter from 'events';
import { getChampionTier } from '../tft-data';

const app = electronApp as overwolf.OverwolfApp;

/**
 * Service used to register for Game Events,
 * receive games events, and then send them to a window for visual feedback
 *
 */
export class GameEventsService extends EventEmitter {
  private gepApi: overwolf.packages.OverwolfGameEventPackage;
  private activeGame = 0;
  private gepGamesId: number[] = [];
  private shopState: Record<string, string> = {}; // Cache for shop items
  private isConnectedToGame = false; // Flag to stop periodic checking
  private lastShopData = ''; // Cache to prevent duplicate updates

  constructor() {
    super();
    this.registerOverwolfPackageManager();
  }


  /**
   *  for gep supported games goto:
   *  https://overwolf.github.io/api/electron/game-events/
   *   */
  public registerGames(gepGamesId: number[]) {
    this.emit('log', `register to game events for `, gepGamesId);
    this.gepGamesId = gepGamesId;
  }

  /**
   *
   */
  public async setRequiredFeaturesForAllSupportedGames() {
    await Promise.all(this.gepGamesId.map(async (gameId) => {
      this.emit('log', `set-required-feature for: ${gameId}`);
      // TFT supported features: match_info, roster, store, board, game_info
      await this.gepApi.setRequiredFeatures(gameId, ['match_info', 'store', 'roster', 'game_info', 'board', 'live_client_data']);
    }));
  }

  /**
   *
   */
  public async getInfoForActiveGame(): Promise<any> {
    if (this.activeGame == 0) {
      return 'getInfo error - no active game';
    }

    return await this.gepApi.getInfo(this.activeGame);
  }

  /**
   * Register the Overwolf Package Manager events
   */
  private registerOverwolfPackageManager() {
    // Once a package is loaded
    app.overwolf.packages.on('ready', (e, packageName, version) => {
      // If this is the GEP package (packageName serves as a UID)
      if (packageName !== 'gep') {
        return;
      }

      this.emit('log', `gep package is ready: ${version}`);

      // Prepare for Game Event handling
      this.onGameEventsPackageReady();

      this.emit('ready');
    });
  }

  /**
   * Register listeners for the GEP Package once it is ready
   *
   * @param {overwolf.packages.OverwolfGameEventPackage} gep The GEP Package instance
   */
  private async onGameEventsPackageReady() {
    // Save package into private variable for later access
    this.gepApi = app.overwolf.packages.gep;

    // Remove all existing listeners to ensure a clean slate.
    // NOTE: If you have other classes listening on gep - they'll lose their
    // bindings.
    this.gepApi.removeAllListeners();

    // If a game is detected by the package
    // To check if the game is running in elevated mode, use `gameInfo.isElevate`
    this.gepApi.on('game-detected', (e, gameId, name, gameInfo) => {
      // Tüm algılanan oyunları logla
      this.emit('log', 'gep: game-detected (all)', gameId, name, gameInfo.pid);

      // If the game isn't in our tracking list
      if (!this.gepGamesId.includes(gameId)) {
        // Stops the GEP Package from connecting to the game
        this.emit('log', 'gep: skip game-detected (not in list)', gameId, name, gameInfo.pid);
        return;
      }

      /// if (gameInfo.isElevated) {
      //   // Show message to User?
      //   return;
      // }

      this.emit('log', 'gep: register game-detected', gameId, name, gameInfo);
      e.enable();
      this.activeGame = gameId;
      this.isConnectedToGame = true; // Stop periodic checking

      // in order to start receiving event/info
      // setRequiredFeatures should be set
    });

    // undocumented (will add it fir next version) event to track game-exit
    // from the gep api
    //@ts-ignore
    this.gepApi.on('game-exit', (e, gameId, processName, pid) => {
      console.log('gep game exit', gameId, processName, pid);
      this.emit('log', 'game-exit', gameId, processName, pid);

      // Reset state when game exits
      this.activeGame = 0;
      this.isConnectedToGame = false;
      this.lastShopData = '';

      // Emit event to clear overlay
      this.emit('log', 'TFT-GAME-EXIT');
    });

    // If a game is detected running in elevated mode
    // **Note** - This fires AFTER `game-detected`
    this.gepApi.on('elevated-privileges-required', (e, gameId, ...args) => {
      this.emit('log',
        'elevated-privileges-required',
        gameId,
        ...args
      );

      // TODO Handle case of Game running in elevated mode (meaning that the app also needs to run in elevated mode in order to detect events)
    });

    // When a new Info Update is fired
    this.gepApi.on('new-info-update', (e, gameId, info) => {
      this.emit('log', 'info-update', gameId, info);
      this.handleTftStoreUpdate(info);
    });

    // When a new Game Event is fired
    this.gepApi.on('new-game-event', (e, gameId, ...args) => {
      this.emit('log', 'new-event', gameId, ...args);
    });

    // Check initial info just in case we missed updates or connected late
    // Also handles the case where app is opened while game is already running
    this.checkForExistingGame();

    // If GEP encounters an error
    this.gepApi.on('error', (e, gameId, error, ...args) => {
      this.emit('log', 'gep-error', gameId, error, ...args);

      this.activeGame = 0;
    });
  }

  /**
   * Check if a game is already running and fetch current shop state
   */
  private async checkForExistingGame() {
    // If already connected via game-detected event, don't check again
    if (this.isConnectedToGame) {
      this.emit('log', 'Already connected to game, skipping periodic check');
      return;
    }

    // Wait a bit for GEP to initialize
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Try to set required features for all registered games
    try {
      await this.setRequiredFeaturesForAllSupportedGames();
      this.emit('log', 'Auto-set required features on startup');
    } catch (e) {
      this.emit('log', 'Failed to auto-set features', e);
    }

    // Check for each registered game
    let gameFound = false;
    for (const gameId of this.gepGamesId) {
      try {
        const info = await this.gepApi.getInfo(gameId);
        if (info && info.res) {
          this.emit('log', 'Found existing game data', gameId, info.res);
          this.activeGame = gameId;
          this.isConnectedToGame = true;
          gameFound = true;

          // Check if there's store data in the current info
          if (info.res.store && info.res.store.shop_pieces) {
            this.emit('log', 'Found existing shop data');
            // Manually trigger store update
            this.handleTftStoreUpdate({
              feature: 'store',
              key: 'shop_pieces',
              value: info.res.store.shop_pieces
            });
          }
        }
      } catch (e) {
        // Game not running or no data, that's OK
        this.emit('log', 'No existing game found for', gameId);
      }
    }

    // If no game found and not connected, keep checking periodically
    if (!gameFound && !this.isConnectedToGame) {
      this.emit('log', 'No game found, will retry in 5 seconds...');
      setTimeout(() => this.checkForExistingGame(), 5000);
    }
  }

  private handleTftStoreUpdate(info: any) {
    // Log for debugging
    if (info.feature === 'store') {
      console.log('TFT Store Update:', JSON.stringify(info));

      // Check if this is shop_pieces (the actual shop data)
      if (info.key === 'shop_pieces' && typeof info.value === 'string') {
        // Check if data actually changed to prevent duplicate updates
        if (this.lastShopData === info.value) {
          return; // Same data, skip update
        }
        this.lastShopData = info.value;

        try {
          // Parse the JSON string
          const shopData = JSON.parse(info.value);
          const storeItems = [];

          // shopData has slot_1, slot_2, etc. with {name: "TFT16_Jhin"}
          for (const [slotKey, slotData] of Object.entries(shopData)) {
            if (slotData && typeof slotData === 'object' && 'name' in slotData) {
              const championName = (slotData as any).name;

              // Skip sold slots
              if (championName === 'Sold' || championName === '' || !championName) {
                storeItems.push({
                  slot: slotKey,
                  champion: 'Sold',
                  tier: 'sold'
                });
                continue;
              }

              const tier = getChampionTier(championName);
              storeItems.push({
                slot: slotKey,
                champion: championName,
                tier: tier
              });
            }
          }

          // Emit the shop update
          if (storeItems.length > 0) {
            this.emit('log', 'TFT-SHOP-UPDATE', storeItems);
          } else {
            this.emit('log', 'TFT-SHOP-UPDATE-EMPTY', 'No champions in shop');
          }
        } catch (e) {
          console.error('Error parsing shop_pieces:', e);
          this.emit('log', 'ERROR-PARSING-SHOP', e.toString());
        }
      }
    }
  }
}


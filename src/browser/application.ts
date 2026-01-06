import { GameInfo, GameLaunchEvent } from '@overwolf/ow-electron-packages-types';
import { MainWindowController } from './controllers/main-window.controller';
import { OverlayService } from './services/overlay.service';
import { kGameIds } from "@overwolf/ow-electron-packages-types/game-list";
import { kGepSupportedGameIds } from '@overwolf/ow-electron-packages-types/gep-supported-games';
import { GameEventsService } from './services/gep.service';

export class Application {
  /**
   *
   */
  constructor(
    private readonly overlayService: OverlayService,
    private readonly gepService: GameEventsService,
    private readonly mainWindowController: MainWindowController) {

    overlayService.on('ready', this.onOverlayServiceReady.bind(this));

    overlayService.on('injection-decision-handling', (
      event: GameLaunchEvent,
      gameInfo: GameInfo
    ) => {
      // Always inject because we tell it which games we want in
      // onOverlayServiceReady
      event.inject();
    })

    // GEP ready olduğunda feature'ları set et
    gepService.on('ready', async () => {
      await gepService.setRequiredFeaturesForAllSupportedGames();
    });

    // for gep supported games goto:
    // https://overwolf.github.io/api/electron/game-events/
    // TFT, LOL Launcher (10902) içinde çalıştığı için onu da ekliyoruz
    gepService.registerGames([
      kGepSupportedGameIds.TeamfightTactics, // 21570
      10902, // LOL Launcher - TFT buradan geliyor
      //kGepSupportedGameIds.DiabloIV,
      //kGepSupportedGameIds.RocketLeague,
    ]);
  }

  /**
   *
   */
  public run() {
    this.initialize();
  }

  /**
   *
   */
  private initialize() {
    const showDevTools = true;
    this.mainWindowController.createAndShow(showDevTools);
  }

  /**
   *
   */
  private onOverlayServiceReady() {
    // Which games to support overlay for
    this.overlayService.registerToGames([
      kGameIds.LeagueofLegends,
      kGameIds.TeamfightTactics,
      kGameIds.RocketLeague,
      kGameIds.DiabloIV
    ]);
  }
}

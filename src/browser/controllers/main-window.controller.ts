import { app as electronApp, ipcMain, BrowserWindow } from 'electron';
import { GameEventsService } from '../services/gep.service';
import path from 'path';
import { DemoOSRWindowController } from './demo-osr-window.controller';
import { OverlayService } from '../services/overlay.service';
import { overwolf } from '@overwolf/ow-electron';
import { OverlayHotkeysService } from '../services/overlay-hotkeys.service';
import { ExclusiveHotKeyMode, OverlayInputService } from '../services/overlay-input.service';

const owElectronApp = electronApp as overwolf.OverwolfApp;

/**
 *
 */
export class MainWindowController {
  private browserWindow: BrowserWindow = null;

  /**
   *
   */
  constructor(
    private readonly gepService: GameEventsService,
    private readonly overlayService: OverlayService,
    private readonly createDemoOsrWinController: () => DemoOSRWindowController,
    private readonly overlayHotkeysService: OverlayHotkeysService,
    private readonly overlayInputService: OverlayInputService
  ) {
    this.registerToIpc();

    gepService.on('log', this.printLogMessage.bind(this));
    overlayService.on('log', this.printLogMessage.bind(this));

    overlayHotkeysService.on('log', this.printLogMessage.bind(this));

    owElectronApp.overwolf.packages.on('crashed', (e, ...args) => {
      this.printLogMessage('package crashed', ...args);
      // ow-electron package manager crashed (will be auto relaunch)
      // e.preventDefault();
      // calling `e.preventDefault();` will stop the GEP Package from
      // automatically re-launching
    });

    owElectronApp.overwolf.packages.on(
      'failed-to-initialize',
      this.logPackageManagerErrors.bind(this)
    );
  }

  /**
   *
   */
  public printLogMessage(message: String, ...args: any[]) {
    if (this.browserWindow?.isDestroyed() ?? true) {
      return;
    }
    this.browserWindow?.webContents?.send('console-message', message, ...args);
  }

  //----------------------------------------------------------------------------
  private logPackageManagerErrors(e, packageName, ...args: any[]) {
    this.printLogMessage(
      'Overwolf Package Manager error!',
      packageName,
      ...args
    );
  }

  /**
   *
   */
  public createAndShow(showDevTools: boolean) {
    this.browserWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      show: true,
      frame: false,
      transparent: true,
      fullscreen: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        // NOTE: nodeIntegration and contextIsolation are only required for this
        // specific demo app, they are not a neceassry requirement for any other
        // ow-electron applications
        nodeIntegration: true,
        contextIsolation: true,
        devTools: showDevTools,
        // relative to root folder of the project
        preload: path.join(__dirname, '../preload/preload.js'),
      },
    });
    this.browserWindow.setAlwaysOnTop(true, "screen-saver");
    this.browserWindow.setIgnoreMouseEvents(true, { forward: true });

    this.browserWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Listen for game focus events
    this.setupGameFocusListeners();
  }

  /**
   * Setup listeners for game focus/blur to show/hide overlay
   */
  private setupGameFocusListeners() {
    // Listen for game focus events from overlay service
    this.overlayService.on('game-focused', () => {
      this.printLogMessage('Game focused - showing overlay');
      if (this.browserWindow && !this.browserWindow.isDestroyed()) {
        this.browserWindow.show();
      }
    });

    this.overlayService.on('game-blurred', () => {
      this.printLogMessage('Game blurred - hiding overlay');
      if (this.browserWindow && !this.browserWindow.isDestroyed()) {
        this.browserWindow.hide();
      }
    });

    // Listen to game-exit event to hide overlay and clear shop
    this.gepService.on('log', (message, ...args) => {
      if (message === 'TFT-GAME-EXIT' || message === 'game-exit') {
        this.printLogMessage('Game exited - hiding overlay and clearing shop');
        if (this.browserWindow && !this.browserWindow.isDestroyed()) {
          this.browserWindow.hide();
          // Send message to renderer to clear shop
          this.browserWindow?.webContents?.send('console-message', 'TFT-SHOP-UPDATE-EMPTY', 'Game closed');
        }
      }
    });
  }

  /**
   *
   */
  private registerToIpc() {

    // Clean handlers
  }

  /**
   *
   */
  private async createOSRDemoWindow(): Promise<void> {
    const controller = this.createDemoOsrWinController();

    const showDevTools = true;
    await controller.createAndShow(showDevTools);

    controller.overlayBrowserWindow.window.on('closed', () => {
      this.printLogMessage('osr window closed');
    });
  }
}

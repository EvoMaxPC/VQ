/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MOTOR RPG 2D CENITAL DE PIXELVERSE:
 * - La Gran Isla de los 70 (10 zonas interconectadas + arquitectura accesible)
 * - Movimiento y animaciones pixel-art en 4 direcciones, carrera e interacción
 * - Interiores accesibles, cámara oculta tras pared falsa, gruta oscura tras cascada
 * - Expansión jugable inter-islas hacia «Isla Neón 1980s: Muelle de las Vigas Rojas»
 * - Inventario funcional [I], Diario de Misiones [Q], Lámpara [L], Escáner [R] y Códice [C]
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { ArchitectCodexModal } from '../memories/ArchitectCodexModal';
import { MUSEUM_1970S_EXHIBITS } from '../memories/historicalCatalog';
import { MuseumExhibitIllustration } from '../memories/MuseumExhibitIllustration';
import {
  BREAKOUT_UNLOCK_SCORE,
  PixelverseProgressState,
  SPACE_INVADERS_UNLOCK_SCORE,
} from '../memories/progressionState';
import {
  loadKeybindings,
  isActionPressed,
  KeybindingsMap,
  isEditableTarget,
} from '../controls/keybindings';
import { PowersMenuModal } from '../rpg/PowersMenuModal';
import {
  BROKEN_RELAY_MECHANISM,
  COASTAL_SUBTERRANEAN_TUNNELS,
  DK_CABINET_80S_INTERACT,
  evaluateTimeMachineStatus,
  FacingDirection,
  GUARDIAN_CREATURES,
  HARBOR_80S_FERRY,
  ISLAND_70S_BUILDINGS,
  ISLAND_ANOMALY_PORTALS,
  ISLAND_NORTH_CAVE_ENTRANCES,
  ISLAND_WOODEN_SIGNS,
  isBlockedByExteriorBuilding,
  isWalkableInSubArea,
  LABYRINTH_1976_ENTRANCE,
  LABYRINTH_RGB_PILLARS,
  LABYRINTH_SECRET_DOOR,
  MUSEUM_PEDESTAL_SPOTS,
  MUSEUM_VECTOR_CONSOLE,
  RPG_CHESTS,
  RPG_EXAMINABLES,
  RPG_ITEMS,
  RPG_QUESTS,
  RPG_SUBAREA_NPCS,
  RpgAreaId,
  SUB_AREAS,
  TIME_MACHINE_CONSOLE,
  VILLAGE_SAVE_TERMINAL,
  WATERFALL_SECRET_ENTRANCE,
} from '../rpg/rpgContent';
import { RpgInventoryModal, RpgQuestsModal } from '../rpg/rpgModals';
import type { AvatarAppearance } from '../avatar/avatarOptions';
import { CastleBossCombatState, renderSubAreaFrame } from '../rpg/subAreaRenderer';
import {
  DISTANT_DECADE_VISTAS,
  ISLAND_DIAMONDS,
  ISLAND_ECHOES,
  ISLAND_KEY_COORDS,
  NORTH_ARCADE_LAYOUT,
  ISLAND_NPCS,
  ISLAND_SWITCHES,
  ISLAND_WALKABLE_RECTS,
  ISLAND_WORLD_H,
  ISLAND_WORLD_TOP,
  ISLAND_WORLD_W,
  ISLAND_ZONES,
  IslandZoneId,
  isPointWalkableOnIsland,
  isBlockedByIslandRouteRail,
  isBlockedByVolcanicGuardGate,
  isBreakoutLegendStoneBlocked,
  isVolcanicArcadeCabinetBlocked,
  isNorthArcadeCabinetBlocked,
  isSouthShortcutUnlocked,
  VOLCANIC_ARCADE_LAYOUT,
  VOLCANIC_GUARD_ID,
  ISLAND_PIER_SPEC,
  ISLAND_SAND_MOUNDS,
} from './island70sData';
import {
  IslandPickupBurst,
  renderIsland70sFrame,
} from './island70sRenderer';

const ISLAND_CAMERA_TOP = ISLAND_WORLD_TOP - 48;

export type Island70sArrivalMode =
  | 'awakening'
  | 'standard'
  | 'pong-board'
  | 'glitch-trail-cleared'
  | 'invaders-ship'
  | 'return-breakout'
  | 'return-80s';

export interface Origin70sIslandProps {
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  appearance: AvatarAppearance;
  allUnlocked: boolean;
  arrivalMode: Island70sArrivalMode;
  progressState: PixelverseProgressState;
  onEnterPong: () => void;
  onEnterBreakout: () => void;
  onEnterBreakoutFromNorth?: () => void;
  onEnterGlitchTrail: () => void;
  onEnterSpaceInvaders: () => void;
  onEnterDonkeyKong: () => void;
  onEnterAsteroids?: () => void;
  onEnterSeaWolf?: () => void;
  onEnterTank?: () => void;
  onEnterLunarLander?: () => void;
  onEnterNightDriver?: () => void;
  onEnterGalaxian?: () => void;
  onSetRpgFlag?: <K extends keyof import('../memories/progressionState').RpgExplorationState>(
    key: K,
    val: import('../memories/progressionState').RpgExplorationState[K]
  ) => void;
  onRestoreCuatroCaminos?: () => void;
  onCollectDiamond: (diamondId: string) => void;
  onVisitZone: (zoneId: IslandZoneId) => void;
  onDiscoverEcho: (echoId: string) => void;
  onActivateSwitch: (switchId: string) => void;
  onTalkNpc: (npcId: string) => void;
  onSavePosition: (x: number, y: number) => void;
  onSave80sPosition: (x: number, y: number) => void;
  onManualSave: (x: number, y: number) => void;
  onManualSave80s?: (x: number, y: number) => void;
  onOpenChest: (chestId: string, rewardItemIds: string[]) => void;
  onDiscoverSecret: (secretId: string) => void;
  onDiscoverClue: (clueId: string) => void;
  onSolveCase: (caseId: string, rewardItemIds?: string[]) => void;
  onCalmCreature: (creatureId: string) => void;
  onInspectExhibit: (exhibitId: string) => void;
  onSolvePuzzle: (puzzleId: string, rewardItemIds?: string[]) => void;
  onRepairMechanism: (mechanismId: string, alsoSwitches?: string[]) => void;
  onUpdateQuest: (
    questId: string,
    status: 'active' | 'completed',
    rewardItemIds?: string[]
  ) => void;
  onEquipCosmetic: (cosmeticId: string | null) => void;
  onToggleLantern: (forceValue?: boolean) => void;
  onUpdatePowerEnergy?: (
    key: 'flightFuel' | 'lanternBattery' | 'scannerEnergy' | 'welderEnergy',
    amount: number
  ) => void;
  onPurchasePowerUpgrade?: (upgradeId: string, costDiamonds: number) => void;
  onRechargePowers?: () => void;
  onArrivalSequenceFinished?: () => void;
  isGbGreenMode?: boolean;
  onToggleGbGreenMode?: () => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
  onOpenLevelSelector?: () => void;
  externalModalOpen?: boolean;
  manualSaveTriggerRef?: React.MutableRefObject<(() => string) | null>;
}

interface InteractivePromptTarget {
  kind:
    | 'save-terminal'
    | 'wooden-sign'
    | 'rock-tunnel'
    | 'anomaly-portal'
    | 'time-machine'
    | 'pong-cabinet'
    | 'pong-hoverboard-ride'
    | 'glitch-portal'
    | 'invaders-cabinet'
    | 'dk-cabinet-80s'
    | 'breakout-cabinet'
    | 'labyrinth-hatch'
    | 'labyrinth-secret-door'
    | 'rgb-pillar'
    | 'museum-pedestal'
    | 'vector-console'
    | 'guardian-creature'
    | 'astrolabe'
    | 'npc'
    | 'sub-npc'
    | 'echo'
    | 'switch'
    | 'vista'
    | 'building-door'
    | 'cave-entrance'
    | 'waterfall-entrance'
    | 'ferry-80s'
    | 'broken-relay'
    | 'chest'
    | 'examinable'
    | 'sub-exit'
    | 'north-arcade'
    | 'volcanic-arcade'
    | 'breakout-stone'
    | 'castle-entrance'
    | 'castle-seal'
    | 'castle-shortcut-door'
    | 'castle-valve'
    | 'castle-lectern'
    | 'castle-tower-lever'
    | 'castle-boss-hit'
    | 'castle-boss-conduit'
    | 'castle-ship-launch'
    | 'night-driver-cabinet';
  id: string;
  label: string;
  actionLabel: string;
  x: number;
  y: number;
  accentHex: string;
}

interface ActiveDialogModal {
  category: string;
  title: string;
  subtitle?: string;
  paragraphs: string[];
  hint?: string;
  accentHex: string;
  museumExhibit?: (typeof MUSEUM_1970S_EXHIBITS)[number];
  disabledAction?: string;
  primaryAction?: {
    label: string;
    onSelect: () => void;
  };
}

const ANIMATION_STATES: Record<FacingDirection, number[]> = {
  down: [0, 1, 2, 1],
  up: [0, 1, 2, 1],
  left: [0, 1, 2, 1],
  right: [0, 1, 2, 1],
};

const TOTAL_70S_DIAMONDS = 9; // 5 en la Gran Isla + 4 en El Sendero del Glitch Perdido

const PONG_FLIGHT_FUEL_PER_SECOND = 8;
const PONG_FLIGHT_FUEL_EFFICIENT_PER_SECOND = 5;
const PONG_BOARD_ROUTE_DURATION = 3.8;
const PONG_BOARD_MIN_FUEL = 1;
const PONG_LANDING_DURATION = 2.6;
const PONG_BOARD_DEPARTURE_DURATION = 1.35;

function getPongFlightFuelRate(progress: PixelverseProgressState): number {
  return progress.rpg.powersState?.upgradesPurchased?.includes(
    'upg-flight-efficiency-1'
  )
    ? PONG_FLIGHT_FUEL_EFFICIENT_PER_SECOND
    : PONG_FLIGHT_FUEL_PER_SECOND;
}

type IslandPowerId = 'pong-hoverboard' | 'shifting-blade' | 'orbital-dash' | 'sonar-pulse';

function isIslandPowerUnlocked(power: IslandPowerId, progress: PixelverseProgressState, allUnlocked: boolean): boolean {
  if (allUnlocked) return true;
  const items = progress.rpg.inventoryItems;
  switch (power) {
    case 'pong-hoverboard':
      return progress.island70s.abilitiesUnlocked.includes('pong-hoverboard');
    case 'shifting-blade':
      return items.includes('item-espada-cambiante');
    case 'orbital-dash':
      return items.includes('item-modulo-orbital');
    case 'sonar-pulse':
      return items.includes('item-sonar-profundidad');
  }
}

export function Origin70sIsland({
  skinColor,
  hairColor,
  shirtColor,
  appearance,
  allUnlocked,
  arrivalMode,
  progressState,
  onEnterPong,
  onEnterBreakout,
  onEnterBreakoutFromNorth,
  onEnterGlitchTrail,
  onEnterSpaceInvaders,
  onEnterDonkeyKong,
  onEnterAsteroids,
  onEnterSeaWolf,
  onEnterTank,
  onEnterLunarLander,
  onEnterNightDriver,
  onEnterGalaxian,
  onSetRpgFlag,
  onRestoreCuatroCaminos,
  onCollectDiamond,
  onVisitZone,
  onDiscoverEcho,
  onActivateSwitch,
  onTalkNpc,
  onSavePosition,
  onSave80sPosition,
  onManualSave,
  onManualSave80s,
  onOpenChest,
  onDiscoverSecret,
  onDiscoverClue,
  onSolveCase,
  onCalmCreature,
  onInspectExhibit,
  onSolvePuzzle,
  onRepairMechanism,
  onUpdateQuest,
  onEquipCosmetic,
  onToggleLantern,
  onUpdatePowerEnergy,
  onPurchasePowerUpgrade,
  onRechargePowers,
  onArrivalSequenceFinished,
  isGbGreenMode,
  onToggleGbGreenMode,
  isAudioMuted,
  onToggleAudio,
  onOpenLevelSelector,
  externalModalOpen,
  manualSaveTriggerRef,
}: Origin70sIslandProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pongRestored = Boolean(progressState.games['pong']?.memoryUnlocked) || allUnlocked;
  const breakoutRestored =
    Boolean(progressState.games['breakout']?.memoryUnlocked) || allUnlocked;
  const glitchTrailCleared =
    Boolean(progressState.island70s.glitchTrailCompleted) ||
    Boolean(progressState.games['glitch-trail']?.completed) ||
    allUnlocked;
  const invadersRestored =
    Boolean(progressState.games['space-invaders']?.memoryUnlocked) || allUnlocked;
  const dkRestored =
    Boolean(progressState.games['donkey-kong']?.memoryUnlocked) || allUnlocked;
  const invadersCabinetUnlocked =
    glitchTrailCleared ||
    progressState.island70s.unlockedCabinets.includes('space-invaders') ||
    allUnlocked;

  const southShortcutActive = isSouthShortcutUnlocked(
    progressState.island70s.activatedIslandSwitches,
    allUnlocked
  );

  // La travesía en surf desde el Puerto Norte de la Isla Natal remonta al
  // final en la arena de la playa de la Zona 1 (Pueblo Origen / Aldea de los
  // Orígenes), sobre la costa inferior del mapa: el desembarco clásico de la
  // isla, nunca en el desfiladero interior ni en el mar.
  const NATAL_SURF_LANDING = { x: 460, y: 2060 };

  const determineInitialAreaAndSpawn = (): {
    areaId: RpgAreaId;
    x: number;
    y: number;
    extReturnX: number;
    extReturnY: number;
  } => {
    const fallbackExterior = progressState.island70s.lastIslandPos &&
      isPointWalkableOnIsland(
        progressState.island70s.lastIslandPos.x,
        progressState.island70s.lastIslandPos.y,
        { southShortcut: southShortcutActive, gargantaBridge: glitchTrailCleared }
      ) &&
      !isBlockedByExteriorBuilding(
        progressState.island70s.lastIslandPos.x,
        progressState.island70s.lastIslandPos.y
      ) &&
      !isBlockedByIslandRouteRail(
        progressState.island70s.lastIslandPos.x,
        progressState.island70s.lastIslandPos.y
      ) &&
      !isBlockedByVolcanicGuardGate(
        progressState.island70s.lastIslandPos.x,
        progressState.island70s.lastIslandPos.y,
        allUnlocked || progressState.island70s.talkedNpcIds.includes(VOLCANIC_GUARD_ID)
      ) &&
      !isVolcanicArcadeCabinetBlocked(
        progressState.island70s.lastIslandPos.x,
        progressState.island70s.lastIslandPos.y
      ) &&
      !isBreakoutLegendStoneBlocked(
        progressState.island70s.lastIslandPos.x,
        progressState.island70s.lastIslandPos.y
      )
      ? { ...progressState.island70s.lastIslandPos }
      : { ...ISLAND_KEY_COORDS.awakeningSpawn };

    if (arrivalMode === 'return-breakout') {
      return {
        areaId: 'secret-sala-breakout',
        x: 380,
        y: 286,
        extReturnX: LABYRINTH_1976_ENTRANCE.returnExteriorX,
        extReturnY: LABYRINTH_1976_ENTRANCE.returnExteriorY,
      };
    }

    if (
      arrivalMode === 'return-80s' ||
      (arrivalMode === 'standard' && progressState.rpg.lastSafeArea === 'island-80s')
    ) {
      const spec80s = SUB_AREAS['island-80s'];
      const candidate80s =
        arrivalMode === 'return-80s'
          ? { x: 702, y: 344 }
          : progressState.rpg.last80sPos ?? { x: 215, y: 360 };
      const valid80s = isWalkableInSubArea(
        spec80s,
        candidate80s.x,
        candidate80s.y,
        progressState.rpg.calmedCreatureIds,
        allUnlocked
      )
        ? candidate80s
        : { x: 215, y: 360 };
      return {
        areaId: 'island-80s',
        x: valid80s.x,
        y: valid80s.y,
        extReturnX: HARBOR_80S_FERRY.returnExteriorX,
        extReturnY: HARBOR_80S_FERRY.returnExteriorY,
      };
    }

    if (arrivalMode === 'pong-board') {
      return {
        areaId: 'exterior-70s',
        x: NATAL_SURF_LANDING.x,
        y: NATAL_SURF_LANDING.y,
        extReturnX: NATAL_SURF_LANDING.x,
        extReturnY: NATAL_SURF_LANDING.y,
      };
    }
    if (arrivalMode === 'glitch-trail-cleared') {
      return {
        areaId: 'exterior-70s',
        x: ISLAND_KEY_COORDS.glitchTrailReturn.x,
        y: ISLAND_KEY_COORDS.glitchTrailReturn.y,
        extReturnX: ISLAND_KEY_COORDS.glitchTrailReturn.x,
        extReturnY: ISLAND_KEY_COORDS.glitchTrailReturn.y,
      };
    }
    if (arrivalMode === 'invaders-ship') {
      return {
        areaId: 'exterior-70s',
        x: ISLAND_KEY_COORDS.starShuttleDisembark.x,
        y: ISLAND_KEY_COORDS.starShuttleDisembark.y,
        extReturnX: ISLAND_KEY_COORDS.starShuttleDisembark.x,
        extReturnY: ISLAND_KEY_COORDS.starShuttleDisembark.y,
      };
    }
    if (arrivalMode === 'standard') {
      return {
        areaId: 'exterior-70s',
        x: fallbackExterior.x,
        y: fallbackExterior.y,
        extReturnX: fallbackExterior.x,
        extReturnY: fallbackExterior.y,
      };
    }
    return {
      areaId: 'exterior-70s',
      x: ISLAND_KEY_COORDS.awakeningSpawn.x,
      y: ISLAND_KEY_COORDS.awakeningSpawn.y,
      extReturnX: ISLAND_KEY_COORDS.awakeningSpawn.x,
      extReturnY: ISLAND_KEY_COORDS.awakeningSpawn.y,
    };
  };

  const initSetupRef = useRef(determineInitialAreaAndSpawn());

  const [activeAreaId, setActiveAreaId] = useState<RpgAreaId>(initSetupRef.current.areaId);
  const activeAreaRef = useRef<RpgAreaId>(initSetupRef.current.areaId);
  activeAreaRef.current = activeAreaId;

  const exteriorReturnPosRef = useRef<{ x: number; y: number }>({
    x: initSetupRef.current.extReturnX,
    y: initSetupRef.current.extReturnY,
  });

  const playerPosBridgeRef = useRef<{
    x: number;
    y: number;
    facingDir: FacingDirection;
    interactAnim: number;
    sprinting?: boolean;
    teleportPending: { x: number; y: number; facingDir?: FacingDirection } | null;
  }>({
    x: initSetupRef.current.x,
    y: initSetupRef.current.y,
    facingDir: 'down',
    interactAnim: 0,
    sprinting: false,
    teleportPending: null,
  });

  const steppedTilesRef = useRef<number[]>([]);
  const activeRgbPillarsRef = useRef<number[]>([]);
  const scannerPulseRef = useRef<{ active: boolean; elapsed: number }>({
    active: false,
    elapsed: 0,
  });
  const orbitalDashRef = useRef<{ remaining: number; cooldown: number; dx: number; dy: number }>({
    remaining: 0,
    cooldown: 0,
    dx: 0,
    dy: 1,
  });
  const lastMoveDirectionRef = useRef({ x: 0, y: 1 });
  const initialFlightFuel = progressState.rpg.powersState?.flightFuel ?? 100;
  const flightFuelRef = useRef<number>(initialFlightFuel);
  const pendingFuelPersistRef = useRef<number>(0);
  const lastFuelUiShownRef = useRef<number>(Math.floor(initialFlightFuel));
  const pongBoardDepartureRef = useRef<{
    x: number;
    y: number;
    elapsed: number;
    duration: number;
  } | null>(null);
  const lastSafeGroundRef = useRef<{ x: number; y: number }>({
    x: initSetupRef.current.x,
    y: initSetupRef.current.y,
  });

  // Mecanismos y combate de El Castillo del Rey Corrupto
  const towerSealsOrderRef = useRef<string[]>([]);
  const hydraulicValvesOrderRef = useRef<string[]>([]);
  const chroniclesPlacedRef = useRef<number[]>([]);
  const towerLeversRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const bossCombatStateRef = useRef<CastleBossCombatState>({
    phase: 1,
    bossHp: 100,
    maxHp: 100,
    dkPos: { x: 490, y: 220 },
    barrels: [],
    shockwaves: [],
    conduitOverloads: [false, false],
    dkPurified: false,
    attackTimer: 0,
  });

  const [areaFadeActive, setAreaFadeActive] = useState<boolean>(false);
  const [chronoWarpActive, setChronoWarpActive] = useState<boolean>(false);
  const areaTransitionLockRef = useRef<boolean>(false);

  const [currentZoneId, setCurrentZoneId] = useState<IslandZoneId>('costa-despertar');
  const [zoneBanner, setZoneBanner] = useState<{
    numberLabel: string;
    name: string;
    subtitle: string;
    accentHex: string;
  } | null>(null);
  const [nearbyPrompt, setNearbyPrompt] = useState<InteractivePromptTarget | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveDialogModal | null>(null);
  const activeDialogRef = useRef(activeDialog);
  activeDialogRef.current = activeDialog;
  const advanceDialogueRef = useRef<() => void>(() => {});
  const [dialogueVisibleChars, setDialogueVisibleChars] = useState(0);
  const dialogueFullText = activeDialog?.paragraphs.join('\n\n') ?? '';
  useEffect(() => {
    if (!activeDialog) {
      setDialogueVisibleChars(0);
      return;
    }
    setDialogueVisibleChars(0);
    let shown = 0;
    const timer = window.setInterval(() => {
      shown = Math.min(dialogueFullText.length, shown + 3);
      setDialogueVisibleChars(shown);
      if (shown >= dialogueFullText.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [activeDialog, dialogueFullText]);
  advanceDialogueRef.current = () => {
    if (!activeDialog) return;
    if (dialogueVisibleChars < dialogueFullText.length) setDialogueVisibleChars(dialogueFullText.length);
    else setActiveDialog(null);
  };
  const [codexOpen, setCodexOpen] = useState<boolean>(false);
  const [inventoryOpen, setInventoryOpen] = useState<boolean>(false);
  const [inventoryClosing, setInventoryClosing] = useState<boolean>(false);
  const [questsOpen, setQuestsOpen] = useState<boolean>(false);
  const [vectorModalOpen, setVectorModalOpen] = useState<boolean>(false);
  const [vectorAngles, setVectorAngles] = useState<[number, number, number]>([0, 45, 90]);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [minimapOpen, setMinimapOpen] = useState<boolean>(false);
  const [flightStatusText, setFlightStatusText] = useState<string | null>(null);
  const [volcanicGuardDialog, setVolcanicGuardDialog] = useState<'choice' | 'no' | 'yes' | null>(null);
  const volcanicGuardDialogRef = useRef<'choice' | 'no' | 'yes' | null>(null);
  const [volcanicGuardChoice, setVolcanicGuardChoice] = useState<'yes' | 'no'>('yes');
  const volcanicGuardChoiceRef = useRef<'yes' | 'no'>('yes');
  const volcanicGuardRetryLockedRef = useRef(false);
  const volcanicGuardTimerRef = useRef<number | null>(null);
  const [breakoutSwordExtracting, setBreakoutSwordExtracting] = useState(false);
  const breakoutSwordExtractionStartedRef = useRef(false);
  const breakoutSwordExtractionMotionRef = useRef<{ elapsed: number; duration: number; fromX: number; fromY: number; toX: number; toY: number } | null>(null);

  // Sistema de los 4 Poderes Principales y Selector de Legado
  const [activePower, setActivePower] = useState<'pong-hoverboard' | 'shifting-blade' | 'orbital-dash' | 'sonar-pulse'>('pong-hoverboard');
  const [bladeMode, setBladeMode] = useState<'short' | 'extended' | 'gun'>('short');
  const [flightFuelUi, setFlightFuelUi] = useState<number>(
    Math.floor(initialFlightFuel)
  );
  const [dashCooldown, setDashCooldown] = useState<number>(0);
  const [weaponSwingActive, setWeaponSwingActive] = useState<boolean>(false);
  const [sonarActive, setSonarActive] = useState<boolean>(false);
  const [legacyPowerModalOpen, setLegacyPowerModalOpen] = useState<boolean>(false);
  const [selectedLegacyPower, setSelectedLegacyPower] = useState<string | null>(null);
  const [playerMiniPos, setPlayerMiniPos] = useState<{ x: number; y: number }>({
    x: initSetupRef.current.x,
    y: initSetupRef.current.y,
  });

  const [powersMenuOpen, setPowersMenuOpen] = useState<boolean>(false);
  const [keybindings, setKeybindings] = useState<KeybindingsMap>(() => loadKeybindings());

  useEffect(() => {
    const onKbChange = (ev: Event) => {
      const customEv = ev as CustomEvent<KeybindingsMap>;
      if (customEv.detail) setKeybindings(customEv.detail);
    };
    window.addEventListener('pixelverse-keybindings-changed', onKbChange);
    return () => window.removeEventListener('pixelverse-keybindings-changed', onKbChange);
  }, []);

  const closeInventory = () => {
    if (latestStateRef.current.inventoryClosing) return;
    setInventoryClosing(true);
    window.setTimeout(() => {
      setInventoryOpen(false);
      setInventoryClosing(false);
    }, 140);
  };

  const anyModalOpen =
    Boolean(externalModalOpen) ||
    Boolean(activeDialog) ||
    Boolean(volcanicGuardDialog) ||
    breakoutSwordExtracting ||
    codexOpen ||
    inventoryOpen ||
    inventoryClosing ||
    questsOpen ||
    powersMenuOpen ||
    vectorModalOpen ||
    chronoWarpActive;

  const latestStateRef = useRef({
    skinColor,
    hairColor,
    shirtColor,
    appearance,
    allUnlocked,
    pongRestored,
    breakoutRestored,
    glitchTrailCleared,
    invadersRestored,
    dkRestored,
    invadersCabinetUnlocked,
    southShortcutActive,
    progressState,
    modalOpen: anyModalOpen,
    breakoutSwordExtracting,
    inventoryOpen,
    inventoryClosing,
    chronoWarpActive,
  });
  latestStateRef.current = {
    skinColor,
    hairColor,
    shirtColor,
    appearance,
    allUnlocked,
    pongRestored,
    breakoutRestored,
    glitchTrailCleared,
    invadersRestored,
    dkRestored,
    invadersCabinetUnlocked,
    southShortcutActive,
    progressState,
    modalOpen: anyModalOpen,
    breakoutSwordExtracting,
    inventoryOpen,
    inventoryClosing,
    chronoWarpActive,
  };

  const callbacksRef = useRef({
    onEnterPong,
    onEnterBreakout,
    onEnterBreakoutFromNorth,
    onEnterGlitchTrail,
    onEnterSpaceInvaders,
    onEnterDonkeyKong,
    onEnterAsteroids,
    onEnterSeaWolf,
    onEnterTank,
    onEnterLunarLander,
    onEnterNightDriver,
    onEnterGalaxian,
    onSetRpgFlag,
    onRestoreCuatroCaminos,
    onCollectDiamond,
    onVisitZone,
    onDiscoverEcho,
    onActivateSwitch,
    onTalkNpc,
    onSavePosition,
    onSave80sPosition,
    onManualSave,
    onManualSave80s,
    onOpenChest,
    onDiscoverSecret,
    onDiscoverClue,
    onSolveCase,
    onCalmCreature,
    onInspectExhibit,
    onSolvePuzzle,
    onRepairMechanism,
    onUpdateQuest,
    onEquipCosmetic,
    onToggleLantern,
    onUpdatePowerEnergy,
    onPurchasePowerUpgrade,
    onRechargePowers,
    onArrivalSequenceFinished,
  });
  callbacksRef.current = {
    onEnterPong,
    onEnterBreakout,
    onEnterBreakoutFromNorth,
    onEnterGlitchTrail,
    onEnterSpaceInvaders,
    onEnterDonkeyKong,
    onEnterAsteroids,
    onEnterSeaWolf,
    onEnterTank,
    onEnterLunarLander,
    onEnterNightDriver,
    onEnterGalaxian,
    onSetRpgFlag,
    onRestoreCuatroCaminos,
    onCollectDiamond,
    onVisitZone,
    onDiscoverEcho,
    onActivateSwitch,
    onTalkNpc,
    onSavePosition,
    onSave80sPosition,
    onManualSave,
    onManualSave80s,
    onOpenChest,
    onDiscoverSecret,
    onDiscoverClue,
    onSolveCase,
    onCalmCreature,
    onInspectExhibit,
    onSolvePuzzle,
    onRepairMechanism,
    onUpdateQuest,
    onEquipCosmetic,
    onToggleLantern,
    onUpdatePowerEnergy,
    onPurchasePowerUpgrade,
    onRechargePowers,
    onArrivalSequenceFinished,
  };

  const setFlightFuel = useCallback((value: number) => {
    const clamped = Math.max(0, value);
    flightFuelRef.current = clamped;
    const shown = Math.floor(clamped);
    if (shown !== lastFuelUiShownRef.current) {
      lastFuelUiShownRef.current = shown;
      setFlightFuelUi(shown);
    }
  }, []);

  const persistFuelConsumption = useCallback((amount: number, force = false) => {
    if (amount > 0) pendingFuelPersistRef.current += amount;
    if (!force && pendingFuelPersistRef.current < 0.5) return;
    const delta = pendingFuelPersistRef.current;
    pendingFuelPersistRef.current = 0;
    if (delta > 0.001) {
      callbacksRef.current.onUpdatePowerEnergy?.('flightFuel', -delta);
    }
  }, []);

  const cuevaReflectorAngleRef = useRef<number>(0);
  const cuevaSwitchesPressedRef = useRef<string[]>([]);
  const cuevaResonatorsPressedRef = useRef<number[]>([]);
  const dylanRepairTriggeredRef = useRef<boolean>(false);

  const resolveVolcanicGuardChoice = useCallback((choice: 'yes' | 'no') => {
    if (volcanicGuardDialogRef.current !== 'choice') return;
    const accepted = choice === 'yes';
    if (volcanicGuardTimerRef.current !== null) window.clearTimeout(volcanicGuardTimerRef.current);
    if (accepted) {
      callbacksRef.current.onTalkNpc(VOLCANIC_GUARD_ID);
      setVolcanicGuardDialog('yes');
      volcanicGuardDialogRef.current = 'yes';
      retroAudio.npcBlip(1.16);
    } else {
      volcanicGuardRetryLockedRef.current = true;
      setVolcanicGuardDialog('no');
      volcanicGuardDialogRef.current = 'no';
      retroAudio.npcBlip(0.74);
    }
    volcanicGuardTimerRef.current = window.setTimeout(() => {
      setVolcanicGuardDialog(null);
      volcanicGuardDialogRef.current = null;
      volcanicGuardTimerRef.current = null;
    }, 1900);
  }, []);

  const startBreakoutSwordExtraction = useCallback(() => {
    if (breakoutSwordExtractionStartedRef.current) return;
    breakoutSwordExtractionStartedRef.current = true;
    callbacksRef.current.onDiscoverSecret('breakout-sword-extracted');
    const player = playerPosBridgeRef.current;
    breakoutSwordExtractionMotionRef.current = {
      elapsed: 0,
      duration: 0.62,
      fromX: player.x,
      fromY: player.y,
      toX: VOLCANIC_ARCADE_LAYOUT.breakoutStone.x - 34,
      toY: VOLCANIC_ARCADE_LAYOUT.breakoutStone.y + 32,
    };
    setBreakoutSwordExtracting(true);
    retroAudio.secretFound();
    window.setTimeout(() => {
      setBreakoutSwordExtracting(false);
      breakoutSwordExtractionMotionRef.current = null;
    }, 1900);
  }, []);

  const performIslandManualSave = useCallback((): string => {
    const curArea = activeAreaRef.current;
    if (curArea === 'island-80s') {
      const px = playerPosBridgeRef.current.x;
      const py = playerPosBridgeRef.current.y;
      if (callbacksRef.current.onManualSave80s) {
        callbacksRef.current.onManualSave80s(px, py);
      } else {
        callbacksRef.current.onSave80sPosition(px, py);
      }
      return 'Isla Neón 1980s';
    }

    if (curArea === 'exterior-70s') {
      const px = playerPosBridgeRef.current.x;
      const py = playerPosBridgeRef.current.y;
      callbacksRef.current.onManualSave(px, py);
      return `Isla del Origen · ${ISLAND_ZONES[currentZoneId]?.name ?? 'Exterior 1970s'}`;
    }

    const safeExtX = exteriorReturnPosRef.current.x;
    const safeExtY = exteriorReturnPosRef.current.y;
    callbacksRef.current.onManualSave(safeExtX, safeExtY);
    return `${SUB_AREAS[curArea]?.name ?? 'Interior'} · Entrada asegurada`;
  }, [currentZoneId]);

  useEffect(() => {
    if (!manualSaveTriggerRef) return;
    manualSaveTriggerRef.current = performIslandManualSave;
    return () => {
      if (manualSaveTriggerRef.current === performIslandManualSave) {
        manualSaveTriggerRef.current = null;
      }
    };
  }, [manualSaveTriggerRef, performIslandManualSave]);

  const nearbyPromptRef = useRef<InteractivePromptTarget | null>(null);
  nearbyPromptRef.current = nearbyPrompt;

  // Vuelos exclusivamente internos dentro de la misma Isla de los 70
  const vehicleFlightRef = useRef<{
    type: 'none' | 'pong-landing' | 'pong-to-garganta' | 'garganta-to-pong' | 'shuttle-landing' | 'hoverboard';
    elapsed: number;
    duration: number;
    /** Inclinación de la tabla durante el descenso del surf. */
    tilt?: number;
  }>({
    type:
      arrivalMode === 'pong-board'
        ? 'pong-landing'
        : arrivalMode === 'invaders-ship'
        ? 'shuttle-landing'
        : 'none',
    elapsed: 0,
    duration:
      arrivalMode === 'pong-board'
        ? PONG_LANDING_DURATION
        : arrivalMode === 'invaders-ship'
        ? 4.5
        : 4.1,
  });

  // Desembarco del surf: la barra frena en la orilla y el personaje baja caminando
  // hasta la arena de Pueblo Origen antes de devolver el control.
  const surfDisembarkRef = useRef<{
    t: number;
    duration: number;
    fromX: number;
    fromY: number;
  } | null>(null);

  useEffect(() => {
    if (vehicleFlightRef.current.type === 'hoverboard') return;
    const value = progressState.rpg.powersState?.flightFuel ?? 100;
    setFlightFuel(value);
  }, [progressState.rpg.powersState?.flightFuel, setFlightFuel]);

  const virtualInputRef = useRef<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    sprint: boolean;
    clickTarget: { x: number; y: number } | null;
  }>({
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
    clickTarget: null,
  });

  const showToast = useCallback((msg: string) => {
    setToastBanner(msg);
    window.setTimeout(() => {
      setToastBanner((prev) => (prev === msg ? null : prev));
    }, 3900);
  }, []);

  useEffect(() => {
    if (!breakoutRestored || activeAreaRef.current !== 'exterior-70s' || breakoutSwordExtractionStartedRef.current) return;
    if (progressState.rpg.discoveredSecretIds.includes('breakout-sword-extracted')) {
      breakoutSwordExtractionStartedRef.current = true;
      return;
    }
    const player = playerPosBridgeRef.current;
    if (Math.hypot(player.x - VOLCANIC_ARCADE_LAYOUT.breakoutStone.x, player.y - VOLCANIC_ARCADE_LAYOUT.breakoutStone.y) > 200) return;
    startBreakoutSwordExtraction();
  }, [activeAreaId, breakoutRestored, progressState.rpg.discoveredSecretIds, startBreakoutSwordExtraction]);

  const executeActivePower = useCallback((power: IslandPowerId = activePower) => {
    if (latestStateRef.current.modalOpen || areaTransitionLockRef.current) return;
    const state = latestStateRef.current;
    if (!isIslandPowerUnlocked(power, state.progressState, state.allUnlocked)) {
      retroAudio.npcBlip(0.7);
      showToast('Este poder todavía está bloqueado.');
      return;
    }

    if (power === 'pong-hoverboard') {
      if (vehicleFlightRef.current.type === 'hoverboard') {
        vehicleFlightRef.current = { type: 'none', elapsed: 0, duration: 0 };
        setFlightStatusText(null);
        persistFuelConsumption(0, true);
        const pd = playerPosBridgeRef.current;
        if (activeAreaRef.current === 'exterior-70s') {
          const canLand = Boolean(
            isPointWalkableOnIsland(pd.x, pd.y, {
              southShortcut: state.southShortcutActive,
              gargantaBridge: state.glitchTrailCleared,
            })
          ) &&
            !isBlockedByExteriorBuilding(pd.x, pd.y) &&
            !isBlockedByIslandRouteRail(pd.x, pd.y);
          if (canLand) {
            lastSafeGroundRef.current = { x: pd.x, y: pd.y };
          } else {
            pd.teleportPending = {
              x: lastSafeGroundRef.current.x,
              y: lastSafeGroundRef.current.y,
            };
          }
        }
        retroAudio.hoverboardLaunch();
        showToast('Paleta Voladora DESACTIVADA · Aterrizaje seguro');
      } else {
        if (activeAreaRef.current !== 'exterior-70s' && activeAreaRef.current !== 'island-80s') {
          retroAudio.npcBlip(0.7);
          showToast('No puedes volar dentro de interiores.');
          return;
        }
        if (!state.allUnlocked && flightFuelRef.current < PONG_BOARD_MIN_FUEL) {
          retroAudio.npcBlip(0.7);
          showToast('⚠ Sin combustible de vuelo. Recarga la Barra de Pong en el Punto de Guardado GBC.');
          return;
        }
        vehicleFlightRef.current = { type: 'hoverboard', elapsed: 0, duration: 9999 };
        retroAudio.hoverboardLaunch();
        showToast('¡Paleta Voladora de Pong ACTIVADA! Planeando sobre la isla [F para Aterrizar].');
      }
    } else if (power === 'shifting-blade') {
      retroAudio.laserShoot();
      playerPosBridgeRef.current.interactAnim = 0.4;
      setWeaponSwingActive(true);
      window.setTimeout(() => setWeaponSwingActive(false), 360);
      const pos = playerPosBridgeRef.current;
      const boss = bossCombatStateRef.current;
      const facing = pos.facingDir ?? 'down';
      const vx = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
      const vy = facing === 'up' ? -1 : facing === 'down' ? 1 : 0;
      const dx = boss.dkPos.x - pos.x;
      const dy = boss.dkPos.y - pos.y;
      const reach = bladeMode === 'short' ? 74 : bladeMode === 'extended' ? 142 : 205;
      if (activeAreaRef.current === 'castle-trono' && Math.hypot(dx, dy) <= reach && dx * vx + dy * vy > 0) {
        if (boss.phase === 1) {
          boss.bossHp = 66; boss.phase = 2; retroAudio.secretFound();
          showToast('Impacto directo. Sobrecargá los dos acumuladores laterales.');
        } else if (boss.phase === 2 && boss.conduitOverloads[0] && boss.conduitOverloads[1]) {
          boss.bossHp = 33; boss.phase = 3; retroAudio.secretFound();
          showToast('Coraza disipada. Destruí el núcleo digital.');
        } else if (boss.phase === 2) {
          retroAudio.npcBlip(0.7); showToast('La coraza desvía el ataque. Sobrecargá ambos acumuladores.');
        } else if (boss.phase === 3) {
          boss.bossHp = 0; boss.phase = 4; boss.dkPurified = true;
          callbacksRef.current.onDiscoverSecret('castle-donkey-kong-freed');
          callbacksRef.current.onOpenChest('chest-victory-hangar', ['item-llave-hangar-dk']);
          retroAudio.questComplete(); showToast('Núcleo destruido. Donkey Kong ha sido liberado.');
        }
      }
      const modeName = bladeMode === 'short' ? 'Espada Corta' : bladeMode === 'extended' ? 'Espada Extensible 4-Bandas' : 'Pistola de Energía';
      showToast(`¡Ataque de ${modeName} ejecutado!`);
    } else if (power === 'orbital-dash') {
      if (orbitalDashRef.current.cooldown > 0) { showToast('Dash orbital recargando.'); return; }
      const pos = playerPosBridgeRef.current;
      const facing = pos.facingDir ?? 'down';
      const last = lastMoveDirectionRef.current;
      const len = Math.hypot(last.x, last.y);
      const fallback = facing === 'left' ? { x: -1, y: 0 } : facing === 'right' ? { x: 1, y: 0 } : facing === 'up' ? { x: 0, y: -1 } : { x: 0, y: 1 };
      orbitalDashRef.current = { remaining: 176, cooldown: 1.2, dx: len ? last.x / len : fallback.x, dy: len ? last.y / len : fallback.y };
      retroAudio.dashImpulse();
      playerPosBridgeRef.current.sprinting = true;
      const px = playerPosBridgeRef.current.x;
      const py = playerPosBridgeRef.current.y;
      if (Math.hypot(px - LABYRINTH_1976_ENTRANCE.x, py - LABYRINTH_1976_ENTRANCE.y) < 140 || Math.hypot(px - 1420, py - 460) < 140) {
        retroAudio.alienExplode();
        callbacksRef.current.onDiscoverSecret('glitch-entrance-shattered');
        showToast('¡DASH ORBITAL destruye la barrera de glitch! Acceso al Sendero Glitch ABIERTO.');
      } else {
        showToast('¡DASH ORBITAL de Asteroids ejecutado!');
      }
    } else if (power === 'sonar-pulse') {
      retroAudio.scannerPing(true);
      scannerPulseRef.current = { active: true, elapsed: 0 };
      setSonarActive(true);
      window.setTimeout(() => setSonarActive(false), 1500);
      showToast('¡PULSO SONAR de Sea Wolf emitido! Revelando secretos y mecanismos en 220px...');
    }
  }, [activePower, bladeMode, showToast]);

  const updatePlayerAnimation = useCallback(
    (direction: FacingDirection, timer: number, isWalking: boolean, isSprinting: boolean): number => {
      if (!isWalking) return 0;
      const speedMultiplier = isSprinting ? 10 : 7;
      const rawIndex = Math.floor(timer * speedMultiplier) % 4;
      const mapping = ANIMATION_STATES[direction] || [0, 1, 2, 1];
      return mapping[rawIndex] ?? 0;
    },
    []
  );

  const transitionToArea = useCallback(
    (
      nextArea: RpgAreaId,
      spawnX: number,
      spawnY: number,
      facingDir: FacingDirection = 'down',
      toastMsg?: string
    ) => {
      if (areaTransitionLockRef.current) return;
      areaTransitionLockRef.current = true;
      virtualInputRef.current.clickTarget = null;
      retroAudio.doorTransition();
      setAreaFadeActive(true);

      window.setTimeout(() => {
        activeAreaRef.current = nextArea;
        setActiveAreaId(nextArea);
        setNearbyPrompt(null);
        steppedTilesRef.current = [];
        activeRgbPillarsRef.current = [];
        playerPosBridgeRef.current.teleportPending = {
          x: spawnX,
          y: spawnY,
          facingDir,
        };
        if (nextArea === 'exterior-70s') {
          callbacksRef.current.onSavePosition(spawnX, spawnY);
        } else if (nextArea === 'island-80s') {
          callbacksRef.current.onSave80sPosition(spawnX, spawnY);
          callbacksRef.current.onDiscoverSecret('visited-island-80s');
        }
        if (toastMsg) {
          showToast(toastMsg);
        }
      }, 165);

      window.setTimeout(() => {
        setAreaFadeActive(false);
        areaTransitionLockRef.current = false;
      }, 340);
    },
    [showToast]
  );

  const teleportExteriorTunnel = useCallback(
    (
      destX: number,
      destY: number,
      facingDir: FacingDirection,
      toastMsg?: string
    ) => {
      if (areaTransitionLockRef.current) return;
      areaTransitionLockRef.current = true;
      virtualInputRef.current.clickTarget = null;
      retroAudio.doorTransition();
      setAreaFadeActive(true);

      window.setTimeout(() => {
        setNearbyPrompt(null);
        playerPosBridgeRef.current.teleportPending = {
          x: destX,
          y: destY,
          facingDir,
        };
        callbacksRef.current.onSavePosition(destX, destY);
        if (toastMsg) {
          showToast(toastMsg);
        }
      }, 155);

      window.setTimeout(() => {
        setAreaFadeActive(false);
        areaTransitionLockRef.current = false;
      }, 320);
    },
    [showToast]
  );

  const handleUseScannerPulse = useCallback(() => {
    const st = latestStateRef.current;
    const hasScanner =
      st.allUnlocked ||
      st.progressState.island70s.abilitiesUnlocked.includes('secret-scanner') ||
      st.progressState.rpg.inventoryItems.includes('item-escaner-frecuencias');
    if (!hasScanner) {
      retroAudio.npcBlip(0.75);
      showToast(
        'Escáner bloqueado · Resuelve las losetas del Templo Pionero o ayuda a la Archivera Lira.'
      );
      return;
    }
    retroAudio.scannerPing();
    scannerPulseRef.current = { active: true, elapsed: 0 };

    const px = playerPosBridgeRef.current.x;
    const py = playerPosBridgeRef.current.y;
    const curArea = activeAreaRef.current;
    for (const cr of GUARDIAN_CREATURES) {
      if (
        cr.areaId === curArea &&
        cr.requiresLanternOrScanner &&
        !st.progressState.rpg.calmedCreatureIds.includes(cr.id) &&
        Math.hypot(px - cr.x, py - cr.y) < 160
      ) {
        retroAudio.creatureChime(true);
        callbacksRef.current.onCalmCreature(cr.id);
        showToast(`¡Pulso TTL armonizado! ${cr.name} despeja el corredor.`);
        return;
      }
    }

    for (const mound of ISLAND_SAND_MOUNDS) {
      if (Math.hypot(px - mound.x, py - mound.y) < 150) {
        const alreadyCollected = st.progressState.rpg.openedChestIds.includes(mound.id);
        if (mound.rewardItemId && !alreadyCollected) {
          retroAudio.shardCollect(3);
          callbacksRef.current.onOpenChest(mound.id, [mound.rewardItemId]);
          showToast(`¡Pulso Sonar TTL! Tesoro revelado en ${mound.label} y añadido al inventario.`);
        } else if (alreadyCollected) {
          showToast(`Montículo ${mound.label}: ya fue excavado anteriormente.`);
        } else {
          showToast(`Montículo ${mound.label}: pulso emitido, solo contiene arena antigua.`);
        }
        return;
      }
    }

    showToast('Pulso Escáner TTL emitido · Buscando muros falsos, cofres y frecuencias...');
  }, [showToast]);

  const handleToggleLanternAction = useCallback(() => {
    const st = latestStateRef.current;
    const hasLantern =
      st.allUnlocked ||
      st.progressState.island70s.abilitiesUnlocked.includes('phosphor-lantern') ||
      st.progressState.rpg.inventoryItems.includes('item-lampara-fosforo');
    if (!hasLantern) {
      retroAudio.npcBlip(0.75);
      showToast(
        'Lámpara no disponible · Restaura Pong (1972) con 1.000 PTS para obtener la Lámpara de Fósforo.'
      );
      return;
    }
    const nextState = !st.progressState.rpg.lanternActive;
    retroAudio.shardCollect(nextState ? 2 : 0);
    callbacksRef.current.onToggleLantern(nextState);
    showToast(
      nextState
        ? 'Lámpara de Fósforo Ámbar ENCENDIDA · Penumbra disipada.'
        : 'Lámpara de Fósforo Ámbar APAGADA.'
    );
  }, [showToast]);

  const handleUseWelderAction = useCallback(() => {
    const st = latestStateRef.current;
    const hasWelder =
      st.allUnlocked ||
      st.progressState.island70s.abilitiesUnlocked.includes('circuit-welder') ||
      st.progressState.rpg.inventoryItems.includes('item-soldador-logico');
    if (!hasWelder) {
      retroAudio.npcBlip(0.75);
      showToast('Aún no posees el Soldador Lógico · Visita al Maestro Kertz en el Taller.');
      return;
    }
    const px = playerPosBridgeRef.current.x;
    const py = playerPosBridgeRef.current.y;
    if (
      activeAreaRef.current === 'exterior-70s' &&
      Math.hypot(px - BROKEN_RELAY_MECHANISM.x, py - BROKEN_RELAY_MECHANISM.y) < 115
    ) {
      const already = st.progressState.rpg.repairedMechanismIds.includes(
        BROKEN_RELAY_MECHANISM.id
      );
      if (already) {
        showToast('El Relé Auxiliar ya opera al 100% de resonancia.');
        return;
      }
      retroAudio.questComplete();
      callbacksRef.current.onRepairMechanism(BROKEN_RELAY_MECHANISM.id, [
        'sw-costa-este',
        'sw-ruinas-sur',
      ]);
      showToast(
        '¡Relé Auxiliar soldado con éxito! El Puente Costero del Sur se ha sincronizado.'
      );
    } else {
      showToast(
        'Acércate al Relé Auxiliar averiado al sur de las Ruinas Centrales para usar el Soldador.'
      );
    }
  }, [showToast]);

  const triggerInteraction = useCallback(
    (targetOverride?: InteractivePromptTarget | null) => {
      const target = targetOverride ?? nearbyPromptRef.current;
      if (!target) return;
      if ((vehicleFlightRef.current.type !== 'none' && vehicleFlightRef.current.type !== 'hoverboard') || areaTransitionLockRef.current) {
        return;
      }

      playerPosBridgeRef.current.interactAnim = 0.28;
      const st = latestStateRef.current;

      if (target.kind === 'save-terminal') {
        const px = playerPosBridgeRef.current.x;
        const py = playerPosBridgeRef.current.y;
        callbacksRef.current.onManualSave(px, py);
        callbacksRef.current.onRechargePowers?.();
        setFlightFuel(st.progressState.rpg.powersState?.maxFlightFuel ?? 100);
        retroAudio.saveJingle();
        const zInfo = ISLAND_ZONES[currentZoneId];
        const inv1000 =
          st.invadersRestored ||
          st.progressState.rpg.achievementsUnlocked.includes('invaders-1000-pts');
        setActiveDialog({
          category: 'PUNTO DE GUARDADO · CARTUCHO GBC SINCRONIZADO',
          title: VILLAGE_SAVE_TERMINAL.label,
          subtitle: `${zInfo.macroRegionTitle} · ${zInfo.name}`,
          paragraphs: [
            '¡Partida guardada correctamente en la memoria no volátil de PIXELVERSE!',
            'La Barra de Pong y los demás poderes han recuperado su energía máxima. Ya puedes volver a invocar el vuelo.',
            `Progreso registrado: Diamantes (${st.progressState.island70s.collectedDiamondIds.length}/${TOTAL_70S_DIAMONDS}) · Cofres (${st.progressState.rpg.openedChestIds.length}/${RPG_CHESTS.length}) · Secretos (${st.progressState.rpg.discoveredSecretIds.length}) · Objetos (${st.progressState.rpg.inventoryItems.length}).`,
            inv1000
              ? '★ Logro Especial Verificado: «Defensor 1.000 PTS en Space Invaders» activo de forma permanente.'
              : 'Consejo: Anota 3 goles en Pong (Zona 2) y supera los 1.000 puntos en Space Invaders (Zona 4) para registrar tus emblemas permanentes.',
          ],
          hint: 'Puedes retomar tu aventura en cualquier momento pulsando CONTINUAR en la pantalla de título.',
          accentHex: '#38bdf8',
        });
        return;
      }

      if (target.kind === 'wooden-sign') {
        const sign = ISLAND_WOODEN_SIGNS.find((s) => s.id === target.id);
        if (!sign) return;
        retroAudio.uiClick();
        setActiveDialog({
          category: 'CARTEL DE MADERA · ORIENTACIÓN DE RUTA',
          title: sign.zoneTitle,
          paragraphs: sign.lines,
          accentHex: '#fde047',
        });
        return;
      }

      if (target.kind === 'rock-tunnel') {
        const tunnel = COASTAL_SUBTERRANEAN_TUNNELS.find((t) => t.id === target.id);
        if (!tunnel) return;
        const secretId = tunnel.secretId;
        const firstDiscovery =
          Boolean(secretId) &&
          !st.progressState.rpg.discoveredSecretIds.includes(secretId!);
        if (firstDiscovery && secretId) {
          retroAudio.secretFound();
          callbacksRef.current.onDiscoverSecret(secretId);
        }
        teleportExteriorTunnel(
          tunnel.destX,
          tunnel.destY,
          tunnel.destFacing,
          firstDiscovery
            ? `¡Túnel subterráneo oculto en la roca descubierto! · ${tunnel.toastText}`
            : tunnel.toastText
        );
        return;
      }

      if (target.kind === 'anomaly-portal') {
        const portal = ISLAND_ANOMALY_PORTALS.find((p) => p.id === target.id);
        if (!portal) return;

        const syncedGlyphs = ['secret-glyph-1', 'secret-glyph-2', 'secret-glyph-3'].filter(
          (gid) =>
            st.allUnlocked || st.progressState.rpg.discoveredSecretIds.includes(gid)
        ).length;

        const unlocked =
          st.allUnlocked ||
          !portal.requiredSecretIds ||
          portal.requiredSecretIds.every((req) =>
            st.progressState.rpg.discoveredSecretIds.includes(req)
          );

        if (!unlocked) {
          retroAudio.portalResonance(false);
          setActiveDialog({
            category: `ANOMALÍA ARQUEOLÓGICA · GLIFOS SINCRONIZADOS (${syncedGlyphs}/3)`,
            title: portal.dormantTitle,
            subtitle: portal.subtitle,
            paragraphs: portal.dormantLore,
            hint: portal.dormantHint,
            accentHex: portal.accentHex,
          });
          return;
        }

        retroAudio.portalResonance(true);
        if (portal.targetKind === 'exterior-coords') {
          if (
            !st.progressState.rpg.discoveredSecretIds.includes(
              'secret-portal-atajo-sincronizado'
            )
          ) {
            callbacksRef.current.onDiscoverSecret('secret-portal-atajo-sincronizado');
          }
          teleportExteriorTunnel(
            portal.destX,
            portal.destY,
            portal.destFacing,
            portal.activeToast
          );
          return;
        }

        if (portal.targetKind === 'sub-area' && portal.targetArea) {
          exteriorReturnPosRef.current = {
            x: portal.returnExteriorX ?? playerPosBridgeRef.current.x,
            y: portal.returnExteriorY ?? playerPosBridgeRef.current.y,
          };
          if (
            !st.progressState.rpg.discoveredSecretIds.includes(
              'secret-boveda-cronoscopio'
            )
          ) {
            callbacksRef.current.onDiscoverSecret('secret-boveda-cronoscopio');
          }
          transitionToArea(
            portal.targetArea,
            portal.destX,
            portal.destY,
            portal.destFacing,
            portal.activeToast
          );
        }
        return;
      }

      if (target.kind === 'time-machine') {
        const tm = evaluateTimeMachineStatus(st.progressState, st.allUnlocked);
        if (
          !st.progressState.rpg.discoveredSecretIds.includes(
            'secret-cronoscopio-hallado'
          )
        ) {
          callbacksRef.current.onDiscoverSecret('secret-cronoscopio-hallado');
        }
        if (!st.progressState.rpg.questStates['quest-cronoscopio-origen']) {
          callbacksRef.current.onUpdateQuest('quest-cronoscopio-origen', 'active');
        }

        if (!tm.canTravelTo80s) {
          retroAudio.portalResonance(false);
          setActiveDialog({
            category: `LA MÁQUINA DEL TIEMPO · ETAPA ${tm.stageNumber} DE 4`,
            title: 'El Cronoscopio de las Décadas',
            subtitle: `Subsistemas sincronizados: ${tm.syncedCount} / 4`,
            paragraphs: [
              'Ante ti reposa El Cronoscopio: un astrolabio electromecánico de bronce, cuarzo y cátodos diseñado para navegar entre las décadas de la historia del videojuego.',
              `• Pulso Fundacional 1972 (Pong: 3 goles): ${
                tm.pongReady ? 'SINCRONIZADO ✓' : 'PENDIENTE'
              }\n• Puente de Coordenadas (El Sendero del Glitch): ${
                tm.glitchReady ? 'SINCRONIZADO ✓' : 'PENDIENTE'
              }\n• Escudo Orbital 1978 (Space Invaders ≥ ${SPACE_INVADERS_UNLOCK_SCORE} PTS): ${
                tm.invadersReady ? 'SINCRONIZADO ✓' : 'PENDIENTE'
              }\n• Resonancia Arqueológica (Bobina Temporal o 3 Glifos): ${
                tm.archaeologyReady ? 'ACOPLADA ✓' : 'EN BÚSQUEDA'
              }`,
            ],
            hint: 'Completa los hitos de La Isla del Origen (1972 → Sendero Glitch → 1978) para activar la Etapa 4 y abrir el viaje temporal hacia la década de 1980.',
            accentHex: '#00f3ff',
          });
          return;
        }

        // Etapa 4 alcanzada: Ceremonia audiovisual de Salto Temporal hacia 1980s
        if (
          st.progressState.rpg.questStates['quest-cronoscopio-origen'] !== 'completed'
        ) {
          callbacksRef.current.onUpdateQuest('quest-cronoscopio-origen', 'completed', [
            'item-insignia-crononauta',
          ]);
        }

        areaTransitionLockRef.current = true;
        virtualInputRef.current.clickTarget = null;
        retroAudio.timeMachineWarp();
        setChronoWarpActive(true);

        window.setTimeout(() => {
          activeAreaRef.current = 'island-80s';
          setActiveAreaId('island-80s');
          setNearbyPrompt(null);
          steppedTilesRef.current = [];
          playerPosBridgeRef.current.teleportPending = {
            x: 268,
            y: 186,
            facingDir: 'down',
          };
          callbacksRef.current.onSave80sPosition(268, 186);
          callbacksRef.current.onDiscoverSecret('visited-island-80s');
        }, 1250);

        window.setTimeout(() => {
          setChronoWarpActive(false);
          areaTransitionLockRef.current = false;
          showToast(
            '¡Salto Temporal completado en El Cronoscopio! · Década de 1980: Paseo Neón de las Vigas Rojas'
          );
        }, 1750);
        return;
      }

      if (target.kind === 'building-door') {
        const bldg = ISLAND_70S_BUILDINGS.find((b) => b.id === target.id);
        if (!bldg) return;
        exteriorReturnPosRef.current = {
          x: bldg.returnExteriorX,
          y: bldg.returnExteriorY,
        };
        transitionToArea(
          bldg.targetArea,
          bldg.targetSpawnX,
          bldg.targetSpawnY,
          'up',
          `Entrando a ${bldg.name}`
        );
        return;
      }

      if (target.kind === 'cave-entrance') {
        const cave = ISLAND_NORTH_CAVE_ENTRANCES.find((entry) => entry.id === target.id);
        if (!cave) return;
        const firstDiscovery = !st.progressState.rpg.discoveredSecretIds.includes(
          cave.secretId
        );
        if (firstDiscovery) {
          retroAudio.secretFound();
          callbacksRef.current.onDiscoverSecret(cave.secretId);
        }
        exteriorReturnPosRef.current = {
          x: cave.returnExteriorX,
          y: cave.returnExteriorY,
        };
        transitionToArea(
          cave.targetArea,
          cave.targetSpawnX,
          cave.targetSpawnY,
          'up',
          firstDiscovery ? `¡${cave.label} descubierta!` : cave.label
        );
        return;
      }

      if (target.kind === 'waterfall-entrance') {
        const firstTime =
          !st.progressState.rpg.discoveredSecretIds.includes('secret-cascada-gruta');
        if (firstTime) {
          retroAudio.secretFound();
          callbacksRef.current.onDiscoverSecret('secret-cascada-gruta');
        }
        exteriorReturnPosRef.current = {
          x: WATERFALL_SECRET_ENTRANCE.returnExteriorX,
          y: WATERFALL_SECRET_ENTRANCE.returnExteriorY,
        };
        transitionToArea(
          WATERFALL_SECRET_ENTRANCE.targetArea,
          WATERFALL_SECRET_ENTRANCE.targetSpawnX,
          WATERFALL_SECRET_ENTRANCE.targetSpawnY,
          'up',
          firstTime
            ? '¡Pasadizo secreto descubierto detrás de la cascada!'
            : 'Gruta Subterránea Tras la Cascada'
        );
        return;
      }

      if (target.kind === 'ferry-80s') {
        const canSail =
          st.invadersRestored ||
          st.allUnlocked ||
          st.progressState.rpg.unlockedIslands.includes('island-80s');
        if (!canSail) {
          retroAudio.npcBlip(0.8);
          setActiveDialog({
            category: 'EMBARCADERO ASTRAL · RUTA MARÍTIMA SELLADA',
            title: 'Navío hacia la Isla Neón 1980s',
            subtitle: `Requiere Carta Náutica (Space Invaders ≥ ${SPACE_INVADERS_UNLOCK_SCORE} PTS)`,
            paragraphs: [
              'Las corrientes cuánticas del mar oriental aún están agitadas por la invasión de 1978.',
              'Defiende La Fortaleza de las Oleadas superando los 1.000 puntos reales en Space Invaders para despejar la niebla y desbloquear la travesía hacia la Isla Neón de los años 80.',
            ],
            hint: 'Completa la cadena Pong (1.000 PTS) → Sendero del Glitch → Space Invaders (1.000 PTS).',
            accentHex: '#f43f5e',
          });
          return;
        }
        exteriorReturnPosRef.current = {
          x: HARBOR_80S_FERRY.returnExteriorX,
          y: HARBOR_80S_FERRY.returnExteriorY,
        };
        retroAudio.portalVictory();
        transitionToArea(
          'island-80s',
          HARBOR_80S_FERRY.targetSpawnX,
          HARBOR_80S_FERRY.targetSpawnY,
          'right',
          '¡Travesía completada! Bienvenido a la Isla Neón 1980s · Muelle de las Vigas Rojas'
        );
        return;
      }

      if (target.kind === 'sub-exit') {
        const curAreaId = activeAreaRef.current;
        if (curAreaId === 'exterior-70s') return;
        const spec = SUB_AREAS[curAreaId];
        const exitSpec = spec.exits.find((ex) => ex.id === target.id);
        if (!exitSpec) return;

        if (exitSpec.returnToSavedExterior) {
          transitionToArea(
            'exterior-70s',
            exteriorReturnPosRef.current.x,
            exteriorReturnPosRef.current.y,
            'down'
          );
        } else {
          if (exitSpec.targetArea === 'interior-cronoscopio') {
            exteriorReturnPosRef.current = { x: 2150, y: 1218 };
          }
          transitionToArea(
            exitSpec.targetArea,
            exitSpec.targetX ?? ISLAND_KEY_COORDS.awakeningSpawn.x,
            exitSpec.targetY ?? ISLAND_KEY_COORDS.awakeningSpawn.y,
            'down',
            exitSpec.targetArea === 'interior-cronoscopio'
              ? 'Regresando al Observatorio del Cronoscopio · Isla del Origen (1970s)'
              : undefined
          );
        }
        return;
      }

      if (target.kind === 'broken-relay') {
        const repaired = st.progressState.rpg.repairedMechanismIds.includes(
          BROKEN_RELAY_MECHANISM.id
        );
        if (repaired) {
          retroAudio.echoDiscover();
          showToast(
            'Relé Auxiliar operativo · El Puente Costero del Sur permanece energizado.'
          );
          return;
        }
        const hasWelder =
          st.allUnlocked ||
          st.progressState.island70s.abilitiesUnlocked.includes('circuit-welder') ||
          st.progressState.rpg.inventoryItems.includes('item-soldador-logico');
        if (!hasWelder) {
          retroAudio.npcBlip(0.82);
          setActiveDialog({
            category: 'MECANISMO ANTIGUO AVERIADO · REQUIERE HERRAMIENTA',
            title: BROKEN_RELAY_MECHANISM.label,
            subtitle: 'Pistas de cobre fracturadas',
            paragraphs: [
              'Este terminal auxiliar enlaza los dos pedestales del Puente Costero del Sur, pero sus pistas TTL están partidas.',
              'Si consigues un Soldador Lógico de Precisión en el Taller Analógico del Bosque, podrás repararlo y abrir el atajo costero al instante.',
            ],
            hint: 'Entra al Taller TTL en el Bosque de los Circuitos y habla con el Maestro Kertz.',
            accentHex: '#f97316',
          });
          return;
        }
        retroAudio.questComplete();
        callbacksRef.current.onRepairMechanism(BROKEN_RELAY_MECHANISM.id, [
          'sw-costa-este',
          'sw-ruinas-sur',
        ]);
        setActiveDialog({
          category: 'INGENIERÍA APLICADA · MECANISMO REPARADO',
          title: '¡Relé Auxiliar Soldado con Éxito!',
          subtitle: 'Atajo del Puente Costero del Sur activado',
          paragraphs: [
            'Con pulso firme unes los contactos con estaño luminoso. Una onda cian recorre la costa meridional y despliega el puente energético hacia el Santuario de Pong.',
          ],
          accentHex: '#10b981',
        });
        return;
      }

      if (target.kind === 'chest') {
        const chest = RPG_CHESTS.find((c) => c.id === target.id);
        if (!chest) return;
        const alreadyOpened = st.progressState.rpg.openedChestIds.includes(chest.id);
        if (alreadyOpened) {
          retroAudio.uiClick();
          showToast(`${chest.label} · Ya has recuperado su tesoro.`);
          return;
        }

        if (
          chest.requiresLanternInDark &&
          !st.progressState.rpg.lanternActive &&
          !st.allUnlocked
        ) {
          retroAudio.npcBlip(0.76);
          setActiveDialog({
            category: 'OSCURIDAD PROFUNDA · CERROJO INVISIBLE',
            title: chest.label,
            paragraphs: [
              'La penumbra húmeda de la gruta impide distinguir el mecanismo del cofre. Necesitas encender tu Lámpara de Fósforo Ámbar [L] para iluminar la caverna.',
            ],
            hint: 'Restaura Pong (1972) para recibir la Lámpara de Fósforo y actívala con [L] o desde [I].',
            accentHex: '#fbbf24',
          });
          return;
        }

        if (
          chest.requiresPuzzleId &&
          !st.progressState.rpg.solvedPuzzleIds.includes(chest.requiresPuzzleId) &&
          !st.allUnlocked
        ) {
          retroAudio.npcBlip(0.8);
          setActiveDialog({
            category: 'BÓVEDA SELLADA · ACERTIJO DE LOSETAS',
            title: chest.label,
            subtitle: 'Cerrojo armónico activo',
            paragraphs: [
              'Tres bobinas magnéticas mantienen cerrado este cofre. Examina la estela tallada a la izquierda y pisa las tres losetas del suelo en el orden correcto (I → II → III).',
            ],
            accentHex: '#00f3ff',
          });
          return;
        }

        if (
          chest.requiresItemId &&
          !st.progressState.rpg.inventoryItems.includes(chest.requiresItemId) &&
          !st.allUnlocked
        ) {
          const reqItem = RPG_ITEMS[chest.requiresItemId];
          retroAudio.npcBlip(0.8);
          setActiveDialog({
            category: 'COFRE CON CERRADURA BINARIA',
            title: chest.label,
            subtitle: `Requiere: ${reqItem ? reqItem.name : 'Llave especial'}`,
            paragraphs: [
              'Una cerradura de 8 pines protege esta reliquia de neón. Cuenta la leyenda que la llave descansa oculta tras una pared falsa en el Taller Analógico de los años 70.',
            ],
            accentHex: '#f43f5e',
          });
          return;
        }

        retroAudio.chestOpen();
        callbacksRef.current.onOpenChest(chest.id, chest.rewardItemIds);
        const rewardNames = chest.rewardItemIds
          .map((id) => RPG_ITEMS[id]?.name || id)
          .join(' + ');
        setActiveDialog({
          category: '¡TESORO DESCUBIERTO! · COFRE ABIERTO',
          title: chest.label,
          subtitle: `Obtenido: ${rewardNames}`,
          paragraphs: chest.rewardItemIds.map((id) => {
            const spec = RPG_ITEMS[id];
            return spec
              ? `★ ${spec.name}: ${spec.description}`
              : `★ Objeto añadido a la Mochila.`;
          }),
          hint: 'Abre tu Mochila con [I] para inspeccionar, equipar o utilizar tus nuevos objetos.',
          accentHex: chest.accentHex,
        });
        return;
      }

      if (target.kind === 'examinable') {
        const exam = RPG_EXAMINABLES.find((ex) => ex.id === target.id);
        if (!exam) return;

        if (exam.isFalseWall && exam.unlocksDoorToArea) {
          const alreadyFound =
            exam.secretIdToDiscover &&
            st.progressState.rpg.discoveredSecretIds.includes(exam.secretIdToDiscover);
          if (!alreadyFound && exam.secretIdToDiscover) {
            retroAudio.secretFound();
            callbacksRef.current.onDiscoverSecret(exam.secretIdToDiscover);
            setActiveDialog({
              category: exam.category,
              title: exam.label,
              paragraphs: exam.paragraphs,
              hint: 'Pulsa [E] nuevamente frente a la abertura para adentrarte en la Cámara Oculta de 1958.',
              accentHex: exam.accentHex,
            });
            return;
          }
          transitionToArea(
            exam.unlocksDoorToArea.targetArea,
            exam.unlocksDoorToArea.spawnX,
            exam.unlocksDoorToArea.spawnY,
            'up',
            'Cámara Oculta de 1958 · Sala Secreta'
          );
          return;
        }

        // Puzles específicos de la Cueva Glitch y Los Cuatro Caminos
        if (target.id === 'exam-glitch-reflector') {
          cuevaReflectorAngleRef.current = (cuevaReflectorAngleRef.current + 90) % 360;
          const angle = cuevaReflectorAngleRef.current;
          retroAudio.uiClick();
          if (angle === 90) {
            retroAudio.caseDeductionSolved();
            callbacksRef.current.onSetRpgFlag?.('cuevaPulseAligned', true);
            if (!st.progressState.rpg.inventoryItems.includes('item-fragmento-pulso')) {
              callbacksRef.current.onOpenChest('cueva-pulse-grant', ['item-fragmento-pulso']);
            }
            setActiveDialog({
              category: 'CUEVA GLITCH · SECTOR DE PULSO',
              title: 'Prisma de Fase Cuántica (Alineado a 90° Norte)',
              subtitle: '¡Haz Láser de 1972 Conectado!',
              paragraphs: [
                'El prisma óptico ha rotado hacia el norte (90°). El haz láser fundacional incide de lleno en el fotodetector del receptor septentrional.',
                'El circuito cuántico vibra en resonancia pura y libera el FRAGMENTO DE PULSO (1972).',
              ],
              hint: 'Fragmento de Pulso obtenido. Añadido a tu Mochila [I] → Cartuchos/Piezas.',
              accentHex: '#00f3ff',
            });
          } else {
            setActiveDialog({
              category: 'CUEVA GLITCH · SECTOR DE PULSO',
              title: `Prisma de Fase Cuántica (${angle}°)`,
              paragraphs: [
                `Has rotado el prisma a ${angle}°. El haz luminoso impacta en la roca estática sin alcanzar el receptor del norte.`,
                'Continúa orientando el prisma hasta enfocar directamente al receptor del norte.',
              ],
              hint: 'Pulsa [E] nuevamente para rotar 90 grados más.',
              accentHex: '#38bdf8',
            });
          }
          return;
        }

        if (target.id === 'exam-glitch-receptor') {
          const isAligned = cuevaReflectorAngleRef.current === 90 || st.progressState.rpg.cuevaPulseAligned;
          setActiveDialog({
            category: 'CUEVA GLITCH · SECTOR DE PULSO',
            title: 'Receptor de Pulso Continuo (1972)',
            subtitle: isAligned ? 'Señal Óptica Estable (1972 Hz)' : 'Sin Señal',
            paragraphs: [
              isAligned
                ? 'El fotodetector de cuarzo está bañado por el haz láser del prisma sur. La frecuencia de 1972 se mantiene sincronizada con el Núcleo.'
                : 'El sensor óptico permanece inerte. Necesitas orientar el prisma reflector ubicado al sur para que proyecte su haz directamente hacia aquí.',
            ],
            hint: isAligned ? 'Pulso estabilizado.' : 'Orienta el prisma del sur hacia el norte (90°).',
            accentHex: isAligned ? '#00f3ff' : '#64748b',
          });
          return;
        }

        if (target.id === 'exam-glitch-sw-beta' || target.id === 'exam-glitch-sw-alfa' || target.id === 'exam-glitch-sw-gamma') {
          const swKey = target.id.replace('exam-glitch-sw-', '');
          const currentSeq = cuevaSwitchesPressedRef.current;
          let nextSeq: string[] = [];

          if (swKey === 'beta' && currentSeq.length === 0) {
            nextSeq = ['beta'];
            retroAudio.uiClick();
            showToast('Interruptor BETA conmutado [1/3 · Reloj de sincronización]');
          } else if (swKey === 'alfa' && currentSeq.length === 1 && currentSeq[0] === 'beta') {
            nextSeq = ['beta', 'alfa'];
            retroAudio.uiClick();
            showToast('Interruptor ALFA conmutado [2/3 · Bus de datos]');
          } else if (swKey === 'gamma' && currentSeq.length === 2 && currentSeq[0] === 'beta' && currentSeq[1] === 'alfa') {
            nextSeq = ['beta', 'alfa', 'gamma'];
            retroAudio.caseDeductionSolved();
            callbacksRef.current.onSetRpgFlag?.('cuevaCircuitSolved', true);
            if (!st.progressState.rpg.inventoryItems.includes('item-fragmento-circuito')) {
              callbacksRef.current.onOpenChest('cueva-circuit-grant', ['item-fragmento-circuito']);
            }
            setActiveDialog({
              category: 'CUEVA GLITCH · SECTOR DE CIRCUITOS',
              title: '¡Secuencia Lógica TTL Verificada!',
              subtitle: 'BETA (1976) → ALFA (1972) → GAMMA (1978)',
              paragraphs: [
                'Las tres compuertas de conmutación se han alineado con la cadencia exacta indicada por el registro de pistas.',
                'El bus de datos maestro se cierra sin sobretensión, expulsando el FRAGMENTO DE CIRCUITO (1976).',
              ],
              hint: 'Fragmento de Circuito guardado en tu Mochila [I].',
              accentHex: '#f59e0b',
            });
            cuevaSwitchesPressedRef.current = nextSeq;
            return;
          } else {
            nextSeq = [];
            retroAudio.npcBlip(0.5);
            showToast('¡Secuencia lógica incorrecta! Compuertas reiniciadas. Pista TTL: BETA → ALFA → GAMMA.');
          }
          cuevaSwitchesPressedRef.current = nextSeq;
          return;
        }

        if (target.id === 'exam-glitch-nucleo-console') {
          const pWon = Boolean(st.progressState.games['pong']?.completed || (st.progressState.games['pong']?.completionsCount ?? 0) > 0 || st.progressState.games['pong']?.memoryUnlocked);
          const bWon = Boolean(st.progressState.games['breakout']?.completed || (st.progressState.games['breakout']?.completionsCount ?? 0) > 0 || st.progressState.games['breakout']?.memoryUnlocked);
          const iWon = (Boolean(st.progressState.games['space-invaders']?.completed || (st.progressState.games['space-invaders']?.completionsCount ?? 0) > 0) || Boolean(st.progressState.games['space-invaders']?.memoryUnlocked)) && (st.progressState.games['space-invaders']?.bestScore ?? 0) >= 1000;
          const hasPulso = st.progressState.rpg.inventoryItems.includes('item-fragmento-pulso') || st.allUnlocked;
          const hasCircuito = st.progressState.rpg.inventoryItems.includes('item-fragmento-circuito') || st.allUnlocked;
          const hasMemoria = st.progressState.rpg.inventoryItems.includes('item-fragmento-memoria') || st.allUnlocked;
          const allReqsMet = pWon && bWon && iWon && hasPulso && hasCircuito && hasMemoria;
          const isMasterDone = st.progressState.rpg.origenMasterStabilized || st.progressState.rpg.inventoryItems.includes('item-cartucho-origen');

          setActiveDialog({
            category: 'NÚCLEO DEL ORIGEN · DIAGNÓSTICO MAESTRO',
            title: 'Consola Central del Origen',
            subtitle: isMasterDone ? '★ Cartucho Maestro ORIGEN Forjado ★' : allReqsMet ? '¡Requisitos Cumplidos! Listo para Estabilizar' : '6 Requisitos Exigidos',
            paragraphs: [
              'Diagnóstico de los seis pilares del universo arcade fundacional:',
              `1. Victoria real en Pong (1972): ${pWon ? '✓ Completado' : '✗ Pendiente'}`,
              `2. Victoria real en Breakout (1976): ${bWon ? '✓ Completado' : '✗ Pendiente'}`,
              `3. Victoria Space Invaders (1978, ≥1.000 pts): ${iWon ? `✓ Completado (${st.progressState.games['space-invaders']?.bestScore ?? 0} PTS)` : `✗ Pendiente (${st.progressState.games['space-invaders']?.bestScore ?? 0}/1.000 PTS)`}`,
              `4. Fragmento de Pulso (Alineación láser): ${hasPulso ? '✓ Obtenido' : '✗ Pendiente'}`,
              `5. Fragmento de Circuito (Secuencia TTL): ${hasCircuito ? '✓ Obtenido' : '✗ Pendiente'}`,
              `6. Fragmento de Memoria (Pasadizo fractal): ${hasMemoria ? '✓ Obtenido' : '✗ Pendiente'}`,
              isMasterDone
                ? 'El Núcleo opera en frecuencia armónica perfecta. Tu Cartucho Maestro ORIGEN reside permanentemente en tu Mochila.'
                : allReqsMet
                ? '¡Todos los requisitos verificados! Ahora, activa los tres resonadores en orden cronológico estricto: 1972 → 1976 → 1978 para recibir ORIGEN.'
                : 'Completa los requisitos pendientes dentro de la cueva y en los gabinetes arcade antes de estabilizar los resonadores.',
            ],
            hint: allReqsMet ? 'Activa los resonadores: 1972 (Pong) → 1976 (Breakout) → 1978 (Space Invaders).' : 'Revisa tus misiones pulsando [Q].',
            accentHex: '#facc15',
          });
          return;
        }

        if (target.id === 'exam-resonador-1972' || target.id === 'exam-resonador-1976' || target.id === 'exam-resonador-1978') {
          const pWon = Boolean(st.progressState.games['pong']?.completed || (st.progressState.games['pong']?.completionsCount ?? 0) > 0 || st.progressState.games['pong']?.memoryUnlocked);
          const bWon = Boolean(st.progressState.games['breakout']?.completed || (st.progressState.games['breakout']?.completionsCount ?? 0) > 0 || st.progressState.games['breakout']?.memoryUnlocked);
          const iWon = (Boolean(st.progressState.games['space-invaders']?.completed || (st.progressState.games['space-invaders']?.completionsCount ?? 0) > 0) || Boolean(st.progressState.games['space-invaders']?.memoryUnlocked)) && (st.progressState.games['space-invaders']?.bestScore ?? 0) >= 1000;
          const hasPulso = st.progressState.rpg.inventoryItems.includes('item-fragmento-pulso') || st.allUnlocked;
          const hasCircuito = st.progressState.rpg.inventoryItems.includes('item-fragmento-circuito') || st.allUnlocked;
          const hasMemoria = st.progressState.rpg.inventoryItems.includes('item-fragmento-memoria') || st.allUnlocked;
          const allReqsMet = pWon && bWon && iWon && hasPulso && hasCircuito && hasMemoria;
          const isMasterDone = st.progressState.rpg.origenMasterStabilized || st.progressState.rpg.inventoryItems.includes('item-cartucho-origen');

          if (isMasterDone) {
            setActiveDialog({
              category: 'RESONADOR DEL ORIGEN',
              title: 'Resonancia Estable',
              paragraphs: ['El resonador vibra al unísono con el Cartucho Maestro ORIGEN. La energía del núcleo permanece sellada en armonía temporal.'],
              accentHex: '#facc15',
            });
            return;
          }

          if (!allReqsMet && !st.allUnlocked) {
            retroAudio.npcBlip(0.6);
            setActiveDialog({
              category: 'RESONADOR BLOQUEADO',
              title: 'Frecuencia no Sincronizada',
              paragraphs: [
                'Este resonador requiere que los seis requisitos de la consola central estén cumplidos antes de admitir la secuencia de pulsos.',
                'Verifica en la Consola Central los fragmentos y victorias pendientes.',
              ],
              hint: 'Inspecciona la Consola Central del Núcleo.',
              accentHex: '#ef4444',
            });
            return;
          }

          const year = target.id === 'exam-resonador-1972' ? 1972 : target.id === 'exam-resonador-1976' ? 1976 : 1978;
          const curResSeq = cuevaResonatorsPressedRef.current;
          let nextResSeq: number[] = [];

          if (year === 1972 && curResSeq.length === 0) {
            nextResSeq = [1972];
            retroAudio.puzzleNodeTone(0);
            showToast('Resonador 1972 (Pong) sintonizado [Paso 1/3]');
          } else if (year === 1976 && curResSeq.length === 1 && curResSeq[0] === 1972) {
            nextResSeq = [1972, 1976];
            retroAudio.puzzleNodeTone(1);
            showToast('Resonador 1976 (Breakout) sintonizado [Paso 2/3]');
          } else if (year === 1978 && curResSeq.length === 2 && curResSeq[0] === 1972 && curResSeq[1] === 1976) {
            nextResSeq = [1972, 1976, 1978];
            retroAudio.achievementUnlock();
            callbacksRef.current.onSetRpgFlag?.('origenMasterStabilized', true);
            if (!st.progressState.rpg.inventoryItems.includes('item-cartucho-origen')) {
              callbacksRef.current.onOpenChest('cueva-origen-core', ['item-cartucho-origen']);
            }
            callbacksRef.current.onUpdateQuest('quest-cueva-glitch-origen', 'completed', ['item-cartucho-origen']);
            setActiveDialog({
              category: '★ CARTUCHO MAESTRO ORIGEN OBTENIDO ★',
              title: '¡Núcleo del Origen Estabilizado!',
              subtitle: 'Secuencia Cronológica 1972 → 1976 → 1978 Perfecta',
              paragraphs: [
                '¡Un torrente de energía dorada emana del Núcleo del Origen!',
                'Los tres resonadores han fijado las frecuencias de la era fundacional. La materia de datos se cristaliza en tus manos en el CARTUCHO MAESTRO ORIGEN.',
                'Esta reliquia permanente se ha guardado en tu Mochila [I] → pestaña Cartuchos. Habilita el sistema maestro de recuperación de memorias de Isla del Origen.',
              ],
              hint: 'Abre tu Mochila [I] y selecciona la pestaña CARTUCHOS para equipar o inspeccionar ORIGEN.',
              accentHex: '#facc15',
            });
            cuevaResonatorsPressedRef.current = nextResSeq;
            return;
          } else {
            nextResSeq = [];
            retroAudio.npcBlip(0.5);
            showToast('Secuencia cronológica fallida. Debe ser 1972 (Pong) → 1976 (Breakout) → 1978 (Space Invaders).');
          }
          cuevaResonatorsPressedRef.current = nextResSeq;
          return;
        }

        if (target.id === 'exam-castle-gate-north') {
          const lWon = Boolean(st.progressState.games['lunar-lander']?.completed || (st.progressState.games['lunar-lander']?.completionsCount ?? 0) > 0 || st.progressState.games['lunar-lander']?.memoryUnlocked);
          const sWon = Boolean(st.progressState.games['sea-wolf']?.completed || (st.progressState.games['sea-wolf']?.completionsCount ?? 0) > 0 || st.progressState.games['sea-wolf']?.memoryUnlocked);
          const tWon = Boolean(st.progressState.games['tank']?.completed || (st.progressState.games['tank']?.completionsCount ?? 0) > 0 || st.progressState.games['tank']?.memoryUnlocked);
          const gWon = Boolean(st.progressState.games['galaxian']?.completed || (st.progressState.games['galaxian']?.completionsCount ?? 0) > 0 || st.progressState.games['galaxian']?.memoryUnlocked);
          const isRestored = st.progressState.rpg.cuatroCaminosRestored;
          const hasOrigen = st.progressState.rpg.origenMasterStabilized || st.progressState.rpg.inventoryItems.includes('item-cartucho-origen');
          const gateUnlocked = isRestored && lWon && sWon && tWon && gWon && hasOrigen;

          if (gateUnlocked || st.allUnlocked) {
            retroAudio.secretFound();
            setActiveDialog({
              category: 'PORTÓN SEPTENTRIONAL · ACCESO AL CASTILLO',
              title: 'Barrera Desactivada · Puente Desplegado',
              subtitle: 'Los Cuatro Gabinetes y el Cartucho ORIGEN Han Roto el Sello',
              paragraphs: [
                'Las gigantescas cadenas del rastrillo se repliegan. El puente levadizo cruza el abismo estático hacia el bastión de Gran Koopa.',
                'En el horizonte se divisan las torres de piedra negra coronadas por la silueta colosal de Gran Koopa.',
                'Las cuatro máquinas históricas (Lunar Lander, Sea Wolf, Tank y Galaxian) vibran como guardianes inquebrantables.',
              ],
              hint: 'El camino hacia la fortaleza de Gran Koopa está abierto.',
              accentHex: '#22c55e',
            });
          } else {
            retroAudio.npcBlip(0.7);
            setActiveDialog({
              category: 'BARRERA SEPTENTRIONAL · CASTILLO DE GRAN KOOPA',
              title: 'Portón Norte Sellado por Sello Cuádruple',
              subtitle: 'Requiere Reparación, 4 Victorias Reales y Cartucho ORIGEN',
              paragraphs: [
                'Para retirar los cuatro cerrojos de entropía de Gran Koopa se requiere:',
                `• Reparación de Los Cuatro Caminos con Dylan: ${isRestored ? '✓ Realizada' : '✗ Pendiente'}`,
                `• Victoria real en Lunar Lander (1979): ${lWon ? '✓ Restablecido' : '✗ Pendiente'}`,
                `• Victoria real en Sea Wolf (1976): ${sWon ? '✓ Restablecido' : '✗ Pendiente'}`,
                `• Victoria real en Tank (1974): ${tWon ? '✓ Restablecido' : '✗ Pendiente'}`,
                `• Victoria real en Galaxian (1979): ${gWon ? '✓ Restablecido' : '✗ Pendiente'}`,
                `• Cartucho Maestro ORIGEN estabilizado: ${hasOrigen ? '✓ En Mochila' : '✗ Pendiente'}`,
              ],
              hint: 'Supera las cuatro cabinas y forja el Cartucho ORIGEN en la Cueva Glitch.',
              accentHex: '#ef4444',
            });
          }
          return;
        }

        retroAudio.echoDiscover();
        if (exam.secretIdToDiscover) {
          callbacksRef.current.onDiscoverSecret(exam.secretIdToDiscover);
        }
        if (exam.clueIdToDiscover) {
          callbacksRef.current.onDiscoverClue(exam.clueIdToDiscover);
          if (!st.progressState.rpg.questStates['quest-casos-origen']) {
            callbacksRef.current.onUpdateQuest('quest-casos-origen', 'active');
          }
        }
        setActiveDialog({
          category: exam.category,
          title: exam.label,
          paragraphs: exam.paragraphs,
          hint: exam.hint,
          accentHex: exam.accentHex,
        });
        return;
      }

      if (target.kind === 'sub-npc') {
        const snpc = RPG_SUBAREA_NPCS.find((n) => n.id === target.id);
        if (!snpc) return;
        retroAudio.npcBlip(snpc.pitch);
        callbacksRef.current.onTalkNpc(snpc.id);

        if (snpc.id === 'npc-dylan-tecnico') {
          const cuatroCaminosDone = st.progressState.rpg.cuatroCaminosRestored;
          const hasTransistors =
            st.progressState.rpg.inventoryItems.includes('item-transistores-germanio') ||
            st.progressState.rpg.germaniumTransistorsDelivered ||
            st.allUnlocked;

          if (cuatroCaminosDone) {
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Sala de Los Cuatro Caminos Restaurada',
              paragraphs: [
                '«¡Gran trabajo, Arquitecto! Las cuatro cabinas (Lunar Lander, Sea Wolf, Tank y Galaxian) operan con sincronía perfecta gracias a los 3 transistores de germanio.»',
                '«Si conquistas victorias en los cuatro gabinetes y forjas el Cartucho Maestro ORIGEN en la Cueva Glitch, el sello del portón norte al castillo de Gran Koopa se desactivará.»',
              ],
              accentHex: snpc.palette.glow,
            });
          } else if (hasTransistors) {
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Transistores de Germanio Listos',
              paragraphs: [
                '«¡Extraordinario! Traes los 3 transistores de germanio de alta velocidad del circuito de Night Driver.»',
                '«Tomaré los componentes para instalarlos en las fuentes conmutadas. Salgamos del taller: te acompañaré caminando directamente hasta la Sala de Los Cuatro Caminos para calibrar cada cabina.»',
              ],
              primaryAction: {
                label: 'Iniciar Marcha Conjunta con Dylan',
                onSelect: () => {
                  retroAudio.zoneChime();
                  callbacksRef.current.onSetRpgFlag?.('dylanEscortActive', true);
                  callbacksRef.current.onSetRpgFlag?.('germaniumTransistorsDelivered', true);
                  transitionToArea(
                    'exterior-70s',
                    710,
                    1690,
                    'down',
                    'Dylan te acompaña físicamente. Guíalo al norte hacia Los Cuatro Caminos.'
                  );
                },
              },
              accentHex: '#38bdf8',
            });
          } else {
            callbacksRef.current.onUpdateQuest('quest-cuatro-caminos-dylan', 'active');
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Misión: Reparar Los Cuatro Caminos [Q]',
              paragraphs: [
                '«¡Saludos, Arquitecto! Soy Dylan, técnico jefe de Retro State. Gran Koopa lanzó una sobrecarga de entropía sobre la Sala de Los Cuatro Caminos al norte y averió las fuentes de poder de las cuatro cabinas.»',
                '«Para devolverles la vida necesito con urgencia 3 transistores de germanio de alta velocidad. Se encuentran en la costa oriental (Zona 05/08), custodiados como premio al completar la ruta nocturna en la terminal de Night Driver (1976).»',
                '«Conduce la motocicleta hasta la meta de Night Driver, tráeme los 3 transistores, y te acompañaré a reparar Lunar Lander, Sea Wolf, Tank y Galaxian.»',
              ],
              hint: 'Dirígete a la costa este para superar Night Driver y obtener los 3 transistores de germanio.',
              accentHex: '#f59e0b',
            });
          }
          return;
        }

        if (snpc.id === 'npc-maestro-kertz') {
          const qDone = st.progressState.rpg.questStates['quest-taller-ttl'] === 'completed';
          const hasCap =
            st.progressState.rpg.inventoryItems.includes('item-condensador-cuarzo') ||
            st.allUnlocked;
          if (qDone) {
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Misión Completada · Soldador Lógico entregado',
              paragraphs: [
                '«¡Ese Condensador de Cuarzo estabilizó todos mis osciloscopios! Usa bien el Soldador Lógico en las Ruinas del Sur para reactivar el viejo relé del puente costero.»',
                '«Por cierto... ¿has notado la corriente fría que sale de los ladrillos del muro norte?»',
              ],
              accentHex: snpc.palette.glow,
            });
          } else if (hasCap) {
            retroAudio.questComplete();
            callbacksRef.current.onUpdateQuest('quest-taller-ttl', 'completed', [
              'item-soldador-logico',
            ]);
            setActiveDialog({
              category: '¡MISIÓN COMPLETADA! · INGENIERÍA TTL',
              title: snpc.name,
              subtitle: 'Recompensa recibida: Soldador Lógico de Precisión',
              paragraphs: [
                '«¡Increíble, Pixel! Cuarzo hexadecimal puro de las cavernas del noroeste. Mis generadores de pulso vuelven a latir como en 1972.»',
                '«Toma mi Soldador Lógico de Precisión. Con él podrás reparar el Relé Auxiliar averiado en las Ruinas Centrales y abrir atajos antiguos.»',
              ],
              hint: 'Nueva herramienta desbloqueada en tu Mochila [I]: Soldador Lógico.',
              accentHex: '#10b981',
            });
          } else {
            callbacksRef.current.onUpdateQuest('quest-taller-ttl', 'active');
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Nueva Misión: El Condensador de Cuarzo [Q]',
              paragraphs: [
                '«Bienvenido al Taller Analógico. Aquí ensamblábamos máquinas enteras sin microprocesadores, solo con ingenio y compuertas TTL.»',
                '«Mi fuente principal perdió estabilidad. Si encuentras un Condensador de Cuarzo Puro en algún cofre de las Cavernas del Código al noroeste, te forjaré un Soldador Lógico.»',
              ],
              hint: 'Revisa tus encargos activos pulsando [Q].',
              accentHex: snpc.palette.glow,
            });
          }
          return;
        }

        if (snpc.id === 'npc-archivera-lira') {
          const qDone =
            st.progressState.rpg.questStates['quest-archivo-cartuchos'] === 'completed';
          const hasAlpha =
            st.progressState.rpg.inventoryItems.includes('item-cinta-alfa') ||
            st.allUnlocked;
          const hasBeta =
            st.progressState.rpg.inventoryItems.includes('item-cinta-beta') ||
            st.allUnlocked;

          if (qDone) {
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Archivo Histórico Sincronizado',
              paragraphs: [
                '«Ambas Cintas Magnéticas giran ya en las bobinas maestras del Templo. Recuerda emitir pulsos con tu Escáner TTL [R] cuando sospeches de muros o cascadas.»',
              ],
              accentHex: snpc.palette.glow,
            });
          } else if (hasAlpha && hasBeta) {
            retroAudio.questComplete();
            callbacksRef.current.onUpdateQuest('quest-archivo-cartuchos', 'completed', [
              'item-escaner-frecuencias',
            ]);
            setActiveDialog({
              category: '¡MISIÓN COMPLETADA! · ARCHIVO PIONERO',
              title: snpc.name,
              subtitle: 'Recompensa: Escáner de Secretos TTL [R]',
              paragraphs: [
                '«¡Has reunido las Cintas Alfa (1971) y Beta (1975)! La memoria documental de la primera década vuelve a estar íntegra.»',
                '«Recibe este Escáner de Secretos TTL. Pulsa [R] en cualquier zona para lanzar una onda armónica que revela cofres, pistas y paredes falsas.»',
              ],
              hint: 'También puedes resolver las losetas I → II → III del suelo para abrir el cofre de la bóveda.',
              accentHex: '#00f3ff',
            });
          } else {
            callbacksRef.current.onUpdateQuest('quest-archivo-cartuchos', 'active');
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: `Cintas recuperadas: ${(hasAlpha ? 1 : 0) + (hasBeta ? 1 : 0)} / 2`,
              paragraphs: [
                '«Custodio la memoria grabada del Archipiélago Cero, pero el colapso dispersó dos carretes esenciales: la Cinta Alfa en la costa sur y la Cinta Beta detrás de la cascada del norte.»',
                '«Además, si lees la estela izquierda y pisas las losetas en orden I → II → III, abrirás el Cofre Armónico del Templo.»',
              ],
              accentHex: snpc.palette.glow,
            });
          }
          return;
        }

        if (snpc.id === 'npc-ermitano-cascada') {
          const qDone =
            st.progressState.rpg.questStates['quest-secreto-cascada'] === 'completed';
          const hasRelic =
            st.progressState.rpg.inventoryItems.includes('item-reliquia-osciloscopio') ||
            st.allUnlocked;

          if (qDone) {
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Portador de la Corona Estelar',
              paragraphs: [
                '«El destello verde de 1958 ilumina ahora esta gruta silenciosa. Eres un verdadero explorador de secretos, Pixel.»',
              ],
              accentHex: snpc.palette.glow,
            });
          } else if (hasRelic) {
            retroAudio.questComplete();
            callbacksRef.current.onUpdateQuest('quest-secreto-cascada', 'completed', [
              'item-manto-arquitecto',
            ]);
            setActiveDialog({
              category: '¡MISIÓN SECRETA COMPLETADA!',
              title: snpc.name,
              subtitle: 'Recompensa: Corona Estelar del Descubridor (Cosmético)',
              paragraphs: [
                '«¡Por todos los cátodos antiguos! ¡La Válvula de Osciloscopio de 1958! Entonces encontraste el muro falso oculto en el Taller Analógico.»',
                '«Acepta la Corona Estelar del Descubridor. Puedes equiparla desde tu Mochila [I] para que brille sobre tu avatar mientras recorres el archipiélago.»',
              ],
              accentHex: '#fde047',
            });
          } else {
            callbacksRef.current.onUpdateQuest('quest-secreto-cascada', 'active');
            setActiveDialog({
              category: snpc.role.toUpperCase(),
              title: snpc.name,
              subtitle: 'Misión Secreta: El Secreto Tras la Cascada',
              paragraphs: [
                '«Pocos viajeros cruzan el velo de agua de La Garganta... Medito aquí custodiando el recuerdo anterior a las recreativas.»',
                '«En el muro norte del Taller Analógico existe un ladrillo hueco que conduce a una cámara sellada de 1958. Si me muestras su Válvula luminiscente, te otorgaré una reliquia real.»',
              ],
              hint: 'Si la cueva está oscura, enciende tu Lámpara de Fósforo con [L] para ver el cofre sumergido al noreste.',
              accentHex: snpc.palette.glow,
            });
          }
          return;
        }

        if (snpc.id === 'npc-cronista-orfeo') {
          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: 'Zona 1 · Centro de Historia del Videojuego',
            paragraphs: [
              '«¡Bienvenido al Centro de Historia del Pueblo del Origen! Esta isla conserva en cinco regiones la chispa que dio vida a los videojuegos.»',
              '«Al este se extienden Las Praderas del Pixel con Pong (1972); al oeste, El Bosque de los Secretos oculta senderos entre los árboles; al norte arde La Fortaleza Volcánica con Space Invaders (1978); y en La Costa las rocas esconden túneles subterráneos.»',
            ],
            hint: 'Examina los murales de 1958, 1972 y 1978 en esta sala o camina detrás de este edificio para hallar un callejón secreto.',
            accentHex: snpc.palette.glow,
          });
          return;
        }

        if (snpc.id === 'npc-capitana-vectoria') {
          callbacksRef.current.onUpdateQuest(
            'quest-despertar-1981',
            st.dkRestored ? 'completed' : 'active',
            st.dkRestored ? ['item-insignia-vigas-1981'] : []
          );
          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: st.dkRestored
              ? '¡Hito Vertical de 1981 Restaurado!'
              : 'Expansión Desbloqueada · Década de 1980',
            paragraphs: st.dkRestored
              ? [
                  '«¡Brillante ascenso sobre las vigas rojas, Arquitecto! El Emblema de 1981 ya luce en tu inventario y el Paseo Neón vibra con nueva energía.»',
                  '«No olvides revisar el callejón noreste si ya encontraste la Llave Binaria de 8 Pines.»',
                ]
              : [
                  '«¡Bienvenido a la Isla Neón de los años 80! Gracias a tu defensa en Space Invaders, el Navío Astral puede cruzar libremente entre décadas.»',
                  '«Al este del paseo te aguarda el gabinete clásico de plataformas verticales de 1981. ¡Esquiva los barriles y rescata la memoria de la nueva era!»',
                ],
            accentHex: snpc.palette.glow,
          });
          return;
        }

        if (snpc.id === 'npc-automa-crono') {
          const tm = evaluateTimeMachineStatus(st.progressState, st.allUnlocked);
          if (
            !st.progressState.rpg.discoveredSecretIds.includes(
              'secret-cronoscopio-hallado'
            )
          ) {
            callbacksRef.current.onDiscoverSecret('secret-cronoscopio-hallado');
          }
          if (!tm.canTravelTo80s) {
            callbacksRef.current.onUpdateQuest('quest-cronoscopio-origen', 'active');
          } else if (
            st.progressState.rpg.questStates['quest-cronoscopio-origen'] !== 'completed'
          ) {
            callbacksRef.current.onUpdateQuest('quest-cronoscopio-origen', 'completed', [
              'item-insignia-crononauta',
            ]);
          }

          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: tm.canTravelTo80s
              ? 'Etapa 4/4 Activa · Apertura Temporal 1980s Lista'
              : `Observatorio del Cronoscopio · Etapa ${tm.stageNumber}/4`,
            paragraphs: tm.canTravelTo80s
              ? [
                  '«¡Asombroso, Pixel! Los anillos de bronce y fósforo cantan al unísono: 1972, el Sendero del Glitch y 1978 laten estabilizados dentro del núcleo.»',
                  '«Acércate a la consola central de El Cronoscopio y pulsa [E] cuando estés listo para cruzar el umbral temporal hacia la década de 1980. Podrás regresar a esta isla siempre que quieras.»',
                ]
              : [
                  '«Saludos, viajero. Custodio El Cronoscopio desde que las décadas se fragmentaron en islas aisladas.»',
                  '«Para despertar su salto temporal hacia los años 80 necesitas restaurar la memoria completa de los años 70 (Pong, El Sendero del Glitch y Space Invaders). Además, al norte de las Cavernas de Memoria un Portal Abisal guarda nuestra Bobina de Resonancia original.»',
                ],
            hint: 'También puedes grabar los 3 Glifos de Pulso ([ ◈ ], [ ◈◈ ], [ ◈◈◈ ]) en la Aldea, el Bosque y la Costa para activar los Portales Anómalos exteriores.',
            accentHex: snpc.palette.glow,
          });
          return;
        }

        if (snpc.id === 'npc-curadora-selene') {
          if (!st.progressState.rpg.questStates['quest-casos-origen']) {
            callbacksRef.current.onUpdateQuest('quest-casos-origen', 'active');
          }
          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: `Museo Viviente de los 70 · Vitrinas inspeccionadas: ${st.progressState.rpg.inspectedExhibitIds.length}/${MUSEUM_1970S_EXHIBITS.length}`,
            paragraphs: [
              '«¡Bienvenido al Museo Viviente de la Década de 1970! Aquí conviven los gabinetes jugables restaurados por ti —como Pong (1972), Breakout (1976) y Space Invaders (1978)— junto a exhibiciones históricas documentadas como Computer Space (1971), Magnavox Odyssey (1972), Gran Trak 10 (1974), Lunar Lander (1979) y Asteroids (1979).»',
              st.breakoutRestored
                ? '«¡La vitrina de Breakout (1976) brilla ya con sus cuatro bandas cromáticas restauradas! No olvides calibrar el Proyector Vectorial QuadraScan XY en el centro del salón si observaste los ángulos de Vectra-79 en las cavernas.»'
                : '«Notarás que el pedestal de Breakout (1976) en el ala derecha permanece cifrado: su gabinete original descansa bajo una escotilla secreta al norte de Las Praderas de Pong.»',
            ],
            hint: 'Examina cada pedestal para reunir pistas de tus Casos de Investigación [Q].',
            accentHex: snpc.palette.glow,
          });
          return;
        }

        if (snpc.id === 'npc-centinela-galahad') {
          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: 'Murallas del Destierro · Patio de Armas',
            paragraphs: [
              '«¡Saludos, noble viajero del píxel! Soy Sir Galahad, el último centinela leal a Donkey Kong.»',
              '«Super KOOPA ha sellado el acceso al interior de la fortaleza con cuatro pilares rúnicos: Sol ☀, Luna ☾, Estrella ★ y Rayo ⚡.»',
              '«Examina la estela del centro y activa los cuatro pedestales en ese orden exacto para hacer descender las pesadas vigas del puente levadizo.»',
            ],
            hint: 'Activa Sol ☀ → Luna ☾ → Estrella ★ → Rayo ⚡ para bajar el puente levadizo.',
            accentHex: snpc.palette.glow,
          });
          return;
        }

        if (snpc.id === 'npc-cartografo-gunter') {
          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: 'Laberinto de las Doce Puertas · Explorador',
            paragraphs: [
              '«¡Por todos los mapas antiguos! Me llamo Gunter y llevo horas atascado en esta telaraña de compuertas.»',
              '«Las doce puertas te confunden si caminas a ciegas. La clave está en seguir la ruta cronológica de las décadas: Computer Space (1971) → Pong (1972) → Breakout (1976) → Space Invaders (1978).»',
              '«Si ves la reja con cerrojo mecánico en la pared este, interactúa con ella para habilitar un atajo permanente.»',
            ],
            hint: 'Sigue la ruta 1971 → 1972 → 1976 → 1978 para alcanzar la escalera a los Cimientos.',
            accentHex: snpc.palette.glow,
          });
          return;
        }

        if (snpc.id === 'npc-ingeniero-volcan') {
          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: 'Cimientos del Reino · Jefe de Maquinaria',
            paragraphs: [
              '«¡Atención, viajero! La fosa central está anegada de agua hirviente y el montacargas principal carece de presión.»',
              '«Para purgar el canal hidráulico debes calibrar las tres válvulas en el orden correcto de flujo: primero el Caudal [A], luego la Válvula de Vapor [C] y finalmente el Drenaje [B].»',
              '«Una vez desalojada el agua, los pistones subirán y el ascensor a la Gran Biblioteca quedará expedito.»',
            ],
            hint: 'Gira las válvulas en orden: Caudal [A] → Vapor [C] → Drenaje [B].',
            accentHex: snpc.palette.glow,
          });
          return;
        }

        if (snpc.id === 'npc-archivero-ovidio') {
          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: 'Gran Biblioteca de los Reyes · Archivero Real',
            paragraphs: [
              '«Bienvenido al sagrario de los libros. Soy el Archivero Ovidio, custodio de las memorias del reino.»',
              '«Para revelar el pasadizo secreto hacia la Torre del Tiempo, debes recuperar los cuatro fragmentos de la Crónica del Rey (I, II, III, IV) y depositarlos en sus atriles dedicados con luz.»',
              '«Al completar la cuarta peana, los contrapesos de roble y bronce moverán la gran estantería del centro.»',
            ],
            hint: 'Recoge las crónicas y colócalas en los atriles I, II, III y IV.',
            accentHex: snpc.palette.glow,
          });
          return;
        }

        if (snpc.id === 'npc-crono-vigia') {
          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: 'La Torre del Tiempo · Maestro Relojero',
            paragraphs: [
              '«Estás a las puertas del santuario supremo. Los engranajes colosales del reloj del tiempo han perdido la sincronía.»',
              '«Acciona la Palanca del Engranaje Mayor a la izquierda y la Palanca del Péndulo Boreal a la derecha para equilibrar la marcha.»',
              '«Cuando ambas ruedas canten al unísono, las grandes puertas dobles hacia la Sala del Trono cederán.»',
            ],
            hint: 'Acciona la palanca izquierda y la palanca derecha para abrir la Sala del Trono.',
            accentHex: snpc.palette.glow,
          });
          return;
        }

        if (snpc.id === 'npc-donkey-kong-freed') {
          setActiveDialog({
            category: snpc.role.toUpperCase(),
            title: snpc.name,
            subtitle: 'Isla Orígenes Liberada · Monarca Restaurado',
            paragraphs: [
              '«"¡Gracias de nuevo, Pixel! La pesadilla de Super KOOPA se disipa de la cumbre y el cielo estelar brilla despejado."»',
              '«"Tienes en tu poder el Pase de Travesía de Isla Orígenes. Aborda la nave de Space Invaders en el hangar norte y actívala: tu destino es la legendaria Isla de los 80."»',
            ],
            hint: 'Acércate a la nave de Space Invaders en el hangar e inserta el Pase de Travesía [E].',
            accentHex: snpc.palette.glow,
          });
          return;
        }
      }

      if (target.kind === 'labyrinth-hatch') {
        const firstVisit = !st.progressState.rpg.discoveredSecretIds.includes(
          'secret-laberinto-1976'
        );
        if (firstVisit) {
          retroAudio.secretFound();
          callbacksRef.current.onDiscoverSecret('secret-laberinto-1976');
        }
        if (!st.progressState.rpg.questStates['quest-muro-1976']) {
          callbacksRef.current.onUpdateQuest('quest-muro-1976', 'active');
        }
        exteriorReturnPosRef.current = {
          x: LABYRINTH_1976_ENTRANCE.returnExteriorX,
          y: LABYRINTH_1976_ENTRANCE.returnExteriorY,
        };
        transitionToArea(
          LABYRINTH_1976_ENTRANCE.targetArea,
          LABYRINTH_1976_ENTRANCE.targetSpawnX,
          LABYRINTH_1976_ENTRANCE.targetSpawnY,
          'up',
          firstVisit
            ? '¡Descubriste el Laberinto Subterráneo de Señales (Sector 1976)!'
            : 'Descendiendo al Laberinto de Señales · Sector 1976'
        );
        return;
      }

      if (target.kind === 'labyrinth-secret-door') {
        const solved =
          st.allUnlocked ||
          st.progressState.rpg.solvedPuzzleIds.includes(LABYRINTH_SECRET_DOOR.puzzleId);
        if (!solved) {
          retroAudio.npcBlip(0.75);
          setActiveDialog({
            category: 'COMPUERTA DE CUATRO BANDAS · SELLADA',
            title: LABYRINTH_SECRET_DOOR.label,
            subtitle: `Pilares RGB sincronizados: ${activeRgbPillarsRef.current.length} / 4`,
            paragraphs: [
              'Cuatro cerrojos ópticos mantienen sellada la Sala Secreta de 1976. Debes activar los cuatro pilares cromáticos del laberinto en el orden ascendente en que la esfera perfora el muro de Breakout.',
            ],
            hint: 'Consulta la estela del corredor noroeste o el cuaderno del Taller Analógico (Amarillo → Verde → Naranja → Rojo).',
            accentHex: '#f97316',
          });
          return;
        }
        if (
          !st.progressState.rpg.discoveredSecretIds.includes('secret-sala-breakout-1976')
        ) {
          callbacksRef.current.onDiscoverSecret('secret-sala-breakout-1976');
        }
        transitionToArea(
          LABYRINTH_SECRET_DOOR.targetArea,
          LABYRINTH_SECRET_DOOR.targetSpawnX,
          LABYRINTH_SECRET_DOOR.targetSpawnY,
          'up',
          'Sala Secreta de las Cuatro Bandas · Prototipo Breakout (1976)'
        );
        return;
      }

      if (target.kind === 'rgb-pillar') {
        const pillar = LABYRINTH_RGB_PILLARS.find((p) => p.id === target.id);
        if (!pillar) return;
        const alreadySolved = st.progressState.rpg.solvedPuzzleIds.includes(
          LABYRINTH_SECRET_DOOR.puzzleId
        );
        if (alreadySolved) {
          retroAudio.puzzleNodeTone(pillar.stepOrder);
          showToast(`${pillar.bandName} · Frecuencia bloqueada en fase óptima.`);
          return;
        }
        const curSeq = activeRgbPillarsRef.current;
        if (curSeq.includes(pillar.stepOrder)) {
          retroAudio.puzzleNodeTone(pillar.stepOrder);
          showToast(`${pillar.bandName} ya está encendido (${curSeq.length}/4).`);
          return;
        }
        const expected = curSeq.length + 1;
        if (pillar.stepOrder === expected) {
          const nextSeq = [...curSeq, pillar.stepOrder];
          activeRgbPillarsRef.current = nextSeq;
          retroAudio.puzzleNodeTone(pillar.stepOrder);
          if (nextSeq.length === 4) {
            retroAudio.secretFound();
            callbacksRef.current.onSolvePuzzle(LABYRINTH_SECRET_DOOR.puzzleId);
            showToast(
              '¡Secuencia RGB 1976 completada! La Compuerta Norte hacia Breakout se ha desbloqueado.'
            );
          } else {
            showToast(
              `Frecuencia ${pillar.pointsHint} sintonizada (${nextSeq.length}/4)`
            );
          }
        } else {
          activeRgbPillarsRef.current = [];
          retroAudio.npcBlip(0.66);
          showToast(
            'Secuencia cromática fuera de fase · Reiniciando pilares (comienza por la base Amarilla).'
          );
        }
        return;
      }

      if (target.kind === 'breakout-cabinet') {
        if (
          !st.progressState.rpg.discoveredSecretIds.includes('secret-sala-breakout-1976')
        ) {
          callbacksRef.current.onDiscoverSecret('secret-sala-breakout-1976');
        }
        retroAudio.uiClick();
        callbacksRef.current.onSavePosition(playerPosBridgeRef.current.x, playerPosBridgeRef.current.y);
        if (target.id === 'cabinet-breakout-crossroads-1976') callbacksRef.current.onEnterBreakoutFromNorth?.();
        else callbacksRef.current.onEnterBreakout();
        return;
      }

      if (target.kind === 'north-arcade') {
        if (!st.progressState.rpg.cuatroCaminosRestored && !st.allUnlocked) {
          retroAudio.npcBlip(0.7);
          setActiveDialog({
            category: 'SALA ARCADE · LOS CUATRO CAMINOS',
            title: 'Máquina Fuera de Servicio',
            subtitle: 'Sobrecarga de entropía provocada por Gran Koopa',
            paragraphs: [
              'Los circuitos lógicos de este gabinete fundacional fueron saboteados por Gran Koopa.',
              'Los custodios Rodo y Nora indican que el técnico Dylan en «Taller RS — Retro State» (al suroeste) puede reparar las cuatro máquinas si le entregas 3 transistores de germanio.',
            ],
            hint: 'Consigue los 3 transistores completando la ruta de Night Driver en la costa este y habla con Dylan en el taller.',
            accentHex: '#f43f5e',
          });
          return;
        }
        callbacksRef.current.onSavePosition(playerPosBridgeRef.current.x, playerPosBridgeRef.current.y);
        retroAudio.uiClick();
        if (target.id === 'asteroids') callbacksRef.current.onEnterAsteroids?.();
        else if (target.id === 'sea-wolf') callbacksRef.current.onEnterSeaWolf?.();
        else if (target.id === 'tank') callbacksRef.current.onEnterTank?.();
        else if (target.id === 'lunar-lander') callbacksRef.current.onEnterLunarLander?.();
        else if (target.id === 'galaxian') callbacksRef.current.onEnterGalaxian?.();
        return;
      }

      if (target.kind === 'night-driver-cabinet') {
        callbacksRef.current.onSavePosition(playerPosBridgeRef.current.x, playerPosBridgeRef.current.y);
        retroAudio.uiClick();
        callbacksRef.current.onEnterNightDriver?.();
        return;
      }

      if (target.kind === 'volcanic-arcade') {
        callbacksRef.current.onSavePosition(playerPosBridgeRef.current.x, playerPosBridgeRef.current.y);
        retroAudio.uiClick();
        if (target.id === 'asteroids') callbacksRef.current.onEnterAsteroids?.();
        else if (target.id === 'breakout') {
          if (callbacksRef.current.onEnterBreakoutFromNorth) callbacksRef.current.onEnterBreakoutFromNorth();
          else callbacksRef.current.onEnterBreakout();
        }
        return;
      }

      if (target.kind === 'breakout-stone') {
        if (!st.breakoutRestored) {
          setActiveDialog({
            category: 'RELIQUIA DEL BASTIÓN · BREAKOUT 1976',
            title: 'La Paleta Sellada en Basalto',
            paragraphs: ['Una paleta de cuatro bandas sobresale de la roca volcánica. Las grietas brillan alrededor de su empuñadura, pero la piedra no cede.', 'La inscripción de cobre dice: «Solo quien restaure el muro de BREAKOUT podrá reclamar la hoja».' ],
            hint: 'Supera BREAKOUT en el gabinete junto a la piedra.',
            accentHex: '#f5bb44',
          });
        } else if (!st.progressState.rpg.discoveredSecretIds.includes('breakout-sword-extracted')) {
          startBreakoutSwordExtraction();
        } else {
          setActiveDialog({
            category: 'ARMA LEGENDARIA · EQUIPADA',
            title: 'Espada Paleta de BREAKOUT',
            paragraphs: ['El basalto se abrió alrededor de la empuñadura. La Espada Paleta ya forma parte de tu mochila y responde al poder de combate [2].'],
            accentHex: '#f5bb44',
          });
        }
        return;
      }

      if (target.kind === 'museum-pedestal') {
        const exhibit = MUSEUM_1970S_EXHIBITS.find((e) => e.id === target.id);
        if (!exhibit) return;

        callbacksRef.current.onInspectExhibit(exhibit.id);

        if (
          exhibit.id === 'exhibit-pong-1972' ||
          exhibit.id === 'exhibit-odyssey-1972'
        ) {
          callbacksRef.current.onDiscoverClue('clue-museo-odyssey-pong');
        } else if (exhibit.id === 'exhibit-breakout-1976') {
          callbacksRef.current.onDiscoverClue('clue-museo-breakout-hint');
        } else if (
          exhibit.id === 'exhibit-lunar-lander-1979' ||
          exhibit.id === 'exhibit-asteroids-1979'
        ) {
          callbacksRef.current.onDiscoverClue('clue-museo-vector-1979');
        }

        const isEncryptedBreakout =
          exhibit.id === 'exhibit-breakout-1976' &&
          !st.breakoutRestored &&
          !st.progressState.rpg.discoveredSecretIds.includes('secret-sala-breakout-1976');

        if (isEncryptedBreakout) {
          retroAudio.npcBlip(0.8);
          setActiveDialog({
            category: 'VITRINA CIFRADA · HITO JUGABLE OCULTO (1976)',
            title: 'Señal Encriptada: El Muro de Cuatro Bandas',
            subtitle: 'Pista registrada en tu Diario de Investigación [Q]',
            paragraphs: [
              'El proyector muestra cuatro franjas traslúcidas (amarillo, verde, naranja y rojo) vibrando en estática. La placa indica que el gabinete original de 1976 fue resguardado en una cámara subterránea al norte de Las Praderas de Pong.',
              'Nota técnica conservada: su diseño original en Atari redujo la placa a menos de cincuenta chips TTL antes del nacimiento del ordenador personal moderno.',
            ],
            hint: 'Busca la Escotilla Subterránea al norte del Santuario de Pong para descubrir y jugar Breakout (1976).',
            accentHex: '#f97316',
          });
          return;
        }

        retroAudio.echoDiscover();
        let primaryAction: ActiveDialogModal['primaryAction'] = undefined;
        if (exhibit.mode === 'playable') {
          if (exhibit.linkedGameId === 'pong') {
            primaryAction = {
              label: st.pongRestored ? 'Jugar Pong (1972)' : 'Ir a Pong (1972)',
              onSelect: () => {
                setActiveDialog(null);
                callbacksRef.current.onEnterPong();
              },
            };
          } else if (
            exhibit.linkedGameId === 'breakout' &&
            (st.breakoutRestored ||
              st.progressState.rpg.discoveredSecretIds.includes(
                'secret-sala-breakout-1976'
              ))
          ) {
            primaryAction = {
              label: st.breakoutRestored
                ? 'Rejugar Breakout (1976)'
                : `Jugar Breakout (Meta ${BREAKOUT_UNLOCK_SCORE} PTS)`,
              onSelect: () => {
                setActiveDialog(null);
                callbacksRef.current.onEnterBreakout();
              },
            };
          } else if (
            exhibit.linkedGameId === 'space-invaders' &&
            st.invadersCabinetUnlocked
          ) {
            primaryAction = {
              label: st.invadersRestored
                ? 'Rejugar Space Invaders (1978)'
                : 'Jugar Space Invaders (1978)',
              onSelect: () => {
                setActiveDialog(null);
                callbacksRef.current.onEnterSpaceInvaders();
              },
            };
          } else if (exhibit.linkedGameId === 'asteroids') {
            primaryAction = {
              label: 'Jugar Asteroids (1979)',
              onSelect: () => {
                setActiveDialog(null);
                callbacksRef.current.onEnterAsteroids?.();
              },
            };
          } else if (exhibit.linkedGameId === 'sea-wolf') {
            primaryAction = {
              label: 'Jugar Sea Wolf (1976)',
              onSelect: () => {
                setActiveDialog(null);
                callbacksRef.current.onEnterSeaWolf?.();
              },
            };
          } else if (exhibit.linkedGameId === 'tank') {
            primaryAction = {
              label: 'Jugar Tank (1974)',
              onSelect: () => {
                setActiveDialog(null);
                callbacksRef.current.onEnterTank?.();
              },
            };
          } else if (exhibit.linkedGameId === 'lunar-lander') {
            primaryAction = {
              label: 'Jugar Lunar Lander (1979)',
              onSelect: () => {
                setActiveDialog(null);
                callbacksRef.current.onEnterLunarLander?.();
              },
            };
          }
        }

        setActiveDialog({
          category:
            exhibit.mode === 'playable'
              ? `MUSEO VIVIENTE · VIDEOJUEGO JUGABLE (${exhibit.year})`
              : exhibit.mode === 'playable-pending'
              ? `MUSEO VIVIENTE · DESAFÍO JUGABLE PENDIENTE (${exhibit.year})`
              : `MUSEO VIVIENTE · EXHIBICIÓN HISTÓRICA DOCUMENTADA (${exhibit.year})`,
          title: `${exhibit.title} (${exhibit.year})`,
          subtitle: `${exhibit.creator} · ${exhibit.company}`,
          paragraphs: [
            exhibit.museumProfile,
            `Género: ${exhibit.genre}`,
            `Mecánicas: ${exhibit.mechanics}`,
            `Aporte histórico: ${exhibit.historicalContribution}`,
            `Dato curioso: ${exhibit.funFact}`,
            `Hardware: ${exhibit.hardwareType}`,
            `Nota curatorial: ${exhibit.curatorialNote}`,
          ],
          hint:
            exhibit.mode === 'playable'
              ? 'Este título forma parte del catálogo jugable activo de PIXELVERSE.'
              : exhibit.mode === 'playable-pending'
              ? 'Desafío acordado, pero su implementación sigue pendiente. No se puede iniciar una partida desde esta vitrina.'
              : 'Pieza de archivo documental e interactivo del Museo Viviente de los años 70.',
          accentHex: exhibit.accentHex,
          museumExhibit: exhibit,
          disabledAction:
            exhibit.mode === 'playable-pending'
              ? 'Asteroids · implementación pendiente'
              : undefined,
          primaryAction,
        });
        return;
      }

      if (target.kind === 'vector-console') {
        const solved =
          st.allUnlocked ||
          st.progressState.rpg.solvedPuzzleIds.includes(MUSEUM_VECTOR_CONSOLE.puzzleId);
        if (solved) {
          retroAudio.echoDiscover();
          showToast(
            'Proyector QuadraScan XY alineado en 45° · 90° · 180° — Vitrinario Vectorial abierto.'
          );
          return;
        }
        retroAudio.uiClick();
        setVectorModalOpen(true);
        return;
      }

      if (target.kind === 'guardian-creature') {
        const cr = GUARDIAN_CREATURES.find((c) => c.id === target.id);
        if (!cr) return;
        const alreadyCalmed =
          st.allUnlocked || st.progressState.rpg.calmedCreatureIds.includes(cr.id);

        if (cr.requiresLanternOrScanner && !alreadyCalmed) {
          const lanternReady = st.progressState.rpg.lanternActive;
          if (!lanternReady) {
            retroAudio.creatureChime(false);
            setActiveDialog({
              category: cr.speciesLabel,
              title: cr.name,
              subtitle: 'Corredor protegido por resonancia de fase',
              paragraphs: [
                'El centinela geométrico vibra en desfase e impide cruzar el pasillo central del Laberinto de Señales.',
                'Enciende tu Lámpara de Fósforo [L] antes de interactuar con él, o emite un pulso con el Escáner de Secretos [R] a su lado para armonizar su frecuencia.',
              ],
              accentHex: cr.accentHex,
            });
            return;
          }
        }

        retroAudio.creatureChime(true);
        if (!alreadyCalmed) {
          callbacksRef.current.onCalmCreature(cr.id);
        }
        if (cr.clueIdGranted) {
          callbacksRef.current.onDiscoverClue(cr.clueIdGranted);
          if (!st.progressState.rpg.questStates['quest-casos-origen']) {
            callbacksRef.current.onUpdateQuest('quest-casos-origen', 'active');
          }
        }
        setActiveDialog({
          category: cr.speciesLabel,
          title: cr.name,
          subtitle: cr.clueIdGranted
            ? 'Frecuencia sintonizada · Evidencia añadida al Diario [Q]'
            : 'Frecuencia armonizada · Paso despejado',
          paragraphs: [cr.calmedMessage],
          accentHex: cr.accentHex,
        });
        return;
      }

      if (target.kind === 'dk-cabinet-80s') {
        retroAudio.uiClick();
        callbacksRef.current.onEnterDonkeyKong();
        return;
      }

      if (target.kind === 'pong-cabinet') {
        retroAudio.uiClick();
        callbacksRef.current.onEnterPong();
        return;
      }

      if (target.kind === 'pong-hoverboard-ride') {
        const routeCost = Math.ceil(
          PONG_BOARD_ROUTE_DURATION * getPongFlightFuelRate(st.progressState)
        );
        if (!st.allUnlocked && flightFuelRef.current < routeCost) {
          retroAudio.npcBlip(0.8);
          showToast(
            `⚠ Combustible insuficiente para el vuelo (${Math.floor(flightFuelRef.current)}/${routeCost}). Recarga la Paleta de Pong en el Punto de Guardado GBC.`
          );
          return;
        }
        if (!st.allUnlocked) {
          setFlightFuel(flightFuelRef.current - routeCost);
          persistFuelConsumption(routeCost, true);
        }
        retroAudio.hoverboardLaunch();
        const goingNorth = target.id === 'board-at-pong';
        vehicleFlightRef.current = {
          type: goingNorth ? 'pong-to-garganta' : 'garganta-to-pong',
          elapsed: 0,
          duration: PONG_BOARD_ROUTE_DURATION,
        };
        setFlightStatusText(
          goingNorth
            ? 'Tabla de Pong activada · Planeando hacia La Garganta del Invasor...'
            : 'Tabla de Pong activada · Planeando de regreso al Santuario de Pong (1972)...'
        );
        return;
      }

      if (target.kind === 'glitch-portal') {
        const pRec = st.progressState.games['pong'];
        const pongWon = Boolean(pRec?.completed || (pRec?.completionsCount ?? 0) > 0 || pRec?.memoryUnlocked);
        const bRec = st.progressState.games['breakout'];
        const breakoutWon = Boolean(bRec?.completed || (bRec?.completionsCount ?? 0) > 0 || bRec?.memoryUnlocked);
        const iRec = st.progressState.games['space-invaders'];
        const invadersWon =
          (Boolean(iRec?.completed || (iRec?.completionsCount ?? 0) > 0) || Boolean(iRec?.memoryUnlocked)) &&
          (iRec?.bestScore ?? 0) >= 1000;

        if ((!pongWon || !breakoutWon || !invadersWon) && !st.allUnlocked) {
          retroAudio.npcBlip(0.8);
          setActiveDialog({
            category: 'CUEVA GLITCH RPG · SELLO TRI-ERA BLOQUEADO',
            title: 'Portal de Acceso a la Cueva Glitch',
            subtitle: 'Requiere victorias reales en los tres pilares fundacionales',
            paragraphs: [
              'Las coordenadas de la Cueva Glitch están selladas por una anomalía de entropía.',
              'Para franquear el umbral se exige demostrar maestría en los 3 pilares:',
              `• Pong (1972): ${pongWon ? '✓ Restablecido' : '✗ Pendiente'}`,
              `• Breakout (1976): ${breakoutWon ? '✓ Restablecido' : '✗ Pendiente'}`,
              `• Space Invaders (1978, ≥1.000 pts): ${invadersWon ? `✓ Restablecido (${iRec?.bestScore ?? 0} PTS)` : `✗ Pendiente (${iRec?.bestScore ?? 0}/1.000 PTS)`}`,
              'Nota: Abandonar un minijuego no cuenta como victoria.',
            ],
            hint: 'Completa victorias reales en Pong, Breakout y supera 1.000 PTS en Space Invaders.',
            accentHex: '#a855f7',
          });
          return;
        }

        retroAudio.bridgeActivate();
        exteriorReturnPosRef.current = {
          x: playerPosBridgeRef.current.x,
          y: playerPosBridgeRef.current.y,
        };
        transitionToArea(
          'dungeon-cueva-glitch',
          625,
          810,
          'up',
          'Entrando a la Cueva Glitch · Profundidades Cuánticas'
        );
        return;
      }

      if (target.kind === 'invaders-cabinet') {
        if (!st.invadersCabinetUnlocked) {
          retroAudio.npcBlip(0.78);
          setActiveDialog({
            category: 'BASTIÓN DEFENSIVO 1978 · ACCESO BLOQUEADO',
            title: 'Gabinete Space Invaders (1978)',
            subtitle: 'Requiere reconstruir el Puente Astral',
            paragraphs: [
              'Los circuitos defensivos del bastión aguardan la señal del Puente Astral de La Garganta. Completa «El Sendero del Glitch Perdido» para sincronizar la energía de este gabinete.',
            ],
            hint: 'Cruza el portal espiral en La Garganta del Invasor para reunir las llaves del puente.',
            accentHex: '#f97316',
          });
          return;
        }
        retroAudio.uiClick();
        callbacksRef.current.onSavePosition(playerPosBridgeRef.current.x, playerPosBridgeRef.current.y);
        callbacksRef.current.onEnterSpaceInvaders();
        return;
      }

      if (target.kind === 'astrolabe') {
        retroAudio.echoDiscover();
        const diamondsCount = st.progressState.island70s.collectedDiamondIds.length;
        const echoesCount = st.progressState.island70s.discoveredEchoIds.length;
        const chestsCount = st.progressState.rpg.openedChestIds.length;
        setActiveDialog({
          category: 'MONUMENTO CENTRAL · CUMBRE DEL ARQUITECTO',
          title: 'El Astrolabio de las Eras (Década de 1970)',
          subtitle: `Memorias 70s: ${
            (st.pongRestored ? 1 : 0) +
            (st.glitchTrailCleared ? 1 : 0) +
            (st.invadersRestored ? 1 : 0)
          }/3 · Diamantes: ${diamondsCount}/${TOTAL_70S_DIAMONDS} · Cofres: ${chestsCount}/${RPG_CHESTS.length} · Sombras: ${echoesCount}`,
          paragraphs: [
            st.pongRestored && st.invadersRestored
              ? 'Los anillos de latón y fósforo giran en resonancia bajo la luna pálida. Tanto Pong (1972) como Space Invaders (1978) superaron los 1.000 puntos y el Navío del Puerto Este ya conecta con la Isla Neón de los años 80.'
              : 'Este astrolabio sincroniza los recuerdos fundacionales del Archipiélago Cero. Cada videojuego restaurado (1.000 PTS), cada secreto oculto y cada Diamante de Memoria fortalece el puente hacia las siguientes décadas.',
            'Explora también el Taller Analógico en el Bosque, el Templo del Archivo en las Ruinas y la misteriosa cortina de agua en La Garganta.',
          ],
          hint:
            st.invadersRestored || st.allUnlocked
              ? '¡Ruta abierta! Dirígete al Puerto de las Islas Perdidas (Zona 09, al este) para abordar el Navío hacia la Isla Neón 1980s.'
              : `Quedan secretos y desafíos por descubrir. Pulsa [Q] para consultar tus misiones activas.`,
          accentHex: '#00f3ff',
        });
        return;
      }

      if (target.kind === 'npc') {
        const npc = ISLAND_NPCS.find((n) => n.id === target.id);
        if (!npc) return;
        retroAudio.npcBlip(npc.pitch);
        callbacksRef.current.onTalkNpc(npc.id);

        let paragraphs =
          st.invadersRestored && npc.linesAfterInvaders
            ? npc.linesAfterInvaders
            : st.pongRestored && npc.linesAfterPong
            ? npc.linesAfterPong
            : npc.linesInitial;

        if (npc.id === 'npc-custodio-rodo') {
          paragraphs = st.progressState.rpg.cuatroCaminosRestored
            ? [
                '«¡Las cuatro pantallas han vuelto a encenderse con todo su fulgor! Lunar Lander, Sea Wolf, Tank y Galaxian... cuatro hitos que Gran Koopa intentó apagar para siempre.»',
                '«Gracias a Dylan y a los transistores de germanio, este templo arcade vuelve a latir. ¡Prueba cada una de las cuatro cabinas cuando quieras!»',
              ]
            : [
                '«¡Saludos, Arquitecto! Gran Koopa pasó por este cruce y calcinó los circuitos de las cuatro cabinas con una sobrecarga de entropía.»',
                '«La sala quedó completamente fuera de servicio. El único capaz de repararlas es Dylan, el técnico en «Taller RS — Retro State» (al suroeste en la aldea), pero necesitará transistores de germanio de alta velocidad.»',
              ];
        } else if (npc.id === 'npc-operadora-nora') {
          paragraphs = st.progressState.rpg.cuatroCaminosRestored
            ? [
                '«¡Dylan hizo una reparación magistral! El tablero central y las cuatro máquinas operan con sincronía perfecta.»',
                '«El portón norte custodia el puente hacia el castillo de Gran Koopa. Para abrirlo se requiere dominar las 4 máquinas de esta sala y forjar el Cartucho Maestro ORIGEN en la Cueva Glitch.»',
              ]
            : [
                '«Los Cuatro Caminos conectan con el gran puente al castillo de Gran Koopa al norte, pero las máquinas que alimentan el sello están apagadas.»',
                '«Dylan en Taller RS necesita 3 transistores de germanio para reactivarlas. Se consiguen completando el desafío nocturno en la terminal de Night Driver, en la costa este.»',
              ];
        }

        setActiveDialog({
          category: npc.role.toUpperCase(),
          title: npc.name,
          paragraphs,
          accentHex: npc.palette.glow,
        });
        return;
      }

      if (target.kind === 'echo') {
        const echo = ISLAND_ECHOES.find((e) => e.id === target.id);
        if (!echo) return;
        retroAudio.echoDiscover();
        callbacksRef.current.onDiscoverEcho(echo.id);
        setActiveDialog({
          category: `ARCHIVO DE ECO HOLOGRÁFICO · AÑO ${echo.year}`,
          title: echo.title,
          subtitle: echo.pioneer,
          paragraphs: [echo.loreText],
          hint: echo.gameplayHint,
          accentHex: echo.accentHex,
        });
        return;
      }

      if (target.kind === 'switch') {
        const sw = ISLAND_SWITCHES.find((s) => s.id === target.id);
        if (!sw) return;
        const alreadyActive =
          st.progressState.island70s.activatedIslandSwitches.includes(sw.id);
        retroAudio.shardCollect(alreadyActive ? 2 : 3);
        if (!alreadyActive) {
          callbacksRef.current.onActivateSwitch(sw.id);
        }
        showToast(sw.descriptionOnActivate);
        return;
      }

      if (target.kind === 'vista') {
        const vista = DISTANT_DECADE_VISTAS.find((v) => v.id === target.id);
        if (!vista) return;
        retroAudio.echoDiscover();
        setActiveDialog({
          category: vista.decadeLabel,
          title: vista.title,
          subtitle:
            vista.id === 'vista-80s' && (st.invadersRestored || st.allUnlocked)
              ? '¡RUTA DESBLOQUEADA EN EL EMBARCADERO!'
              : vista.statusText,
          paragraphs: [vista.lorePreview],
          hint:
            vista.id === 'vista-80s' && (st.invadersRestored || st.allUnlocked)
              ? 'Camina unos pasos al norte en este mismo muelle y aborda el Navío 1980s con [E].'
              : vista.unlockRequirement,
          accentHex: vista.accentHex,
        });
        return;
      }

      // =====================================================================
      // INTERACCIONES DE EL CASTILLO DEL REY CORRUPTO
      // =====================================================================
      if (target.kind === 'castle-entrance') {
        const drawbridgeDown =
          st.allUnlocked ||
          st.progressState.rpg.discoveredSecretIds.includes('castle-drawbridge-lowered') ||
          st.progressState.rpg.solvedPuzzleIds.includes('puzzle-sellos-castillo');

        if (drawbridgeDown) {
          transitionToArea(
            'castle-murallas',
            440,
            480,
            'up',
            'El Castillo del Rey Corrupto · Murallas del Destierro'
          );
        } else {
          retroAudio.npcBlip(0.75);
          setActiveDialog({
            category: 'CASTILLO DEL REY CORRUPTO · PUENTE LEVADIZO',
            title: 'Puente Levadizo Bloqueado',
            subtitle: 'Super KOOPA ha sellado el acceso',
            paragraphs: [
              '«El puente de madera y hierro está alzado. Cuatro cadenas macizas sostienen la compuerta sobre el abismo.»',
              '«En el sendero exterior descansan cuatro pedestales apagados (Sol ☀, Luna ☾, Estrella ★, Rayo ⚡) junto a la Estela Rúnica.»',
            ],
            hint: 'Examina la Estela y pulsa los cuatro pedestales en el orden correcto para bajar el puente.',
            accentHex: '#c084fc',
          });
        }
        return;
      }

      if (target.kind === 'castle-seal') {
        const expectedOrder = [
          'castle-seal-sol',
          'castle-seal-luna',
          'castle-seal-estrella',
          'castle-seal-rayo',
        ];
        const nextExpected = expectedOrder[towerSealsOrderRef.current.length];

        if (target.id === nextExpected) {
          towerSealsOrderRef.current.push(target.id);
          callbacksRef.current.onDiscoverSecret(target.id);
          retroAudio.shardCollect(towerSealsOrderRef.current.length);

          if (towerSealsOrderRef.current.length === 4) {
            retroAudio.secretFound();
            callbacksRef.current.onSolvePuzzle('puzzle-sellos-castillo', [
              'item-llave-torres-castillo',
            ]);
            callbacksRef.current.onDiscoverSecret('castle-drawbridge-lowered');
            showToast('¡Los 4 Sellos resplandecen! El puente levadizo desciende sobre el foso.');
            setActiveDialog({
              category: '¡MECANISMO DESBLOQUEADO! · CUATRO SELLOS',
              title: 'El Puente Levadizo ha Descendido',
              subtitle: 'Sello de las Cuatro Torres obtenido',
              paragraphs: [
                '«Un rugido de engranajes y cadenas sacude el desfiladero helado. Las pesadas vigas del puente levadizo caen sobre el abismo septentrional.»',
                '«El camino hacia Las Murallas del Destierro y el interior del Castillo ha quedado expedito.»',
              ],
              accentHex: '#c084fc',
            });
          } else {
            showToast(`¡Sello activado! (${towerSealsOrderRef.current.length}/4)`);
          }
        } else {
          towerSealsOrderRef.current = [];
          retroAudio.npcBlip(0.65);
          showToast('Ciclo quebrado · Sigue el orden: Sol ☀ → Luna ☾ → Estrella ★ → Rayo ⚡');
        }
        return;
      }

      if (target.kind === 'castle-shortcut-door') {
        callbacksRef.current.onDiscoverSecret('castle-shortcut-gate-open');
        retroAudio.secretFound();
        showToast('¡Reja de paso abierta! Atajo bidireccional habilitado en el laberinto.');
        return;
      }

      if (target.kind === 'castle-valve') {
        const expectedValves = [
          'exam-castillo-valvula-caudal',
          'exam-castillo-valvula-presion',
          'exam-castillo-valvula-drenaje',
        ];
        const nextExpected = expectedValves[hydraulicValvesOrderRef.current.length];

        if (target.id === nextExpected) {
          hydraulicValvesOrderRef.current.push(target.id);
          retroAudio.shardCollect(hydraulicValvesOrderRef.current.length);

          if (hydraulicValvesOrderRef.current.length === 3) {
            retroAudio.secretFound();
            callbacksRef.current.onSolvePuzzle('puzzle-valvulas-hidraulicas', [
              'item-nucleo-vital-castillo',
            ]);
            callbacksRef.current.onDiscoverSecret('castle-hydraulic-cleared');
            showToast('¡Presión equilibrada! Fosa central drenada y montacargas hidráulico activo.');
            setActiveDialog({
              category: '¡SISTEMA HIDRÁULICO REESTABLECIDO!',
              title: 'Cimientos del Reino Despejados',
              subtitle: 'Núcleo de Vapor Ancestral recuperado',
              paragraphs: [
                '«El agua termal es canalizada hacia los pistones del montacargas. El vapor silba con fuerza y el ascensor a la Gran Biblioteca queda habilitado.»',
              ],
              accentHex: '#06b6d4',
            });
          } else {
            showToast(`Válvula calibrada (${hydraulicValvesOrderRef.current.length}/3)`);
          }
        } else {
          hydraulicValvesOrderRef.current = [];
          retroAudio.npcBlip(0.7);
          showToast('Presión inestable · Sigue el orden: Caudal [A] → Vapor [C] → Drenaje [B]');
        }
        return;
      }

      if (target.kind === 'castle-lectern') {
        const num = parseInt(target.id.replace('exam-castillo-biblioteca-atril-', ''), 10) || 1;
        if (!chroniclesPlacedRef.current.includes(num)) {
          chroniclesPlacedRef.current.push(num);
          retroAudio.shardCollect(chroniclesPlacedRef.current.length);

          if (chroniclesPlacedRef.current.length === 4) {
            callbacksRef.current.onSolvePuzzle('puzzle-cronica-reyes');
            callbacksRef.current.onDiscoverSecret('castle-library-cleared');
            retroAudio.secretFound();
            showToast('¡Crónica completada! La gran estantería mecánica se desliza.');
            setActiveDialog({
              category: 'BIBLIOTECA DE LOS REYES · MECANISMO OCULTO',
              title: 'La Gran Estantería se ha Deslizado',
              subtitle: 'Pasadizo a la Torre del Tiempo revelado',
              paragraphs: [
                '«Los cuatro fragmentos de la crónica resuenan al unísono. La estantería de roble se desliza con un chasquido de contrapesos, abriendo la escalera hacia la Torre del Tiempo.»',
              ],
              accentHex: '#f59e0b',
            });
          } else {
            showToast(`Fragmento de Crónica encajado (${chroniclesPlacedRef.current.length}/4)`);
          }
        } else {
          showToast(`Atril ${num} · Fragmento ya colocado en su peana.`);
        }
        return;
      }

      if (target.kind === 'castle-tower-lever') {
        if (target.id === 'exam-castillo-torre-palanca-izq') {
          towerLeversRef.current.left = true;
          showToast('Engranaje Mayor izquierdo sincronizado.');
        } else {
          towerLeversRef.current.right = true;
          showToast('Péndulo Boreal derecho alineado.');
        }
        retroAudio.shardCollect(2);

        if (towerLeversRef.current.left && towerLeversRef.current.right) {
          callbacksRef.current.onSolvePuzzle('puzzle-torre-tiempo');
          callbacksRef.current.onDiscoverSecret('castle-throne-reached');
          retroAudio.secretFound();
          showToast('¡Mecanismo de la Torre engranado! Las puertas de la Sala del Trono se abren.');
          setActiveDialog({
            category: 'TORRE DEL TIEMPO · SINCRONIZACIÓN TOTAL',
            title: 'Las Puertas del Trono Están Abiertas',
            subtitle: 'El Rey Corrupto aguarda en la cima',
            paragraphs: [
              '«Los engranajes de latón interbloquean sus dientes en perfecta cadencia. El gran péndulo se equilibra y las puertas dobles a la Sala del Trono ceden.»',
            ],
            accentHex: '#fbbf24',
          });
        }
        return;
      }

      if (target.kind === 'castle-boss-hit') {
        const b = bossCombatStateRef.current;
        if (b.phase === 1) {
          b.bossHp = 66;
          b.phase = 2;
          retroAudio.secretFound();
          showToast('¡Impacto directo! Super KOOPA electrifica la sala: ¡Sobrecarga los 2 acumuladores laterales!');
        } else if (b.phase === 2) {
          if (b.conduitOverloads[0] && b.conduitOverloads[1]) {
            b.bossHp = 33;
            b.phase = 3;
            retroAudio.secretFound();
            showToast('¡Coraza disipada! Donkey Kong cae aturdido: ¡Destruye el Núcleo Digital!');
          } else {
            retroAudio.npcBlip(0.7);
            showToast('¡La coraza violeta desvía tus ataques! Sobrecarga los 2 acumuladores laterales primero.');
          }
        } else if (b.phase === 3) {
          b.bossHp = 0;
          b.phase = 4;
          b.dkPurified = true;
          callbacksRef.current.onDiscoverSecret('castle-donkey-kong-freed');
          callbacksRef.current.onOpenChest('chest-victory-hangar', ['item-llave-hangar-dk']);
          retroAudio.questComplete();
          showToast('¡Núcleo Digital de Super KOOPA destruido! Donkey Kong ha sido liberado.');
          setActiveDialog({
            category: '¡VICTORIA! · EL REY HA SIDO PURIFICADO',
            title: 'Donkey Kong · Rey de la Fortaleza',
            subtitle: 'La niebla de Super KOOPA se disipa',
            paragraphs: [
              '«El Núcleo Digital de Super KOOPA estalla en una lluvia de píxeles dorados y blancos. La luz cálida de la memoria regresa a los ojos de Donkey Kong.»',
              '«"Mi mente... la pesadilla ha terminado. Super KOOPA utilizó mi lealtad para convertir mi baluarte en una cárcel. Gracias, noble viajero del píxel."»',
              '«"Toma la Llave Maestra del Hangar. Tras mi trono descansa la legendaria nave de Space Invaders. Despega hacia el horizonte: la historia de los videojuegos te espera en los años 80."»',
            ],
            hint: 'Llave Maestra del Hangar obtenida. Camina hacia el norte y aborda la nave de Space Invaders.',
            accentHex: '#22c55e',
          });
        }
        return;
      }

      if (target.kind === 'castle-boss-conduit') {
        const b = bossCombatStateRef.current;
        if (target.x < 400) {
          b.conduitOverloads[0] = true;
          showToast('Acumulador izquierdo sobrecargado.');
        } else {
          b.conduitOverloads[1] = true;
          showToast('Acumulador derecho sobrecargado.');
        }
        retroAudio.shardCollect(3);

        if (b.conduitOverloads[0] && b.conduitOverloads[1]) {
          showToast('¡Ambos acumuladores sobrecargados! El campo violeta colapsa: ¡Ataca a Donkey Kong ahora!');
        }
        return;
      }

      if (target.kind === 'castle-ship-launch') {
        const hasKey =
          st.allUnlocked ||
          st.progressState.rpg.inventoryItems.includes('item-llave-hangar-dk') ||
          st.progressState.rpg.discoveredSecretIds.includes('castle-donkey-kong-freed');

        if (!hasKey) {
          retroAudio.npcBlip(0.8);
          showToast('La consola de la nave requiere la Llave Maestra entregada por Donkey Kong.');
          return;
        }

        retroAudio.portalVictory();
        callbacksRef.current.onUpdateQuest('quest-castillo-rey-corrupto', 'completed', [
          'item-llave-hangar-dk',
          'item-insignia-vigas-1981',
        ]);
        callbacksRef.current.onEnterDonkeyKong();

        setActiveDialog({
          category: 'LANZAMIENTO ESTELAR · NAVE SPACE INVADERS',
          title: '¡RUMBO A LA ISLA DE LOS 80!',
          subtitle: 'Cúpula del castillo abierta · Propulsores al 100%',
          paragraphs: [
            '«Giras la Llave Maestra en la consola de 1978. Las turbinas gemelas de la nave de Space Invaders se encienden con un trueno cósmico.»',
            '«La cúpula de cristal y piedra del castillo se abre de par en par. La nave se eleva majestuosamente sobre las almenas, cruzando la aurora boreal.»',
            '«En el radar táctico de la cabina parpadea una señal legendaria:»',
            '«ISLA DE LOS 80 — MEMORIA DETECTADA»',
          ],
          accentHex: '#22c55e',
          primaryAction: {
            label: 'Desembarcar en Isla Neón 1980s',
            onSelect: () => {
              setActiveDialog(null);
              transitionToArea(
                'island-80s',
                215,
                360,
                'down',
                '¡ISLA NEÓN 1980s · MUELLE DE LAS VIGAS ROJAS!'
              );
            },
          },
        });
        return;
      }
    },
    [currentZoneId, showToast, teleportExteriorTunnel, transitionToArea, setFlightFuel]
  );

  useEffect(() => {
    if (arrivalMode === 'glitch-trail-cleared') {
      retroAudio.bridgeActivate();
      showToast(
        '¡Puente Astral reconstruido! Cruza hacia el este para alcanzar La Fortaleza de las Oleadas (1978).'
      );
      onArrivalSequenceFinished?.();
    } else if (arrivalMode === 'return-80s' || arrivalMode === 'return-breakout') {
      onArrivalSequenceFinished?.();
    }
  }, [arrivalMode, onArrivalSequenceFinished, showToast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = reducedMotionQuery.matches;
    const onMotionChange = (ev: MediaQueryListEvent) => {
      reducedMotion = ev.matches;
    };
    reducedMotionQuery.addEventListener('change', onMotionChange);

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Zoom único del mundo exterior; el minimapa vive en la interfaz fija.
    const cameraZoom = 1.75;
    const worldViewWidth = () => vw / cameraZoom;
    const worldViewHeight = () => vh / cameraZoom;
    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);

    const player = {
      x: playerPosBridgeRef.current.x,
      y: playerPosBridgeRef.current.y,
      facing: 1 as 1 | -1,
      facingDir: playerPosBridgeRef.current.facingDir as FacingDirection,
      walking: false,
      sprinting: false,
      interactAnim: 0,
    };

    const camera = {
      x: Math.max(
        0,
        Math.min(ISLAND_WORLD_W - worldViewWidth(), player.x - worldViewWidth() * 0.5)
      ),
      y: Math.max(
        ISLAND_CAMERA_TOP,
        Math.min(ISLAND_WORLD_TOP + ISLAND_WORLD_H - worldViewHeight(), player.y - worldViewHeight() * 0.5)
      ),
    };

    const keys: Record<string, boolean> = {};
    const isEditable = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable ||
        Boolean(el.closest('[contenteditable="true"]')));

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const code = e.code;
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      const lowerKey = e.key.toLowerCase();

      if (volcanicGuardDialogRef.current) {
        e.preventDefault();
        if (e.repeat) return;
        if (volcanicGuardDialogRef.current === 'choice') {
          if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'KeyA', 'KeyD'].includes(code)) {
            const nextChoice = volcanicGuardChoiceRef.current === 'yes' ? 'no' : 'yes';
            volcanicGuardChoiceRef.current = nextChoice;
            setVolcanicGuardChoice(nextChoice);
            retroAudio.uiClick();
          } else if (code === 'Enter' || code === 'Space' || code === 'KeyE') {
            resolveVolcanicGuardChoice(volcanicGuardChoiceRef.current);
          } else if (lowerKey === 'y') {
            resolveVolcanicGuardChoice('yes');
          } else if (lowerKey === 'n' || code === 'Escape') {
            resolveVolcanicGuardChoice('no');
          }
        } else if (code === 'Enter' || code === 'Space' || code === 'KeyE' || code === 'Escape') {
          setVolcanicGuardDialog(null);
          volcanicGuardDialogRef.current = null;
          if (volcanicGuardTimerRef.current !== null) window.clearTimeout(volcanicGuardTimerRef.current);
          volcanicGuardTimerRef.current = null;
        }
        return;
      }

      // Teclas numéricas 1-4 para Selector de Habilidades
      if (!hasModifier && !e.repeat && (code === 'Digit1' || code === 'Numpad1')) {
        e.preventDefault();
        setActivePower('pong-hoverboard');
        executeActivePower('pong-hoverboard');
        return;
      }
      if (!hasModifier && !e.repeat && (code === 'Digit2' || code === 'Numpad2')) {
        e.preventDefault();
        setActivePower('shifting-blade');
        executeActivePower('shifting-blade');
        return;
      }
      if (!hasModifier && !e.repeat && (code === 'Digit3' || code === 'Numpad3')) {
        e.preventDefault();
        setActivePower('orbital-dash');
        executeActivePower('orbital-dash');
        return;
      }
      if (!hasModifier && !e.repeat && (code === 'Digit4' || code === 'Numpad4')) {
        e.preventDefault();
        setActivePower('sonar-pulse');
        executeActivePower('sonar-pulse');
        return;
      }
      if (!hasModifier && code === 'KeyC' && isIslandPowerUnlocked('shifting-blade', latestStateRef.current.progressState, latestStateRef.current.allUnlocked)) {
        e.preventDefault();
        setBladeMode((mode) => mode === 'short' ? 'extended' : mode === 'extended' ? 'gun' : 'short');
        retroAudio.uiClick();
        return;
      }
      if (!hasModifier && isActionPressed(e, 'flight', keybindings)) {
        if (!latestStateRef.current.modalOpen) {
          e.preventDefault();
          executeActivePower('pong-hoverboard');
          return;
        }
      }

      if (!hasModifier && isActionPressed(e, 'powers', keybindings)) {
        if (latestStateRef.current.chronoWarpActive) return;
        e.preventDefault();
        if (e.repeat) return;
        retroAudio.uiClick();
        setActiveDialog(null);
        setVectorModalOpen(false);
        setCodexOpen(false);
        setInventoryOpen(false);
        setQuestsOpen(false);
        setPowersMenuOpen((prev) => !prev);
        return;
      }

      if (!hasModifier && code === 'KeyM' && activeAreaRef.current === 'exterior-70s') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.repeat || latestStateRef.current.modalOpen) return;
        setMinimapOpen((prev) => !prev);
        retroAudio.uiClick();
        return;
      }

      if (
        !hasModifier &&
        code === 'Enter' &&
        !latestStateRef.current.chronoWarpActive &&
        (latestStateRef.current.inventoryOpen || !latestStateRef.current.modalOpen)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.repeat) return;
        if (latestStateRef.current.inventoryOpen) {
          closeInventory();
        } else if (!latestStateRef.current.modalOpen) {
          for (const key of Object.keys(keys)) keys[key] = false;
          const virtualInput = virtualInputRef.current;
          virtualInput.up = false;
          virtualInput.down = false;
          virtualInput.left = false;
          virtualInput.right = false;
          virtualInput.sprint = false;
          virtualInput.clickTarget = null;
          setInventoryOpen(true);
        }
        retroAudio.uiClick();
        return;
      }

      keys[code] = true;

      if (isActionPressed(e, 'cancel', keybindings)) {
        if (latestStateRef.current.modalOpen && !latestStateRef.current.chronoWarpActive) {
          e.preventDefault();
          if (e.repeat) return;
          setActiveDialog(null);
          setCodexOpen(false);
          closeInventory();
          setQuestsOpen(false);
          setPowersMenuOpen(false);
          setVectorModalOpen(false);
          return;
        }
      }

      if (!hasModifier && isActionPressed(e, 'inventory', keybindings)) {
        if (latestStateRef.current.chronoWarpActive) return;
        e.preventDefault();
        if (e.repeat) return;
        retroAudio.uiClick();
        setActiveDialog(null);
        setVectorModalOpen(false);
        setCodexOpen(false);
        setQuestsOpen(false);
        setPowersMenuOpen(false);
        setInventoryOpen((prev) => !prev);
        return;
      }

      if (!hasModifier && isActionPressed(e, 'quests', keybindings)) {
        if (latestStateRef.current.chronoWarpActive) return;
        e.preventDefault();
        if (e.repeat) return;
        retroAudio.uiClick();
        setActiveDialog(null);
        setVectorModalOpen(false);
        setCodexOpen(false);
        setInventoryOpen(false);
        setPowersMenuOpen(false);
        setQuestsOpen((prev) => !prev);
        return;
      }

      if (!hasModifier && (lowerKey === 'c' || code === 'KeyC')) {
        if (latestStateRef.current.chronoWarpActive) return;
        e.preventDefault();
        if (e.repeat) return;
        retroAudio.uiClick();
        setActiveDialog(null);
        setVectorModalOpen(false);
        setInventoryOpen(false);
        setQuestsOpen(false);
        setPowersMenuOpen(false);
        setCodexOpen((prev) => !prev);
        return;
      }

      if (!hasModifier && (lowerKey === 'l' || code === 'KeyL') && !latestStateRef.current.modalOpen) {
        e.preventDefault();
        if (e.repeat) return;
        handleToggleLanternAction();
        return;
      }

      if (!hasModifier && (lowerKey === 'r' || code === 'KeyR') && !latestStateRef.current.modalOpen) {
        e.preventDefault();
        if (e.repeat) return;
        handleUseScannerPulse();
        return;
      }

      if (code === 'Tab' && !latestStateRef.current.modalOpen) {
        e.preventDefault();
        if (e.repeat) return;
        setMinimapOpen((prev) => !prev);
        return;
      }

      if (isActionPressed(e, 'interact', keybindings) || code === 'KeyE' || code === 'Enter' || code === 'Space') {
        if (e.repeat) return;
        if (latestStateRef.current.modalOpen) {
          if (
            (code === 'KeyE' || code === 'Enter' || isActionPressed(e, 'interact', keybindings)) &&
            !latestStateRef.current.chronoWarpActive
          ) {
            e.preventDefault();
            if (code === 'Enter') e.stopImmediatePropagation();
            if (activeDialogRef.current && code === 'Enter') {
              advanceDialogueRef.current();
            } else {
              setActiveDialog(null);
              setCodexOpen(false);
              setInventoryOpen(false);
              setQuestsOpen(false);
              setPowersMenuOpen(false);
            }
          }
        } else if (nearbyPromptRef.current) {
          e.preventDefault();
          triggerInteraction(nearbyPromptRef.current);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onCanvasPointerDown = (e: PointerEvent) => {
      if (
        latestStateRef.current.modalOpen ||
        (vehicleFlightRef.current.type !== 'none' && vehicleFlightRef.current.type !== 'hoverboard') ||
        areaTransitionLockRef.current
      ) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const curArea = activeAreaRef.current;
      let wx = sx;
      let wy = sy;

      if (curArea === 'exterior-70s') {
        wx = sx / cameraZoom + camera.x;
        wy = sy / cameraZoom + camera.y;
      } else {
        const sub = SUB_AREAS[curArea];
        const subCamX =
          sub.width <= vw
            ? -(vw - sub.width) * 0.5
            : Math.max(-40, Math.min(sub.width - vw + 40, player.x - vw * 0.5));
        const subCamY =
          sub.height <= vh
            ? -(vh - sub.height) * 0.5
            : Math.max(-40, Math.min(sub.height - vh + 40, player.y - vh * 0.5));
        wx = sx + subCamX;
        wy = sy + subCamY;
      }

      const prompt = nearbyPromptRef.current;
      if (
        prompt &&
        (Math.hypot(wx - prompt.x, wy - prompt.y) < 76 ||
          Math.hypot(wx - prompt.x, wy - (prompt.y - 50)) < 58)
      ) {
        triggerInteraction(prompt);
        return;
      }

      const st = latestStateRef.current;
      if (curArea === 'exterior-70s') {
        const walkable =
          Boolean(
            isPointWalkableOnIsland(wx, wy, {
              southShortcut: st.southShortcutActive,
              gargantaBridge: st.glitchTrailCleared,
            })
          ) &&
          !isBlockedByExteriorBuilding(wx, wy) &&
          !isBlockedByIslandRouteRail(wx, wy) &&
          !isBlockedByVolcanicGuardGate(wx, wy, st.allUnlocked || st.progressState.island70s.talkedNpcIds.includes(VOLCANIC_GUARD_ID)) &&
          !isVolcanicArcadeCabinetBlocked(wx, wy) &&
          !isBreakoutLegendStoneBlocked(wx, wy) &&
          !isNorthArcadeCabinetBlocked(wx, wy);
        if (walkable) {
          virtualInputRef.current.clickTarget = { x: wx, y: wy };
        }
      } else {
        const sub = SUB_AREAS[curArea];
        if (
          isWalkableInSubArea(
            sub,
            wx,
            wy,
            st.progressState.rpg.calmedCreatureIds,
            st.allUnlocked
          )
        ) {
          virtualInputRef.current.clickTarget = { x: wx, y: wy };
        }
      }
    };
    canvas.addEventListener('pointerdown', onCanvasPointerDown);

    const stars = Array.from({ length: 165 }, (_, i) => ({
      nx: ((i * 97) % 1000) / 1000,
      ny: ((i * 53) % 1000) / 1000,
      size: 1 + (i % 3) * 0.85,
      twinkle: i * 0.7,
      parallax: 0.12 + (i % 4) * 0.06,
    }));

    const ambientBits = Array.from({ length: 85 }, (_, i) => ({
      x: 240 + ((i * 173) % (ISLAND_WORLD_W - 420)),
      y: ISLAND_WORLD_TOP + 220 + ((i * 131) % (ISLAND_WORLD_H - 360)),
      vy: -12 - (i % 4) * 7,
      phase: i * 0.9,
      color: i % 3 === 0 ? '#00f3ff' : i % 3 === 1 ? '#34d399' : '#facc15',
    }));

    const digitalCritters = Array.from({ length: 9 }, (_, i) => ({
      homeX: 680 + (i % 3) * 240,
      homeY: 1090 + Math.floor(i / 3) * 145,
      phase: i * 1.3,
      color: i % 2 === 0 ? '#34d399' : '#38bdf8',
    }));

    const pickupBursts: IslandPickupBurst[] = [];

    const spawnBurst = (bx: number, by: number, color: string, count = 18) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.25;
        const sp = 45 + Math.random() * 110;
        pickupBursts.push({
          x: bx,
          y: by,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.55,
          color,
        });
      }
    };

    let lastZoneNotified: IslandZoneId | null = null;
    let lastPosSaveTimer = 0;
    let miniMapSyncTimer = 0;
    let stepAudioTimer = 0;
    let lastTileSteppedId = '';
    let prevPromptId = '';
    let surfSprayTimer = 0;

    if (vehicleFlightRef.current.type === 'pong-landing') {
      setFlightStatusText(
        'Tabla de Pong · Descendiendo sobre la Isla del Origen...'
      );
    } else if (vehicleFlightRef.current.type === 'pong-to-garganta') {
      setFlightStatusText(
        'Vuelo en Tabla de Pong · Surcando la Gran Isla de los 70 hacia La Garganta del Invasor...'
      );
    } else if (vehicleFlightRef.current.type === 'shuttle-landing') {
      setFlightStatusText(
        'Nave Estelar PIXELVERSE · Descendiendo hacia La Fortaleza de las Oleadas (1978)...'
      );
    }

    let rafId = 0;
    let prevTime = performance.now();
    let elapsed = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prevTime) / 1000);
      prevTime = now;
      elapsed += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);

      // Aplicar teletransporte pendiente al cambiar entre exterior, interiores o Isla 80s
      if (playerPosBridgeRef.current.teleportPending) {
        const tp = playerPosBridgeRef.current.teleportPending;
        playerPosBridgeRef.current.teleportPending = null;
        player.x = tp.x;
        player.y = tp.y;
        if (tp.facingDir) {
          player.facingDir = tp.facingDir;
          if (tp.facingDir === 'right') player.facing = 1;
          else if (tp.facingDir === 'left') player.facing = -1;
        }
        player.walking = false;
        pickupBursts.length = 0;
        lastTileSteppedId = '';
        if (activeAreaRef.current === 'exterior-70s') {
          camera.x = Math.max(
            0,
            Math.min(ISLAND_WORLD_W - worldViewWidth(), player.x - worldViewWidth() * 0.5)
          );
          camera.y = Math.max(
            ISLAND_CAMERA_TOP,
            Math.min(
              ISLAND_WORLD_TOP + ISLAND_WORLD_H - worldViewHeight(),
              player.y - worldViewHeight() * 0.5
            )
          );
        }
      }

      if (playerPosBridgeRef.current.interactAnim > 0) {
        playerPosBridgeRef.current.interactAnim = Math.max(
          0,
          playerPosBridgeRef.current.interactAnim - dt
        );
      }
      player.interactAnim = playerPosBridgeRef.current.interactAnim;

      if (scannerPulseRef.current.active) {
        scannerPulseRef.current.elapsed += dt;
        if (scannerPulseRef.current.elapsed >= 1.5) {
          scannerPulseRef.current.active = false;
        }
      }

      const st = latestStateRef.current;
      const curArea = activeAreaRef.current;
      const flight = vehicleFlightRef.current;

      if (pongBoardDepartureRef.current) {
        pongBoardDepartureRef.current.elapsed += dt;
        if (pongBoardDepartureRef.current.elapsed >= pongBoardDepartureRef.current.duration) {
          pongBoardDepartureRef.current = null;
        }
      }

      if (
        (curArea === 'exterior-70s' || curArea === 'island-80s') &&
        flight.type === 'hoverboard' &&
        !st.modalOpen &&
        !st.allUnlocked
      ) {
        const fuelRate = getPongFlightFuelRate(st.progressState);
        const nextFuel = Math.max(0, flightFuelRef.current - fuelRate * dt);
        setFlightFuel(nextFuel);
        persistFuelConsumption(fuelRate * dt);
        if (nextFuel <= 0) {
          flight.type = 'none';
          player.walking = false;
          setFlightStatusText(null);
          persistFuelConsumption(0, true);
          if (curArea === 'exterior-70s') {
            const safe = lastSafeGroundRef.current;
            const canLandHere =
              Boolean(
                isPointWalkableOnIsland(player.x, player.y, {
                  southShortcut: st.southShortcutActive,
                  gargantaBridge: st.glitchTrailCleared,
                })
              ) &&
              !isBlockedByExteriorBuilding(player.x, player.y) &&
              !isBlockedByIslandRouteRail(player.x, player.y);
            if (canLandHere) {
              lastSafeGroundRef.current = { x: player.x, y: player.y };
            } else {
              player.x = safe.x;
              player.y = safe.y;
            }
          }
          retroAudio.npcBlip(0.7);
          showToast('⚠ Combustible agotado · La Paleta de Pong aterrizó y se desactivó.');
          if (curArea === 'island-80s') {
            callbacksRef.current.onSave80sPosition(player.x, player.y);
          } else {
            callbacksRef.current.onSavePosition(player.x, player.y);
          }
        }
      }

      const surfDisembark = surfDisembarkRef.current;
      if (surfDisembark) {
        // El personaje baja de la tabla y camina hasta la arena seca.
        surfDisembark.t += dt;
        const sp = Math.min(1, surfDisembark.t / surfDisembark.duration);
        const step = sp * sp * (3 - 2 * sp);
        player.x = surfDisembark.fromX;
        player.y = surfDisembark.fromY + (NATAL_SURF_LANDING.y - surfDisembark.fromY) * step;
        player.facingDir = 'up';
        player.walking = sp < 1;
        if (!reducedMotion && Math.random() < 0.45) {
          pickupBursts.push({
            x: player.x - 10 + Math.random() * 20,
            y: player.y + 12,
            vx: (Math.random() - 0.5) * 80,
            vy: -35 - Math.random() * 45,
            life: 0.34,
            color: '#bfe6ff',
          });
          if (pickupBursts.length > 460)
            pickupBursts.splice(0, pickupBursts.length - 460);
        }
        const sdTargetCamX = Math.max(
          0,
          Math.min(ISLAND_WORLD_W - worldViewWidth(), player.x - worldViewWidth() * 0.5)
        );
        const sdTargetCamY = Math.max(
          ISLAND_CAMERA_TOP,
          Math.min(
            ISLAND_WORLD_TOP + ISLAND_WORLD_H - worldViewHeight(),
            player.y - worldViewHeight() * 0.5
          )
        );
        camera.x += (sdTargetCamX - camera.x) * Math.min(1, dt * 7);
        camera.y += (sdTargetCamY - camera.y) * Math.min(1, dt * 7);
        if (sp >= 1) {
          surfDisembarkRef.current = null;
          player.walking = false;
          player.facingDir = 'up';
          areaTransitionLockRef.current = false;
          lastSafeGroundRef.current = { x: player.x, y: player.y };
          setFlightStatusText(null);
          retroAudio.portalVictory();
          showToast(
            '¡Aterrizaje completado en la playa de Pueblo Origen! La Barra de Pong está en Mochila → Objetos: invócala con [F] si tienes combustible.'
          );
          callbacksRef.current.onSavePosition(player.x, player.y);
          callbacksRef.current.onArrivalSequenceFinished?.();
        }
      }

      if (curArea === 'exterior-70s' && flight.type !== 'none' && flight.type !== 'hoverboard') {
        flight.elapsed += dt;
        const p = Math.min(1, flight.elapsed / flight.duration);
        const smooth = p * p * (3 - 2 * p);

        if (flight.type === 'pong-landing') {
          // El surf entra desde el mar abierto y resbala hasta la playa de
          // Pueblo Origen: primero aparece sobre el agua, no sobre la arena.
          const landingPt = NATAL_SURF_LANDING;
          const seaStartY = landingPt.y + 320;
          const shoreStopY = landingPt.y + 52;
          const rideT = Math.min(1, p / 0.74);
          const rideEase = rideT * rideT * (3 - 2 * rideT);
          const weave =
            Math.sin(rideT * Math.PI * 2.6) * 13 * Math.sin(Math.PI * rideT);

          player.x = landingPt.x + weave;
          player.y = seaStartY + (shoreStopY - seaStartY) * rideEase;
          player.facingDir = 'up';
          player.walking = false;
          flight.tilt =
            Math.sin(rideT * Math.PI * 2.6) * 0.085 +
            (reducedMotion ? 0 : Math.sin(elapsed * 6.2) * 0.05);

          // Estela y salpicaduras detrás de la tabla mientras avanza sobre el mar
          if (!reducedMotion) {
            surfSprayTimer += dt;
            if (surfSprayTimer >= 0.055) {
              surfSprayTimer = 0;
              for (let i = 0; i < 3; i++) {
                pickupBursts.push({
                  x: player.x - 6 + Math.random() * 20,
                  y: player.y + 14 + Math.random() * 10,
                  vx: 36 + Math.random() * 72,
                  vy: -55 - Math.random() * 80,
                  life: 0.4,
                  color: '#e0f2fe',
                });
              }
              if (pickupBursts.length > 460)
                pickupBursts.splice(0, pickupBursts.length - 460);
            }
          }

          // La cámara persigue el descenso sobre el mar
          const rideCamX = Math.max(
            0,
            Math.min(ISLAND_WORLD_W - worldViewWidth(), player.x - worldViewWidth() * 0.5)
          );
          const rideCamY = Math.max(
            ISLAND_CAMERA_TOP,
            Math.min(
              ISLAND_WORLD_TOP + ISLAND_WORLD_H - worldViewHeight(),
              player.y - worldViewHeight() * 0.5
            )
          );
          camera.x += (rideCamX - camera.x) * Math.min(1, dt * 7);
          camera.y += (rideCamY - camera.y) * Math.min(1, dt * 7);

          if (p >= 0.74) {
            // La tabla frena en la orilla y se retira mientras el personaje
            // desembarca sobre la arena quedando frente al interior del pueblo.
            flight.type = 'none';
            flight.tilt = 0;
            player.x = landingPt.x;
            player.y = shoreStopY;
            player.walking = false;
            player.facingDir = 'up';
            pongBoardDepartureRef.current = {
              x: landingPt.x,
              y: shoreStopY + 4,
              elapsed: 0,
              duration: Math.max(1.4, PONG_BOARD_DEPARTURE_DURATION),
            };
            surfDisembarkRef.current = {
              t: 0,
              duration: 0.62,
              fromX: landingPt.x,
              fromY: shoreStopY,
            };
            areaTransitionLockRef.current = true;
            setFlightStatusText('La Barra de Pong frena en la orilla de Pueblo Origen...');
            retroAudio.zoneChime();
          }
        } else if (flight.type === 'pong-to-garganta' || flight.type === 'garganta-to-pong') {
          const start =
            flight.type === 'pong-to-garganta'
              ? ISLAND_KEY_COORDS.pongBoardLaunch
              : ISLAND_KEY_COORDS.pongBoardLanding;
          const end =
            flight.type === 'pong-to-garganta'
              ? ISLAND_KEY_COORDS.pongBoardLanding
              : ISLAND_KEY_COORDS.pongBoardLaunch;
          const ctrlX = 2320;
          const ctrlY = 1040;
          const inv = 1 - smooth;
          player.x =
            inv * inv * start.x + 2 * inv * smooth * ctrlX + smooth * smooth * end.x;
          player.y =
            inv * inv * start.y + 2 * inv * smooth * ctrlY + smooth * smooth * end.y;
          player.walking = false;

          if (p >= 1) {
            flight.type = 'none';
            player.x = end.x;
            player.y = end.y;
            setFlightStatusText(null);
            retroAudio.zoneChime();
            callbacksRef.current.onSavePosition(player.x, player.y);
            callbacksRef.current.onArrivalSequenceFinished?.();
          }
        } else if (flight.type === 'shuttle-landing') {
          const pad = ISLAND_KEY_COORDS.starShuttlePad;
          const disembark = ISLAND_KEY_COORDS.starShuttleDisembark;
          if (p < 0.72) {
            const lp = p / 0.72;
            const easeOut = 1 - Math.pow(1 - lp, 3);
            player.x = pad.x - 190 * (1 - easeOut);
            player.y = pad.y - 310 * (1 - easeOut);
          } else {
            const wp = (p - 0.72) / 0.28;
            player.x = pad.x + 18 + (disembark.x - (pad.x + 18)) * wp;
            player.y = pad.y + 14 + (disembark.y - (pad.y + 14)) * wp;
            player.walking = true;
            player.facing = 1;
            player.facingDir = 'right';
          }

          if (p >= 1) {
            flight.type = 'none';
            player.x = disembark.x;
            player.y = disembark.y;
            player.walking = false;
            setFlightStatusText(null);
            retroAudio.portalVictory();
            showToast(
              '¡Aterrizaje completado! El Navío del Puerto Este (Zona 09) hacia la Isla Neón 1980s está habilitado.'
            );
            callbacksRef.current.onSavePosition(player.x, player.y);
            callbacksRef.current.onArrivalSequenceFinished?.();
          }
        }
      } else if (!st.modalOpen && !areaTransitionLockRef.current) {
        let dx = 0;
        let dy = 0;
        const vIn = virtualInputRef.current;

        if (keys['KeyW'] || keys['ArrowUp'] || vIn.up) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown'] || vIn.down) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft'] || vIn.left) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight'] || vIn.right) dx += 1;

        if (dx !== 0 || dy !== 0) {
          vIn.clickTarget = null;
          const len = Math.hypot(dx, dy);
          dx /= len;
          dy /= len;
        } else if (vIn.clickTarget) {
          const tx = vIn.clickTarget.x - player.x;
          const ty = vIn.clickTarget.y - player.y;
          const dist = Math.hypot(tx, ty);
          if (dist < 10) {
            vIn.clickTarget = null;
          } else {
            dx = tx / dist;
            dy = ty / dist;
          }
        }

        const dash = orbitalDashRef.current;
        if (dash.cooldown > 0) {
          dash.cooldown = Math.max(0, dash.cooldown - dt);
          setDashCooldown(Math.ceil(dash.cooldown * 10) / 10);
        } else setDashCooldown(0);
        const hoverboarding = curArea === 'exterior-70s' && vehicleFlightRef.current.type === 'hoverboard';
        const sprinting = Boolean(keys['ShiftLeft'] || keys['ShiftRight'] || vIn.sprint || dash.remaining > 0 || hoverboarding);
        const baseSpeed = curArea === 'exterior-70s' ? 215 : 190;
        const sprintSpeed = curArea === 'exterior-70s' ? 315 : 265;
        const speed = dash.remaining > 0 ? 720 : hoverboarding ? 285 : sprinting ? sprintSpeed : baseSpeed;
        if (dash.remaining > 0) {
          dx = dash.dx;
          dy = dash.dy;
        }

        player.sprinting = sprinting && (dx !== 0 || dy !== 0);
        player.walking = dx !== 0 || dy !== 0;

        if (player.walking) {
          if (Math.abs(dx) >= Math.abs(dy)) {
            player.facingDir = dx >= 0 ? 'right' : 'left';
            player.facing = dx >= 0 ? 1 : -1;
          } else {
            player.facingDir = dy >= 0 ? 'down' : 'up';
          }

          stepAudioTimer += dt * (player.sprinting ? 1.45 : 1);
          if (stepAudioTimer >= 0.34) {
            stepAudioTimer = 0;
            retroAudio.stepTile();
          }

          const stepDistance = Math.min(dash.remaining > 0 ? 8 : speed * dt, dash.remaining > 0 ? dash.remaining : speed * dt);
          const nextX = player.x + dx * stepDistance;
          const nextY = player.y + dy * stepDistance;

          if (curArea === 'exterior-70s') {
            const walkOpts = {
              southShortcut: st.southShortcutActive,
              gargantaBridge: st.glitchTrailCleared,
            };
            const volcanicPassageOpen = st.allUnlocked || st.progressState.island70s.talkedNpcIds.includes(VOLCANIC_GUARD_ID);
            const canXY =
              Boolean(isPointWalkableOnIsland(nextX, nextY, walkOpts)) &&
              !isBlockedByExteriorBuilding(nextX, nextY) &&
              !isBlockedByIslandRouteRail(nextX, nextY) &&
              !isBlockedByVolcanicGuardGate(nextX, nextY, volcanicPassageOpen) &&
              !isVolcanicArcadeCabinetBlocked(nextX, nextY) &&
              !isBreakoutLegendStoneBlocked(nextX, nextY) &&
              !isNorthArcadeCabinetBlocked(nextX, nextY);
            const canX =
              Boolean(isPointWalkableOnIsland(nextX, player.y, walkOpts)) &&
              !isBlockedByExteriorBuilding(nextX, player.y) &&
              !isBlockedByIslandRouteRail(nextX, player.y) &&
              !isBlockedByVolcanicGuardGate(nextX, player.y, volcanicPassageOpen) &&
              !isVolcanicArcadeCabinetBlocked(nextX, player.y) &&
              !isBreakoutLegendStoneBlocked(nextX, player.y) &&
              !isNorthArcadeCabinetBlocked(nextX, player.y);
            const canY =
              Boolean(isPointWalkableOnIsland(player.x, nextY, walkOpts)) &&
              !isBlockedByExteriorBuilding(player.x, nextY) &&
              !isBlockedByIslandRouteRail(player.x, nextY) &&
              !isBlockedByVolcanicGuardGate(player.x, nextY, volcanicPassageOpen) &&
              !isVolcanicArcadeCabinetBlocked(player.x, nextY) &&
              !isBreakoutLegendStoneBlocked(player.x, nextY) &&
              !isNorthArcadeCabinetBlocked(player.x, nextY);

            if (canXY) {
              player.x = nextX;
              player.y = nextY;
            } else if (canX) {
              player.x = nextX;
            } else if (canY) {
              player.y = nextY;
            } else {
              vIn.clickTarget = null;
            }
          } else {
            const subSpec = SUB_AREAS[curArea];
            const calmedIds = st.progressState.rpg.calmedCreatureIds;
            const solvedPuzzles = st.progressState.rpg.solvedPuzzleIds;
            if (
              isWalkableInSubArea(subSpec, nextX, nextY, calmedIds, st.allUnlocked, solvedPuzzles)
            ) {
              player.x = nextX;
              player.y = nextY;
            } else if (
              isWalkableInSubArea(subSpec, nextX, player.y, calmedIds, st.allUnlocked, solvedPuzzles)
            ) {
              player.x = nextX;
            } else if (
              isWalkableInSubArea(subSpec, player.x, nextY, calmedIds, st.allUnlocked, solvedPuzzles)
            ) {
              player.y = nextY;
            } else {
              vIn.clickTarget = null;
            }
          }
          if (dx !== 0 || dy !== 0) lastMoveDirectionRef.current = { x: dx, y: dy };
          if (dash.remaining > 0) {
            const moved = Math.hypot(player.x - (nextX - dx * stepDistance), player.y - (nextY - dy * stepDistance));
            dash.remaining = Math.max(0, dash.remaining - Math.max(0, Math.min(stepDistance, moved)));
            if (moved + 0.5 < stepDistance) dash.remaining = 0;
          }
        }
      } else {
        player.walking = false;
      }

      const extractionMotion = breakoutSwordExtractionMotionRef.current;
      if (st.breakoutSwordExtracting && extractionMotion) {
        extractionMotion.elapsed = Math.min(extractionMotion.duration, extractionMotion.elapsed + dt);
        const t = extractionMotion.elapsed / extractionMotion.duration;
        const ease = t * t * (3 - 2 * t);
        player.x = extractionMotion.fromX + (extractionMotion.toX - extractionMotion.fromX) * ease;
        player.y = extractionMotion.fromY + (extractionMotion.toY - extractionMotion.fromY) * ease;
        player.facingDir = extractionMotion.toX >= extractionMotion.fromX ? 'right' : 'left';
        player.walking = t < 1;
        if (t >= 1) playerPosBridgeRef.current.interactAnim = 0.28;
      }

      playerPosBridgeRef.current.x = player.x;
      playerPosBridgeRef.current.y = player.y;
      playerPosBridgeRef.current.facingDir = player.facingDir;

      if (curArea === 'exterior-70s' && (flight.type === 'none' || flight.type === 'hoverboard') && st.glitchTrailCleared) {
        const guardDistance = Math.hypot(player.x - VOLCANIC_ARCADE_LAYOUT.guard.x, player.y - VOLCANIC_ARCADE_LAYOUT.guard.y);
        const accepted = st.allUnlocked || st.progressState.island70s.talkedNpcIds.includes(VOLCANIC_GUARD_ID);
        if (guardDistance > 128) volcanicGuardRetryLockedRef.current = false;
        if (!accepted && !volcanicGuardRetryLockedRef.current && volcanicGuardDialogRef.current === null && guardDistance < 68) {
          for (const key of Object.keys(keys)) keys[key] = false;
          virtualInputRef.current.up = false;
          virtualInputRef.current.down = false;
          virtualInputRef.current.left = false;
          virtualInputRef.current.right = false;
          virtualInputRef.current.sprint = false;
          virtualInputRef.current.clickTarget = null;
          player.facingDir = player.x <= VOLCANIC_ARCADE_LAYOUT.guard.x ? 'right' : 'left';
          playerPosBridgeRef.current.facingDir = player.facingDir;
          setVolcanicGuardChoice('yes');
          volcanicGuardChoiceRef.current = 'yes';
          setVolcanicGuardDialog('choice');
          volcanicGuardDialogRef.current = 'choice';
          setNearbyPrompt(null);
          retroAudio.npcBlip(0.86);
        }
      }

      // Evaluar losetas de presión si estamos en un interior con acertijo
      if (curArea !== 'exterior-70s') {
        const subSpec = SUB_AREAS[curArea];
        if (
          subSpec.pressurePuzzle &&
          !st.progressState.rpg.solvedPuzzleIds.includes(subSpec.pressurePuzzle.puzzleId)
        ) {
          let onAnyTile = false;
          for (const tile of subSpec.pressurePuzzle.tiles) {
            if (Math.hypot(player.x - tile.x, player.y - tile.y) < 25) {
              onAnyTile = true;
              if (
                lastTileSteppedId !== tile.id &&
                !steppedTilesRef.current.includes(tile.orderIndex)
              ) {
                lastTileSteppedId = tile.id;
                const expectedNext = steppedTilesRef.current.length + 1;
                if (tile.orderIndex === expectedNext) {
                  steppedTilesRef.current = [...steppedTilesRef.current, tile.orderIndex];
                  retroAudio.shardCollect(tile.orderIndex);
                  spawnBurst(tile.x, tile.y, tile.accentHex, 14);
                  if (steppedTilesRef.current.length === subSpec.pressurePuzzle.tiles.length) {
                    retroAudio.secretFound();
                    callbacksRef.current.onSolvePuzzle(subSpec.pressurePuzzle.puzzleId);
                    showToast(subSpec.pressurePuzzle.successMessage);
                  } else {
                    showToast(
                      `Nodo ${tile.label} activado (${steppedTilesRef.current.length}/${subSpec.pressurePuzzle.tiles.length})`
                    );
                  }
                } else {
                  steppedTilesRef.current = [];
                  retroAudio.npcBlip(0.68);
                  showToast('Secuencia reiniciada · Consulta la pista de esta cámara');
                }
              }
            }
          }
          if (!onAnyTile) {
            lastTileSteppedId = '';
          }
        }
      }

      const targetHolder: { current: InteractivePromptTarget | null } = { current: null };
      let bestDist = 78;

      const isFacingTarget = (tx: number, ty: number, d: number): boolean => {
        if (d <= 28) return true;
        const dx = tx - player.x;
        const dy = ty - player.y;
        switch (player.facingDir) {
          case 'up':
            return dy <= 14 && Math.abs(dx) <= Math.max(44, Math.abs(dy) * 1.35);
          case 'down':
            return dy >= -14 && Math.abs(dx) <= Math.max(44, Math.abs(dy) * 1.35);
          case 'left':
            return dx <= 14 && Math.abs(dy) <= Math.max(44, Math.abs(dx) * 1.35);
          case 'right':
            return dx >= -14 && Math.abs(dy) <= Math.max(44, Math.abs(dx) * 1.35);
        }
      };

      const consider = (candidate: InteractivePromptTarget, maxDist = 74) => {
        const d = Math.hypot(player.x - candidate.x, player.y - candidate.y);
        const clampedMax = Math.min(maxDist, 92);
        if (d < clampedMax && d < bestDist && isFacingTarget(candidate.x, candidate.y, d)) {
          bestDist = d;
          targetHolder.current = candidate;
        }
      };

      if (curArea === 'exterior-70s') {
        const activeRect = isPointWalkableOnIsland(player.x, player.y, {
          southShortcut: st.southShortcutActive,
          gargantaBridge: st.glitchTrailCleared,
        });

        if (activeRect && activeRect.zoneId !== lastZoneNotified) {
          const previousZone = lastZoneNotified;
          lastZoneNotified = activeRect.zoneId;
          const zMeta = ISLAND_ZONES[activeRect.zoneId];
          setCurrentZoneId(activeRect.zoneId);
          setZoneBanner({
            numberLabel: zMeta.numberLabel,
            name: zMeta.name,
            subtitle: zMeta.subtitle,
            accentHex: zMeta.accentHex,
          });
          if (previousZone !== null) {
            retroAudio.zoneMotif(activeRect.zoneId);
          }
          if (!st.progressState.island70s.visitedZones.includes(activeRect.zoneId)) {
            callbacksRef.current.onVisitZone(activeRect.zoneId);
          }
        }

        if (flight.type === 'none' || flight.type === 'hoverboard') {
          const collectedIds = st.progressState.island70s.collectedDiamondIds;
          const activeSwitches = st.progressState.island70s.activatedIslandSwitches;
          for (const dia of ISLAND_DIAMONDS) {
            if (collectedIds.includes(dia.id)) continue;
            if (dia.requiresShortcut && !st.southShortcutActive) continue;
            if (
              dia.requiresSwitchId &&
              !activeSwitches.includes(dia.requiresSwitchId) &&
              !st.allUnlocked
            ) {
              continue;
            }
            if (Math.hypot(player.x - dia.x, player.y - dia.y) < 38) {
              callbacksRef.current.onCollectDiamond(dia.id);
              retroAudio.collectDiamond(collectedIds.length + 1);
              spawnBurst(dia.x, dia.y, '#00f3ff', 22);
              showToast(`¡Diamante de Memoria recuperado! · ${dia.label}`);
            }
          }

          // Punto de Guardado GBC en El Pueblo del Origen
          consider(
            {
              kind: 'save-terminal',
              id: VILLAGE_SAVE_TERMINAL.id,
              label: `${VILLAGE_SAVE_TERMINAL.label} · Punto de Guardado GBC`,
              actionLabel: 'Guardar Partida',
              x: VILLAGE_SAVE_TERMINAL.x,
              y: VILLAGE_SAVE_TERMINAL.y + 8,
              accentHex: '#38bdf8',
            },
            78
          );

          // Carteles de madera de orientación en las 5 grandes zonas
          for (const sign of ISLAND_WOODEN_SIGNS) {
            consider(
              {
                kind: 'wooden-sign',
                id: sign.id,
                label: sign.label,
                actionLabel: 'Leer Cartel',
                x: sign.x,
                y: sign.y + 6,
                accentHex: '#fde047',
              },
              74
            );
          }

          // Bocas de túneles subterráneos ocultas en formaciones rocosas costeras
          for (const tunnel of COASTAL_SUBTERRANEAN_TUNNELS) {
            consider(
              {
                kind: 'rock-tunnel',
                id: tunnel.id,
                label: tunnel.label,
                actionLabel: tunnel.actionLabel,
                x: tunnel.x,
                y: tunnel.y + 6,
                accentHex: '#c084fc',
              },
              76
            );
          }

          // Portales Anómalos exteriores (Atajo de Glifos y Portal Abisal en Cavernas)
          for (const portal of ISLAND_ANOMALY_PORTALS) {
            const unlocked =
              st.allUnlocked ||
              !portal.requiredSecretIds ||
              portal.requiredSecretIds.every((req) =>
                st.progressState.rpg.discoveredSecretIds.includes(req)
              );
            consider(
              {
                kind: 'anomaly-portal',
                id: portal.id,
                label: unlocked
                  ? `${portal.name} · Resonancia Activa`
                  : `${portal.name} · Anomalía Latente`,
                actionLabel: unlocked
                  ? 'Cruzar Portal Anómalo'
                  : 'Examinar Anomalía',
                x: portal.x,
                y: portal.y + 8,
                accentHex: portal.accentHex,
              },
              82
            );
          }

          // Puertas de edificios accesibles
          for (const bldg of ISLAND_70S_BUILDINGS) {
            consider(
              {
                kind: 'building-door',
                id: bldg.id,
                label: `${bldg.name} · ${bldg.subtitle}`,
                actionLabel: `Entrar a ${bldg.signText}`,
                x: bldg.doorX,
                y: bldg.doorY + 6,
                accentHex: bldg.trimHex,
              },
              84
            );
          }

          for (const cave of ISLAND_NORTH_CAVE_ENTRANCES) {
            consider(
              {
                kind: 'cave-entrance',
                id: cave.id,
                label: cave.label,
                actionLabel: cave.actionLabel,
                x: cave.x,
                y: cave.y + 6,
                accentHex: cave.accentHex,
              },
              78
            );
          }

          // Pasaje oculto tras la cascada norte
          const foundWf =
            st.progressState.rpg.discoveredSecretIds.includes('secret-cascada-gruta');
          consider(
            {
              kind: 'waterfall-entrance',
              id: WATERFALL_SECRET_ENTRANCE.id,
              label: foundWf
                ? 'Pasadizo a la Gruta Tras la Cascada'
                : 'Cortina de Agua con Brillo Misterioso',
              actionLabel: foundWf ? 'Entrar a la Gruta' : 'Atravesar Cascada',
              x: WATERFALL_SECRET_ENTRANCE.x,
              y: WATERFALL_SECRET_ENTRANCE.y + 8,
              accentHex: '#c084fc',
            },
            76
          );

          // Escotilla hacia el Laberinto Subterráneo de Señales (Sector 1976 · Breakout)
          const foundLab =
            st.progressState.rpg.discoveredSecretIds.includes('secret-laberinto-1976');
          consider(
            {
              kind: 'labyrinth-hatch',
              id: LABYRINTH_1976_ENTRANCE.id,
              label: foundLab
                ? 'Escotilla al Laberinto de Señales · Sector 1976'
                : LABYRINTH_1976_ENTRANCE.label,
              actionLabel: 'Descender al Laberinto',
              x: LABYRINTH_1976_ENTRANCE.x,
              y: LABYRINTH_1976_ENTRANCE.y + 8,
              accentHex: '#f97316',
            },
            80
          );

          // Criaturas Guardianas exteriores originales de PIXELVERSE
          for (const cr of GUARDIAN_CREATURES) {
            if (cr.areaId !== 'exterior-70s') continue;
            const calmed = st.progressState.rpg.calmedCreatureIds.includes(cr.id);
            consider(
              {
                kind: 'guardian-creature',
                id: cr.id,
                label: calmed ? `${cr.name} · Armonizado` : cr.name,
                actionLabel: cr.dormantPrompt,
                x: cr.x,
                y: cr.y + 6,
                accentHex: cr.accentHex,
              },
              82
            );
          }

          // Navío Astral rumbo a Isla Neón 1980s
          const ferryReady =
            st.invadersRestored ||
            st.allUnlocked ||
            st.progressState.rpg.unlockedIslands.includes('island-80s');
          consider(
            {
              kind: 'ferry-80s',
              id: HARBOR_80S_FERRY.id,
              label: ferryReady
                ? 'Navío Astral · Travesía a Isla Neón 1980s'
                : 'Navío Astral · Ruta Marítima a los Años 80 (Sellada)',
              actionLabel: ferryReady ? 'Zarpar a Isla 1980s' : 'Inspeccionar Embarcadero',
              x: HARBOR_80S_FERRY.x,
              y: HARBOR_80S_FERRY.y + 8,
              accentHex: '#f43f5e',
            },
            106
          );

          // Mecanismo averiado reparable con Soldador Lógico
          const mechRepaired = st.progressState.rpg.repairedMechanismIds.includes(
            BROKEN_RELAY_MECHANISM.id
          );
          consider(
            {
              kind: 'broken-relay',
              id: BROKEN_RELAY_MECHANISM.id,
              label: mechRepaired
                ? `${BROKEN_RELAY_MECHANISM.label} (Reparado)`
                : `${BROKEN_RELAY_MECHANISM.label} (Averiado)`,
              actionLabel: mechRepaired ? 'Ver Relé Activo' : 'Reparar / Inspeccionar',
              x: BROKEN_RELAY_MECHANISM.x,
              y: BROKEN_RELAY_MECHANISM.y + 6,
              accentHex: mechRepaired ? '#10b981' : '#f97316',
            },
            80
          );

          // Cofres exteriores
          for (const chest of RPG_CHESTS) {
            if (chest.areaId !== 'exterior-70s') continue;
            const opened = st.progressState.rpg.openedChestIds.includes(chest.id);
            consider(
              {
                kind: 'chest',
                id: chest.id,
                label: opened ? `${chest.label} (Abierto)` : chest.label,
                actionLabel: opened ? 'Cofre Vacío' : 'Abrir Cofre',
                x: chest.x,
                y: chest.y + 4,
                accentHex: chest.accentHex,
              },
              74
            );
          }

          // Pistas examinables exteriores
          for (const exam of RPG_EXAMINABLES) {
            if (exam.areaId !== 'exterior-70s') continue;
            consider(
              {
                kind: 'examinable',
                id: exam.id,
                label: exam.label,
                actionLabel: exam.actionLabel,
                x: exam.x,
                y: exam.y + 4,
                accentHex: exam.accentHex,
              },
              76
            );
          }

          consider(
            {
              kind: 'pong-cabinet',
              id: 'cabinet-pong-1972',
              label: st.pongRestored
                ? 'Gabinete Pong (1972) · Memoria Restaurada'
                : 'Gabinete Arcade Pong (1972) · Meta 3 Goles',
              actionLabel: st.pongRestored ? 'Rejugar Pong (1972)' : 'Encender Pong (1972)',
              x: ISLAND_KEY_COORDS.pongCabinet.x,
              y: ISLAND_KEY_COORDS.pongCabinet.y + 18,
              accentHex: '#facc15',
            },
            104
          );

          if (st.pongRestored) {
            consider({
              kind: 'pong-hoverboard-ride',
              id: 'board-at-pong',
              label: 'Tabla Voladora de Pong · Vuelo hacia La Garganta',
              actionLabel: 'Volar al Norte en Tabla',
              x: ISLAND_KEY_COORDS.pongBoardLaunch.x,
              y: ISLAND_KEY_COORDS.pongBoardLaunch.y,
              accentHex: '#00f3ff',
            });
            consider({
              kind: 'pong-hoverboard-ride',
              id: 'board-at-garganta',
              label: 'Tabla Voladora de Pong · Regreso al Santuario 1972',
              actionLabel: 'Volar al Santuario de Pong',
              x: ISLAND_KEY_COORDS.pongBoardLanding.x - 42,
              y: ISLAND_KEY_COORDS.pongBoardLanding.y + 16,
              accentHex: '#00f3ff',
            });
          }

          consider(
            {
              kind: 'glitch-portal',
              id: 'portal-glitch-trail',
              label: st.glitchTrailCleared
                ? 'El Sendero del Glitch Perdido · Puente Reconstruido'
                : 'Portal: El Sendero del Glitch Perdido',
              actionLabel: st.glitchTrailCleared
                ? 'Recorrer Sendero del Glitch'
                : 'Iniciar El Sendero del Glitch',
              x: ISLAND_KEY_COORDS.glitchTrailPortal.x,
              y: ISLAND_KEY_COORDS.glitchTrailPortal.y + 14,
              accentHex: '#00f3ff',
            },
            106
          );

          consider(
            {
              kind: 'invaders-cabinet',
              id: 'cabinet-invaders-1978',
              label: st.invadersRestored
                ? 'Gabinete Space Invaders (1978) · Memoria Restaurada'
                : `Gabinete Upright Space Invaders (1978) · Meta ${SPACE_INVADERS_UNLOCK_SCORE} PTS`,
              actionLabel: st.invadersRestored
                ? 'Rejugar Space Invaders'
                : 'Defender Sector 1978',
              x: ISLAND_KEY_COORDS.invadersCabinet.x,
              y: ISLAND_KEY_COORDS.invadersCabinet.y + 20,
              accentHex: '#39ff14',
            },
            106
          );

          const northArcades = NORTH_ARCADE_LAYOUT.arcades;
          const cuatroCaminosRestored = st.progressState.rpg.cuatroCaminosRestored;
          for (const arcade of [
            { id: 'sea-wolf', ...northArcades.seaWolf, label: 'Sea Wolf (1976)', action: 'Jugar Sea Wolf', accent: '#67e8f9' },
            { id: 'tank', ...northArcades.tank, label: 'Tank (1974)', action: 'Jugar Tank', accent: '#d9dc80' },
            { id: 'lunar-lander', ...northArcades.lunarLander, label: 'Lunar Lander (1979)', action: 'Jugar Lunar Lander', accent: '#e8e2c4' },
            { id: 'galaxian', ...northArcades.galaxian, label: 'Galaxian (1979)', action: 'Jugar Galaxian', accent: '#f43f5e' },
          ]) {
            consider({
              kind: 'north-arcade', id: arcade.id,
              label: cuatroCaminosRestored
                ? `Gabinete ${arcade.label} · Los Cuatro Caminos (Activo)`
                : `Gabinete ${arcade.label} · Fuera de Servicio`,
              actionLabel: cuatroCaminosRestored ? arcade.action : 'Examinar Avería',
              x: arcade.x, y: arcade.y + 20, accentHex: arcade.accent,
            }, 86);
          }

          consider({
            kind: 'night-driver-cabinet',
            id: 'cabinet-night-driver-1976',
            label: 'Terminal Experimental · Night Driver (1976)',
            actionLabel: 'Conducir Motocicleta Nocturna',
            x: ISLAND_KEY_COORDS.nightDriverTerminal.x,
            y: ISLAND_KEY_COORDS.nightDriverTerminal.y + 20,
            accentHex: '#38bdf8',
          }, 86);

          for (const arcade of [
            { id: 'asteroids', ...VOLCANIC_ARCADE_LAYOUT.asteroids, label: 'ASTEROIDS (1979)', action: 'Jugar Asteroids', accent: '#8df5db' },
            { id: 'breakout', ...VOLCANIC_ARCADE_LAYOUT.breakout, label: 'BREAKOUT (1976)', action: 'Jugar Breakout', accent: '#f59e0b' },
          ]) {
            consider({
              kind: 'volcanic-arcade', id: arcade.id,
              label: `Gabinete ${arcade.label} · Bastión Volcánico`, actionLabel: arcade.action,
              x: arcade.x, y: arcade.y + 20, accentHex: arcade.accent,
            }, 86);
          }

          const swordExtracted = st.progressState.rpg.discoveredSecretIds.includes('breakout-sword-extracted');
          consider({
            kind: 'breakout-stone', id: 'breakout-legendary-paddle',
            label: swordExtracted ? 'Piedra abierta · Espada Paleta reclamada' : st.breakoutRestored ? 'Piedra antigua · La paleta te espera' : 'Piedra antigua · Paleta legendaria sellada',
            actionLabel: swordExtracted ? 'Examinar la piedra' : st.breakoutRestored ? 'Reclamar la Espada Paleta' : 'Examinar la piedra',
            x: VOLCANIC_ARCADE_LAYOUT.breakoutStone.x, y: VOLCANIC_ARCADE_LAYOUT.breakoutStone.y + 28, accentHex: '#f5bb44',
          }, 78);

          consider({
            kind: 'astrolabe',
            id: 'monument-astrolabe',
            label: 'Astrolabio de las Eras · Cumbre del Arquitecto',
            actionLabel: 'Inspeccionar Astrolabio',
            x: ISLAND_KEY_COORDS.architectAstrolabe.x,
            y: ISLAND_KEY_COORDS.architectAstrolabe.y + 20,
            accentHex: '#7dd3fc',
          });

          for (const npc of ISLAND_NPCS) {
            consider({
              kind: 'npc',
              id: npc.id,
              label: npc.name,
              actionLabel: 'Conversar',
              x: npc.x,
              y: npc.y,
              accentHex: npc.palette.glow,
            });
          }

          for (const echo of ISLAND_ECHOES) {
            consider({
              kind: 'echo',
              id: echo.id,
              label: echo.title,
              actionLabel: 'Sintonizar Sombra',
              x: echo.x,
              y: echo.y,
              accentHex: echo.accentHex,
            });
          }

          for (const sw of ISLAND_SWITCHES) {
            const isOn = st.progressState.island70s.activatedIslandSwitches.includes(sw.id);
            consider({
              kind: 'switch',
              id: sw.id,
              label: sw.label,
              actionLabel: isOn ? 'Resonancia Activa' : 'Activar Pedestal',
              x: sw.x,
              y: sw.y,
              accentHex: sw.accentHex,
            });
          }

          for (const vista of DISTANT_DECADE_VISTAS) {
            consider(
              {
                kind: 'vista',
                id: vista.id,
                label: vista.title,
                actionLabel: 'Mirar por Telescopio Astral',
                x: vista.x,
                y: vista.y,
                accentHex: vista.accentHex,
              },
              96
            );
          }

          // Llegada cinematográfica al aproximarse al Castillo por la cresta norte
          if (
            player.y <= -440 &&
            player.y >= -580 &&
            player.x >= 1800 &&
            player.x <= 2100 &&
            !st.progressState.rpg.discoveredSecretIds.includes('castle-arrival-seen')
          ) {
            callbacksRef.current.onDiscoverSecret('castle-arrival-seen');
            retroAudio.doorTransition();
            window.setTimeout(() => retroAudio.doorTransition(), 350);
            window.setTimeout(() => retroAudio.doorTransition(), 700);
            setActiveDialog({
              category: 'ALERTA · CUMBRE SEPTENTRIONAL',
              title: 'El Castillo del Rey Corrupto',
              subtitle: 'Tres campanas doblan en la niebla polar',
              paragraphs: [
                '«Tres lentos tañidos de campana resuenan a través de los riscos helados, helando el aire a tu alrededor.»',
                '«Una voz colosal y distorsionada ruge desde las almenas más altas de la fortaleza: "¡NADIE LLEGA AL TRONO. NADIE ABANDONA EL REINO!"»',
                '«El puente levadizo se alza con violencia y pesadas cadenas de hierro bloquean el abismo. Los cuatro pedestales rúnicos del sendero se apagan.»',
              ],
              hint: 'Sigue la pista de la Estela Central para activar los 4 Sellos (Sol ☀, Luna ☾, Estrella ★, Rayo ⚡) y bajar el puente.',
              accentHex: '#c084fc',
            });
          }

          // Entrada exterior y pedestales de sellos
          const drawbridgeDown =
            st.allUnlocked ||
            st.progressState.rpg.discoveredSecretIds.includes('castle-drawbridge-lowered') ||
            st.progressState.rpg.solvedPuzzleIds.includes('puzzle-sellos-castillo');

          consider({
            kind: 'castle-entrance',
            id: 'gate-castillo-exterior',
            label: drawbridgeDown
              ? 'Puente Levadizo Bajado · Acceso al Castillo'
              : 'Puente Levadizo Alzado · Fortaleza Sellada',
            actionLabel: drawbridgeDown ? 'Cruzar al Castillo' : 'Inspeccionar Mecanismo',
            x: 1952,
            y: -580,
            accentHex: drawbridgeDown ? '#c084fc' : '#ef4444',
          });

          const sealSpecs = [
            { id: 'castle-seal-sol', x: 1840, y: -520, sym: '☀', label: 'Pedestal Solar [☀]', hex: '#f59e0b' },
            { id: 'castle-seal-luna', x: 1890, y: -500, sym: '☾', label: 'Pedestal Lunar [☾]', hex: '#38bdf8' },
            { id: 'castle-seal-estrella', x: 2014, y: -500, sym: '★', label: 'Pedestal Estelar [★]', hex: '#fde047' },
            { id: 'castle-seal-rayo', x: 2064, y: -520, sym: '⚡', label: 'Pedestal del Rayo [⚡]', hex: '#c084fc' },
          ];

          for (const sp of sealSpecs) {
            const isLit = st.progressState.rpg.discoveredSecretIds.includes(sp.id);
            consider({
              kind: 'castle-seal',
              id: sp.id,
              label: isLit ? `${sp.label} (Encendido)` : sp.label,
              actionLabel: isLit ? 'Sello Activo' : `Activar ${sp.sym}`,
              x: sp.x,
              y: sp.y,
              accentHex: sp.hex,
            });
          }
        }

        lastPosSaveTimer += dt;
        if (lastPosSaveTimer >= 1.8 && (flight.type === 'none' || flight.type === 'hoverboard')) {
          lastPosSaveTimer = 0;
          callbacksRef.current.onSavePosition(player.x, player.y);
        }
        if (flight.type === 'none') {
          const groundSafe =
            Boolean(
              isPointWalkableOnIsland(player.x, player.y, {
                southShortcut: st.southShortcutActive,
                gargantaBridge: st.glitchTrailCleared,
              })
            ) &&
            !isBlockedByExteriorBuilding(player.x, player.y) &&
            !isBlockedByIslandRouteRail(player.x, player.y);
          if (groundSafe) lastSafeGroundRef.current = { x: player.x, y: player.y };
        }
        miniMapSyncTimer += dt;
        if (miniMapSyncTimer >= 0.16) {
          miniMapSyncTimer = 0;
          setPlayerMiniPos({ x: player.x, y: player.y });
        }

        const targetCamX = Math.max(
          0,
          Math.min(
            ISLAND_WORLD_W - worldViewWidth(),
            player.x - worldViewWidth() * 0.5
          )
        );
        const targetCamY = Math.max(
          ISLAND_CAMERA_TOP,
          Math.min(
            ISLAND_WORLD_TOP + ISLAND_WORLD_H - worldViewHeight(),
            player.y - worldViewHeight() * 0.5
          )
        );
        camera.x += (targetCamX - camera.x) * Math.min(1, dt * 6.5);
        camera.y += (targetCamY - camera.y) * Math.min(1, dt * 6.5);

        if (
          st.progressState.rpg.dylanEscortActive &&
          !st.progressState.rpg.cuatroCaminosRestored &&
          !dylanRepairTriggeredRef.current
        ) {
          const distToJunction = Math.hypot(player.x - 1952, player.y - (-240));
          if (distToJunction < 110) {
            dylanRepairTriggeredRef.current = true;
            pickupBursts.push(
              { x: 1724, y: -240, vx: -25, vy: -35, life: 1.6, color: '#67e8f9' },
              { x: 1838, y: -240, vx: -12, vy: -40, life: 1.6, color: '#d9dc80' },
              { x: 2066, y: -240, vx: 12, vy: -40, life: 1.6, color: '#e8e2c4' },
              { x: 2180, y: -240, vx: 25, vy: -35, life: 1.6, color: '#f43f5e' }
            );
            retroAudio.caseDeductionSolved();
            callbacksRef.current.onRestoreCuatroCaminos?.();
            setActiveDialog({
              category: '¡RESTAURACIÓN HISTÓRICA! · LOS CUATRO CAMINOS',
              title: '¡Dylan ha Reparado la Sala Arcade!',
              subtitle: '3 Transistores de Germanio Calibrados en las 4 Cabinas',
              paragraphs: [
                '«¡Sincronización completada!», proclama Dylan con entusiasmo mientras ajusta los potenciómetros de las cuatro cabinas.',
                '«Los 3 transistores de germanio de 1976 han estabilizado las fuentes de alimentación conmutadas. Las pantallas de fósforo vectorial y tubos CRT vuelven a rugir con vida.»',
                'Las cuatro máquinas históricas están 100% operativas: Lunar Lander (1979), Sea Wolf (1976), Tank (1974) y Galaxian (1979).',
                'Los custodios Rodo y Nora celebran la hazaña. Conquista victorias en las 4 máquinas y forja el Cartucho ORIGEN para desbloquear el portón norte hacia el castillo de Gran Koopa.',
              ],
              hint: '¡Los Cuatro Caminos han vuelto a la vida! Acércate a cualquiera de las 4 máquinas para jugar.',
              accentHex: '#38bdf8',
            });
          }
        }

        for (let i = pickupBursts.length - 1; i >= 0; i--) {
          pickupBursts[i].x += pickupBursts[i].vx * dt;
          pickupBursts[i].y += pickupBursts[i].vy * dt;
          pickupBursts[i].life -= dt;
          if (pickupBursts[i].life <= 0) pickupBursts.splice(i, 1);
        }

        const resolvedTarget = targetHolder.current;
        const nextPromptId = resolvedTarget
          ? `${resolvedTarget.kind}:${resolvedTarget.id}:${resolvedTarget.actionLabel}`
          : '';
        if (nextPromptId !== prevPromptId) {
          prevPromptId = nextPromptId;
          setNearbyPrompt(resolvedTarget);
        }

        ctx.save();
        try {
          ctx.setTransform(dpr * cameraZoom, 0, 0, dpr * cameraZoom, 0, 0);
          renderIsland70sFrame({
            ctx,
            vw: worldViewWidth(),
            vh: worldViewHeight(),
            camera,
            elapsed,
            reducedMotion,
            stars,
            ambientBits,
            digitalCritters,
            pickupBursts,
            player,
            flight,
            pongBoardDeparture: pongBoardDepartureRef.current,
            skinColor: st.skinColor,
            hairColor: st.hairColor,
            shirtColor: st.shirtColor,
            appearance: st.appearance,
            pongRestored: st.pongRestored,
            breakoutRestored: st.breakoutRestored,
            glitchTrailCleared: st.glitchTrailCleared,
            invadersRestored: st.invadersRestored,
            invadersCabinetUnlocked: st.invadersCabinetUnlocked,
            volcanicPassageOpen: st.allUnlocked || st.progressState.island70s.talkedNpcIds.includes(VOLCANIC_GUARD_ID),
            breakoutSwordExtracting: st.breakoutSwordExtracting,
            southShortcutActive: st.southShortcutActive,
            allUnlocked: st.allUnlocked,
            progressState: st.progressState,
            activeZoneId: activeRect ? activeRect.zoneId : null,
            prompt: st.modalOpen ? null : nearbyPromptRef.current,
            scannerPulse: scannerPulseRef.current,
          });
        } finally {
          ctx.restore();
        }
      } else {
        // Sub-área activa: Interior accesible, sala secreta, cueva o Isla Neón 1980s
        const subSpec = SUB_AREAS[curArea];

        for (const exitSpec of subSpec.exits) {
          consider(
            {
              kind: 'sub-exit',
              id: exitSpec.id,
              label: exitSpec.label,
              actionLabel: exitSpec.actionLabel,
              x: exitSpec.x,
              y: exitSpec.y,
              accentHex: exitSpec.accentHex,
            },
            70
          );
        }

        for (const chest of RPG_CHESTS) {
          if (chest.areaId !== curArea) continue;
          const opened = st.progressState.rpg.openedChestIds.includes(chest.id);
          consider(
            {
              kind: 'chest',
              id: chest.id,
              label: opened ? `${chest.label} (Abierto)` : chest.label,
              actionLabel: opened ? 'Cofre Vacío' : 'Abrir Cofre',
              x: chest.x,
              y: chest.y + 4,
              accentHex: chest.accentHex,
            },
            68
          );
        }

        for (const exam of RPG_EXAMINABLES) {
          if (exam.areaId !== curArea) continue;
          const isOpenSecretWall =
            exam.isFalseWall &&
            exam.secretIdToDiscover &&
            st.progressState.rpg.discoveredSecretIds.includes(exam.secretIdToDiscover);
          consider(
            {
              kind: 'examinable',
              id: exam.id,
              label: isOpenSecretWall
                ? 'Pasadizo Abierto · Cámara Oculta de 1958'
                : exam.label,
              actionLabel: isOpenSecretWall ? 'Entrar a Sala Secreta' : exam.actionLabel,
              x: exam.x,
              y: exam.y + 12,
              accentHex: exam.accentHex,
            },
            72
          );
        }

        for (const snpc of RPG_SUBAREA_NPCS) {
          if (snpc.areaId !== curArea) continue;
          consider(
            {
              kind: 'sub-npc',
              id: snpc.id,
              label: snpc.name,
              actionLabel: 'Conversar',
              x: snpc.x,
              y: snpc.y,
              accentHex: snpc.palette.glow,
            },
            74
          );
        }

        for (const cr of GUARDIAN_CREATURES) {
          if (cr.areaId !== curArea) continue;
          const calmed = st.progressState.rpg.calmedCreatureIds.includes(cr.id);
          consider(
            {
              kind: 'guardian-creature',
              id: cr.id,
              label: calmed ? `${cr.name} · Corredor Despejado` : cr.name,
              actionLabel: calmed ? 'Conversar Frecuencia' : cr.dormantPrompt,
              x: cr.x,
              y: cr.y,
              accentHex: cr.accentHex,
            },
            80
          );
        }

        if (curArea === 'dungeon-laberinto-origen') {
          const doorOpen =
            st.allUnlocked ||
            st.progressState.rpg.solvedPuzzleIds.includes(LABYRINTH_SECRET_DOOR.puzzleId);
          consider(
            {
              kind: 'labyrinth-secret-door',
              id: LABYRINTH_SECRET_DOOR.id,
              label: doorOpen
                ? 'Compuerta Abierta · Sala Secreta de Breakout (1976)'
                : LABYRINTH_SECRET_DOOR.label,
              actionLabel: doorOpen ? 'Entrar a Sala 1976' : 'Inspeccionar Compuerta',
              x: LABYRINTH_SECRET_DOOR.x,
              y: LABYRINTH_SECRET_DOOR.y + 12,
              accentHex: doorOpen ? '#34d399' : '#f97316',
            },
            76
          );

          for (const pillar of LABYRINTH_RGB_PILLARS) {
            const lit =
              doorOpen || activeRgbPillarsRef.current.includes(pillar.stepOrder);
            consider(
              {
                kind: 'rgb-pillar',
                id: pillar.id,
                label: pillar.bandName,
                actionLabel: lit ? 'Frecuencia Activa' : 'Sintonizar Pilar',
                x: pillar.x,
                y: pillar.y,
                accentHex: pillar.colorHex,
              },
              66
            );
          }
        }

        if (curArea === 'interior-museo-viviente') {
          for (const spot of MUSEUM_PEDESTAL_SPOTS) {
            const exhibit = MUSEUM_1970S_EXHIBITS.find((e) => e.id === spot.exhibitId);
            if (!exhibit) continue;
            const isEncrypted =
              exhibit.id === 'exhibit-breakout-1976' &&
              !st.breakoutRestored &&
              !st.progressState.rpg.discoveredSecretIds.includes(
                'secret-sala-breakout-1976'
              );
            consider(
              {
                kind: 'museum-pedestal',
                id: exhibit.id,
                label: isEncrypted
                  ? 'Pedestal 1976 · Vitrina Cifrada'
                  : `${exhibit.year} · ${exhibit.title} (${
                      exhibit.mode === 'playable'
                        ? 'Jugable'
                        : exhibit.mode === 'playable-pending'
                        ? 'Desafío pendiente'
                        : 'Exhibición'
                    })`,
                actionLabel: 'Inspeccionar Vitrina',
                x: spot.x,
                y: spot.y + 8,
                accentHex: exhibit.accentHex,
              },
              66
            );
          }

          const vecSolved =
            st.allUnlocked ||
            st.progressState.rpg.solvedPuzzleIds.includes(MUSEUM_VECTOR_CONSOLE.puzzleId);
          consider(
            {
              kind: 'vector-console',
              id: MUSEUM_VECTOR_CONSOLE.id,
              label: vecSolved
                ? `${MUSEUM_VECTOR_CONSOLE.label} · Alineado`
                : MUSEUM_VECTOR_CONSOLE.label,
              actionLabel: vecSolved ? 'Ver Haz XY' : 'Calibrar Haces XY',
              x: MUSEUM_VECTOR_CONSOLE.x,
              y: MUSEUM_VECTOR_CONSOLE.y + 8,
              accentHex: '#a78bfa',
            },
            72
          );
        }

        if (curArea === 'interior-cronoscopio') {
          const tm = evaluateTimeMachineStatus(st.progressState, st.allUnlocked);
          consider(
            {
              kind: 'time-machine',
              id: TIME_MACHINE_CONSOLE.id,
              label: tm.canTravelTo80s
                ? 'El Cronoscopio · Etapa 4/4 · Salto Temporal 1980s Activo'
                : `El Cronoscopio · Máquina del Tiempo (Etapa ${tm.stageNumber}/4)`,
              actionLabel: tm.canTravelTo80s
                ? 'Viajar a la Década 1980s'
                : 'Examinar Cronoscopio',
              x: TIME_MACHINE_CONSOLE.x,
              y: TIME_MACHINE_CONSOLE.y,
              accentHex: tm.canTravelTo80s ? '#00f3ff' : '#d8be88',
            },
            96
          );
        }

        if (curArea === 'island-80s') {
          consider(
            {
              kind: 'dk-cabinet-80s',
              id: 'cabinet-dk-1981',
              label: st.dkRestored
                ? 'Gabinete Plataformas Verticales (1981) · Restaurado'
                : 'Gabinete Arcade de Vigas Rojas (1981) · Desafío Clásico',
              actionLabel: st.dkRestored ? 'Rejugar Clásico 1981' : 'Jugar Clásico 1981',
              x: DK_CABINET_80S_INTERACT.x,
              y: DK_CABINET_80S_INTERACT.y,
              accentHex: '#f43f5e',
            },
            88
          );

          lastPosSaveTimer += dt;
          if (lastPosSaveTimer >= 1.8) {
            lastPosSaveTimer = 0;
            callbacksRef.current.onSave80sPosition(player.x, player.y);
          }
        }

        // ===================================================================
        // PROMPTS Y LÓGICA DE SUB-ÁREAS DE EL CASTILLO DEL REY CORRUPTO
        // ===================================================================
        if (curArea === 'castle-laberinto') {
          const shortcutOpen =
            st.allUnlocked ||
            st.progressState.rpg.discoveredSecretIds.includes('castle-shortcut-gate-open');
          if (!shortcutOpen) {
            consider({
              kind: 'castle-shortcut-door',
              id: 'gate-laberinto-atajo',
              label: 'Reja de Hierro Forjado · Mecanismo de Cerrojo',
              actionLabel: 'Abrir Atajo Bidireccional',
              x: 480,
              y: 310,
              accentHex: '#818cf8',
            });
          }
        }

        if (curArea === 'castle-cimientos') {
          const hydCleared =
            st.allUnlocked ||
            st.progressState.rpg.solvedPuzzleIds.includes('puzzle-valvulas-hidraulicas');
          if (!hydCleared) {
            consider({
              kind: 'castle-valve',
              id: 'exam-castillo-valvula-caudal',
              label: 'Válvula de Caudal Hidráulico [A]',
              actionLabel: 'Girar Válvula A',
              x: 220,
              y: 230,
              accentHex: '#06b6d4',
            });
            consider({
              kind: 'castle-valve',
              id: 'exam-castillo-valvula-drenaje',
              label: 'Válvula de Drenaje Abisal [B]',
              actionLabel: 'Girar Válvula B',
              x: 460,
              y: 230,
              accentHex: '#06b6d4',
            });
            consider({
              kind: 'castle-valve',
              id: 'exam-castillo-valvula-presion',
              label: 'Válvula de Presión de Vapor [C]',
              actionLabel: 'Girar Válvula C',
              x: 700,
              y: 230,
              accentHex: '#06b6d4',
            });
          }
        }

        if (curArea === 'castle-biblioteca') {
          const libCleared =
            st.allUnlocked ||
            st.progressState.rpg.solvedPuzzleIds.includes('puzzle-cronica-reyes');
          if (!libCleared) {
            const lecterns = [
              { num: 1, x: 230, label: 'Atril I · Era Fundacional' },
              { num: 2, x: 390, label: 'Atril II · Hangar Estelar' },
              { num: 3, x: 550, label: 'Atril III · Sombra de KOOPA' },
              { num: 4, x: 710, label: 'Atril IV · Purificación' },
            ];
            for (const lec of lecterns) {
              const placed = chroniclesPlacedRef.current.includes(lec.num);
              consider({
                kind: 'castle-lectern',
                id: `exam-castillo-biblioteca-atril-${lec.num}`,
                label: placed ? `${lec.label} (Encajado)` : lec.label,
                actionLabel: placed ? 'Leer Fragmento' : `Colocar Fragmento ${lec.num}`,
                x: lec.x,
                y: 320,
                accentHex: '#f59e0b',
              });
            }
          }
        }

        if (curArea === 'castle-torre') {
          const torreCleared =
            st.allUnlocked ||
            st.progressState.rpg.solvedPuzzleIds.includes('puzzle-torre-tiempo');
          if (!torreCleared) {
            consider({
              kind: 'castle-tower-lever',
              id: 'exam-castillo-torre-palanca-izq',
              label: towerLeversRef.current.left
                ? 'Palanca Izquierda (Sincronizada)'
                : 'Palanca de Engranaje Mayor',
              actionLabel: 'Sincronizar Engranaje',
              x: 260,
              y: 260,
              accentHex: '#fbbf24',
            });
            consider({
              kind: 'castle-tower-lever',
              id: 'exam-castillo-torre-palanca-der',
              label: towerLeversRef.current.right
                ? 'Palanca Derecha (Sincronizada)'
                : 'Palanca de Péndulo Boreal',
              actionLabel: 'Alinear Péndulo',
              x: 640,
              y: 260,
              accentHex: '#fbbf24',
            });
          }
        }

        if (curArea === 'castle-trono') {
          const boss = bossCombatStateRef.current;
          if (
            boss.dkPurified ||
            st.allUnlocked ||
            st.progressState.rpg.discoveredSecretIds.includes('castle-donkey-kong-freed')
          ) {
            boss.dkPurified = true;
            consider({
              kind: 'castle-ship-launch',
              id: 'ship-space-invaders-escape',
              label: 'Nave Insignia de Space Invaders · Puente a la Isla de los 80',
              actionLabel: 'Abordar Nave y Despegar',
              x: 490,
              y: 80,
              accentHex: '#22c55e',
            });
          } else {
            boss.attackTimer = (boss.attackTimer || 0) + dt;

            // Frecuencia de barriles y ondas de choque
            if (boss.phase === 1 && boss.attackTimer > 2.0) {
              boss.attackTimer = 0;
              boss.shockwaves.push({
                x: boss.dkPos.x,
                y: boss.dkPos.y + 20,
                r: 10,
                maxR: 160,
                alpha: 1,
              });
              const dir = Math.random() > 0.5 ? 1 : -1;
              boss.barrels.push({
                x: boss.dkPos.x,
                y: boss.dkPos.y + 40,
                vx: dir * 140,
                angle: 0,
              });
            }

            for (let bIdx = boss.barrels.length - 1; bIdx >= 0; bIdx--) {
              const b = boss.barrels[bIdx];
              b.x += b.vx * dt;
              b.angle += (b.vx > 0 ? 1 : -1) * dt * 8;
              if (b.x < 120 || b.x > 860) {
                boss.barrels.splice(bIdx, 1);
              }
            }

            for (let sIdx = boss.shockwaves.length - 1; sIdx >= 0; sIdx--) {
              const sw = boss.shockwaves[sIdx];
              sw.r += 90 * dt;
              sw.alpha -= 0.6 * dt;
              if (sw.alpha <= 0 || sw.r >= sw.maxR) {
                boss.shockwaves.splice(sIdx, 1);
              }
            }

            if (boss.phase === 1) {
              consider({
                kind: 'castle-boss-hit',
                id: 'boss-dk-corrupto',
                label: 'Donkey Kong Corrupto [Fase 1] · Furia de Barriles',
                actionLabel: '¡Atacar a Donkey Kong!',
                x: boss.dkPos.x,
                y: boss.dkPos.y + 20,
                accentHex: '#ef4444',
              });
            } else if (boss.phase === 2) {
              consider({
                kind: 'castle-boss-conduit',
                id: 'conduit-west',
                label: boss.conduitOverloads[0]
                  ? 'Acumulador Izquierdo (Sobrecargado)'
                  : 'Acumulador Izquierdo de Corrupción',
                actionLabel: boss.conduitOverloads[0]
                  ? 'Circuito Colapsado'
                  : 'Sobrecargar Acumulador',
                x: 200,
                y: 230,
                accentHex: '#ec4899',
              });
              consider({
                kind: 'castle-boss-conduit',
                id: 'conduit-east',
                label: boss.conduitOverloads[1]
                  ? 'Acumulador Derecho (Sobrecargado)'
                  : 'Acumulador Derecho de Corrupción',
                actionLabel: boss.conduitOverloads[1]
                  ? 'Circuito Colapsado'
                  : 'Sobrecargar Acumulador',
                x: 732,
                y: 230,
                accentHex: '#ec4899',
              });

              if (boss.conduitOverloads[0] && boss.conduitOverloads[1]) {
                consider({
                  kind: 'castle-boss-hit',
                  id: 'boss-dk-corrupto-stunned',
                  label: 'Donkey Kong · Coraza Violeta Desactivada',
                  actionLabel: '¡Golpear para Disipar!',
                  x: boss.dkPos.x,
                  y: boss.dkPos.y + 20,
                  accentHex: '#facc15',
                });
              }
            } else if (boss.phase === 3) {
              consider({
                kind: 'castle-boss-hit',
                id: 'boss-corruption-core',
                label: 'Núcleo Digital de Super KOOPA [Fase Final]',
                actionLabel: '¡Destruir el Núcleo!',
                x: boss.dkPos.x,
                y: boss.dkPos.y - 80,
                accentHex: '#f43f5e',
              });
            }
          }
        }

        for (let i = pickupBursts.length - 1; i >= 0; i--) {
          pickupBursts[i].x += pickupBursts[i].vx * dt;
          pickupBursts[i].y += pickupBursts[i].vy * dt;
          pickupBursts[i].life -= dt;
          if (pickupBursts[i].life <= 0) pickupBursts.splice(i, 1);
        }

        const resolvedTarget = targetHolder.current;
        const nextPromptId = resolvedTarget
          ? `${resolvedTarget.kind}:${resolvedTarget.id}:${resolvedTarget.actionLabel}`
          : '';
        if (nextPromptId !== prevPromptId) {
          prevPromptId = nextPromptId;
          setNearbyPrompt(resolvedTarget);
        }

        renderSubAreaFrame({
          ctx,
          vw,
          vh,
          area: subSpec,
          elapsed,
          reducedMotion,
          player,
          skinColor: st.skinColor,
          hairColor: st.hairColor,
          shirtColor: st.shirtColor,
          appearance: st.appearance,
          progressState: st.progressState,
          allUnlocked: st.allUnlocked,
          steppedTileOrder: steppedTilesRef.current,
          activeRgbPillars: activeRgbPillarsRef.current,
          pickupBursts,
          prompt: st.modalOpen ? null : nearbyPromptRef.current,
          scannerPulse: scannerPulseRef.current,
          bossCombatState: bossCombatStateRef.current,
        });
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      reducedMotionQuery.removeEventListener('change', onMotionChange);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onCanvasPointerDown);
    };
  }, [
    handleToggleLanternAction,
    handleUseScannerPulse,
    resolveVolcanicGuardChoice,
    showToast,
    triggerInteraction,
  ]);

  const currentZone = ISLAND_ZONES[currentZoneId];
  const activeSubArea = activeAreaId !== 'exterior-70s' ? SUB_AREAS[activeAreaId] : null;
  const collectedDiamondsCount = progressState.island70s.collectedDiamondIds.length;
  const restoredArcadesCount =
    (pongRestored ? 1 : 0) +
    (breakoutRestored ? 1 : 0) +
    (glitchTrailCleared ? 1 : 0) +
    (invadersRestored ? 1 : 0) +
    (dkRestored ? 1 : 0);

  const completedQuestsCount = RPG_QUESTS.filter(
    (q) =>
      allUnlocked ||
      progressState.rpg.questStates[q.id] === 'completed' ||
      q.steps.every((s) => s.isDone(progressState, allUnlocked))
  ).length;

  const currentObjectiveText =
    activeAreaId === 'island-80s'
      ? !dkRestored
        ? 'Habla con la Capitana Vectoria y supera el gabinete vertical de 1981 al este del paseo'
        : 'Isla Neón 1980s explorada · Abre el cofre binario del callejón o regresa en el Navío'
      : !pongRestored
      ? 'Camina al sureste hasta El Santuario de Pong y anota 3 goles en Pong (1972)'
      : !glitchTrailCleared
      ? 'Vuela al norte en la Tabla de Pong y supera El Sendero del Glitch Perdido'
      : !invadersRestored
      ? `Cruza el Puente Astral hacia La Fortaleza y alcanza ${SPACE_INVADERS_UNLOCK_SCORE} PTS en Space Invaders`
      : '¡Puerto Este abierto! Zarpa hacia la Isla Neón 1980s o descubre las salas secretas [Q]';

  const eraBadgeText =
    activeAreaId === 'island-80s'
      ? 'ISLA 1980s'
      : `ISLA DEL ORIGEN · ${progressState.island70s.visitedZones.length}/10 ZONAS`;

  const currentLocationName = activeSubArea
    ? activeSubArea.name
    : zoneBanner
    ? `${zoneBanner.numberLabel} · ${zoneBanner.name}`
    : currentZone.name;

  const currentLocationSubtitle = activeSubArea
    ? activeSubArea.subtitle
    : currentZone.subtitle;

  const renderMinimapMap = () => {
    const mapY = (y: number) => `${((y - ISLAND_WORLD_TOP) / ISLAND_WORLD_H) * 100}%`;
    return (
      <div
      role="img"
      aria-label="Minimapa completo de la Isla del Origen con terreno, caminos, edificios y posición del jugador"
      className="relative w-full overflow-hidden border-2 border-[#070b14] bg-[#134e6f]"
      style={{ aspectRatio: ISLAND_WORLD_W / ISLAND_WORLD_H }}
    >
      <div className="absolute inset-[3%] overflow-hidden">
        {ISLAND_WALKABLE_RECTS.map((r) => {
          if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) return null;
          if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) return null;

          const colorClass =
            r.surface === 'pier'
              ? 'bg-[#9c6834]'
              : r.surface === 'bridge'
              ? 'bg-[#b45309]'
              : r.surface === 'sand'
              ? 'bg-[#e4ca86]'
              : r.surface === 'fortress'
              ? 'bg-[#7f1d1d]'
              : r.surface === 'crystal'
              ? 'bg-[#6b4b83]'
              : r.zoneId === 'bosque-circuitos'
              ? 'bg-[#15803d]'
              : r.zoneId === 'costa-despertar'
              ? 'bg-[#cbd5a0]'
              :               r.zoneId === 'cumbre-septentrional'
                ? 'bg-[#64748b]'
                : r.zoneId === 'puerto-islas-perdidas'
              ? 'bg-[#d6bc88]'
              : 'bg-[#4ade80]';

          return (
            <div
              key={r.id}
              style={{
                left: `${(r.x / ISLAND_WORLD_W) * 100}%`,
                top: mapY(r.y),
                width: `${(r.w / ISLAND_WORLD_W) * 100}%`,
                height: `${(r.h / ISLAND_WORLD_H) * 100}%`,
              }}
              className={`absolute ${colorClass}`}
            />
          );
        })}

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 ${ISLAND_WORLD_TOP} ${ISLAND_WORLD_W} ${ISLAND_WORLD_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <g
            fill="none"
            stroke="#59472f"
            strokeWidth="38"
            strokeLinejoin="miter"
            strokeLinecap="square"
          >
            <path d="M416 1760 H560 V1808 H688 V1856 H944" />
            <path d="M560 1808 H544 V1936 H672 V1952 H816" />
            <path d="M640 1600 V1488 H672 V1408 H816 V1360 H928 V1280 H960 V1104" />
            <path d="M928 1280 H1616" />
            <path d="M1616 1280 H1888 V1200 H1936 H2144 V1424 V1584 H2592 H2816 V1616" />
            <path d="M1888 1280 H1760 V1424 H1664 V1536" />
            <path d="M1648 1280 V1056" />
            <path d="M2688 1568 V1360" />
            <path d="M1952 160 V80 V-112 V-448 V-640" />
            <path d="M1952 -144 H1552 H1392 H1240" />
            <path d="M1952 -128 H2352 H2608 H2848" />
          </g>
          <g
            fill="none"
            stroke="#d3bb8b"
            strokeWidth="22"
            strokeLinejoin="miter"
            strokeLinecap="square"
          >
            <path d="M416 1760 H560 V1808 H688 V1856 H944" />
            <path d="M560 1808 H544 V1936 H672 V1952 H816" />
            <path d="M640 1600 V1488 H672 V1408 H816 V1360 H928 V1280 H960 V1104" />
            <path d="M928 1280 H1616" />
            <path d="M1616 1280 H1888 V1200 H1936 H2144 V1424 V1584 H2592 H2816 V1616" />
            <path d="M1888 1280 H1760 V1424 H1664 V1536" />
            <path d="M1648 1280 V1056" />
            <path d="M2688 1568 V1360" />
            <path d="M1952 160 V80 V-112 V-448 V-640" />
            <path d="M1952 -144 H1552 H1392 H1240" />
            <path d="M1952 -128 H2352 H2608 H2848" />
          </g>
        </svg>

        {ISLAND_70S_BUILDINGS.map((building) => (
          <div
            key={building.id}
            title={building.name}
            style={{
              left: `${(building.x / ISLAND_WORLD_W) * 100}%`,
              top: mapY(building.y),
              width: `${(building.w / ISLAND_WORLD_W) * 100}%`,
              height: `${(building.h / ISLAND_WORLD_H) * 100}%`,
            }}
            className="absolute border border-[#2d241d] bg-[#8b5a3c]"
          />
        ))}

        <div
          title="Punto de Guardado · El Pueblo del Origen"
          style={{
            left: `${(VILLAGE_SAVE_TERMINAL.x / ISLAND_WORLD_W) * 100}%`,
            top: mapY(VILLAGE_SAVE_TERMINAL.y),
          }}
          className="absolute h-[3%] w-[1.5%] -translate-x-1/2 -translate-y-1/2 border border-black bg-[#38bdf8]"
        />
        <div
          title="Pong (1972)"
          style={{
            left: `${(ISLAND_KEY_COORDS.pongCabinet.x / ISLAND_WORLD_W) * 100}%`,
            top: mapY(ISLAND_KEY_COORDS.pongCabinet.y),
          }}
          className="absolute h-[3%] w-[1.5%] -translate-x-1/2 -translate-y-1/2 border border-black bg-[#fde047]"
        />
        <div
          title="Sendero del Glitch"
          style={{
            left: `${(ISLAND_KEY_COORDS.glitchTrailPortal.x / ISLAND_WORLD_W) * 100}%`,
            top: mapY(ISLAND_KEY_COORDS.glitchTrailPortal.y),
          }}
          className="absolute h-[3%] w-[1.5%] -translate-x-1/2 -translate-y-1/2 border border-black bg-[#00f3ff]"
        />
        <div
          title="Space Invaders (1978)"
          style={{
            left: `${(ISLAND_KEY_COORDS.invadersCabinet.x / ISLAND_WORLD_W) * 100}%`,
            top: mapY(ISLAND_KEY_COORDS.invadersCabinet.y),
          }}
          className="absolute h-[3%] w-[1.5%] -translate-x-1/2 -translate-y-1/2 border border-black bg-[#ef4444]"
        />
        <div
          title="Observatorio del Cronoscopio"
          style={{
            left: `${(2150 / ISLAND_WORLD_W) * 100}%`,
            top: mapY(1140),
          }}
          className="absolute h-[3%] w-[1.5%] -translate-x-1/2 -translate-y-1/2 border border-black bg-[#c084fc]"
        />
        <div
          title="Museo Viviente de los 70"
          style={{
            left: `${(1648 / ISLAND_WORLD_W) * 100}%`,
            top: mapY(1012),
          }}
          className="absolute h-[3%] w-[1.5%] -translate-x-1/2 -translate-y-1/2 border border-black bg-[#22d3ee]"
        />
        <div
          title="Escotilla Breakout"
          style={{
            left: `${(LABYRINTH_1976_ENTRANCE.x / ISLAND_WORLD_W) * 100}%`,
            top: mapY(LABYRINTH_1976_ENTRANCE.y),
          }}
          className="absolute h-[3%] w-[1.5%] -translate-x-1/2 -translate-y-1/2 border border-black bg-[#f97316]"
        />
        <div
          title="Muelle y ferry a la Isla Neón 1980s"
          style={{
            left: `${(HARBOR_80S_FERRY.x / ISLAND_WORLD_W) * 100}%`,
            top: mapY(HARBOR_80S_FERRY.y),
          }}
          className="absolute h-[3%] w-[1.5%] -translate-x-1/2 -translate-y-1/2 border border-black bg-[#f472b6]"
        />
        {ISLAND_NORTH_CAVE_ENTRANCES.map((cave) => (
          <div
            key={cave.id}
            title={cave.label}
            style={{
              left: `${(cave.x / ISLAND_WORLD_W) * 100}%`,
              top: mapY(cave.y),
            }}
            className="absolute h-[3%] w-[1.5%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#07111a] bg-[#67e8f9]"
          />
        ))}
        <div
          title="Posición del jugador"
          style={{
            left: `${(playerMiniPos.x / ISLAND_WORLD_W) * 100}%`,
            top: mapY(playerMiniPos.y),
          }}
          className="absolute h-[4%] w-[2%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white shadow-[0_0_3px_1px_#020b12]"
        />
      </div>
    </div>
  );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#020614]">
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />

      {volcanicGuardDialog && (
        <div className="pointer-events-none absolute inset-x-0 top-[14%] z-25 flex justify-center px-3 sm:top-[12%] sm:px-6" aria-live="assertive">
          <section className="pointer-events-auto relative w-full max-w-2xl border-[3px] border-[#171319] bg-[#24171a] p-[3px] shadow-[0_8px_0_rgba(0,0,0,.55),0_0_24px_rgba(249,115,22,.28)]">
            <div className="border-2 border-[#d38d3b] bg-[radial-gradient(ellipse_at_top,#51332c_0%,#281a1c_74%)] px-4 py-3 sm:px-6 sm:py-4">
              <div className="mb-2 flex items-center gap-2 border-b border-[#d38d3b]/60 pb-2">
                <span className="inline-block h-3 w-3 border-2 border-[#ffe27e] bg-[#e96229] shadow-[0_0_8px_#f97316]" />
                <p className="font-mono text-[10px] font-bold tracking-[.18em] text-[#ffd27a] sm:text-xs">GUARDIA ANTIFLAMA · BASTIÓN VOLCÁNICO</p>
              </div>
              <p className="font-mono text-xs font-bold leading-relaxed text-[#fff5dc] sm:text-sm">
                {volcanicGuardDialog === 'choice'
                  ? '¡CUIDADO! ESTA ES ZONA PELIGROSA. ¡ACABAN DE INVADIR ESTA ZONA! ¿ESTÁS SEGURO DE QUE QUIERES SEGUIR?'
                  : volcanicGuardDialog === 'no'
                  ? '¡ESTO ES PARA VALIENTES!'
                  : '¡QUÉ CRACK! ME SORPRENDE TU VALENTÍA. ¡BUENA SUERTE!'}
              </p>
              {volcanicGuardDialog === 'choice' ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
                  <button
                    type="button"
                    aria-pressed={volcanicGuardChoice === 'yes'}
                    onMouseEnter={() => { volcanicGuardChoiceRef.current = 'yes'; setVolcanicGuardChoice('yes'); }}
                    onClick={() => resolveVolcanicGuardChoice('yes')}
                    className={`border-2 px-3 py-2 text-left font-mono text-[11px] font-bold tracking-wide transition-colors sm:text-xs ${volcanicGuardChoice === 'yes' ? 'border-[#ffe27e] bg-[#bc4d20] text-white shadow-[inset_0_0_0_2px_#7a2d1b]' : 'border-[#9a6540] bg-[#322323] text-[#e7cfaa] hover:border-[#ffe27e]'}`}
                  >{volcanicGuardChoice === 'yes' ? '▶ SÍ, CONTINUAR' : '  SÍ, CONTINUAR'}</button>
                  <button
                    type="button"
                    aria-pressed={volcanicGuardChoice === 'no'}
                    onMouseEnter={() => { volcanicGuardChoiceRef.current = 'no'; setVolcanicGuardChoice('no'); }}
                    onClick={() => resolveVolcanicGuardChoice('no')}
                    className={`border-2 px-3 py-2 text-left font-mono text-[11px] font-bold tracking-wide transition-colors sm:text-xs ${volcanicGuardChoice === 'no' ? 'border-[#ffe27e] bg-[#bc4d20] text-white shadow-[inset_0_0_0_2px_#7a2d1b]' : 'border-[#9a6540] bg-[#322323] text-[#e7cfaa] hover:border-[#ffe27e]'}`}
                  >{volcanicGuardChoice === 'no' ? '▶ NO, VOLVER' : '  NO, VOLVER'}</button>
                </div>
              ) : (
                <p className="mt-3 text-right font-mono text-[10px] font-bold tracking-widest text-[#ffd27a]">CONTINUAR · [ENTER]</p>
              )}
              {volcanicGuardDialog === 'choice' && (
                <p className="mt-2 text-right font-mono text-[9px] tracking-wide text-[#d8ba94]">SELECCIONAR · [←/→] &nbsp; CONFIRMAR · [ENTER]</p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Cortina rápida de transición pixelada al cruzar puertas, cuevas o islas */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-30 bg-[#020510] transition-opacity duration-150 ${
          areaFadeActive ? 'opacity-95' : 'opacity-0'
        }`}
      />

      {/* Secuencia ceremonial del Salto Temporal en El Cronoscopio (1970s -> 1980s) */}
      {chronoWarpActive && (
        <div className="fixed inset-0 z-50 chrono-warp-backdrop flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <div className="w-28 h-28 rounded-full border-4 border-[#00f3ff] flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(0,243,255,0.65)]">
            <div className="w-16 h-16 border-2 border-[#fde047] rotate-45 flex items-center justify-center">
              <div className="w-6 h-6 bg-white" />
            </div>
          </div>
          <p className="text-[11px] font-mono-tabular font-bold tracking-[0.28em] text-[#fde047] uppercase">
            EL CRONOSCOPIO · APERTURA TEMPORAL ACTIVA
          </p>
          <h2 className="font-mono text-xl sm:text-2xl font-bold text-white mt-2">
            1970s : ISLA DEL ORIGEN → 1980s : ERA DEL NEÓN
          </h2>
          <p className="text-xs font-mono text-[#bae6fd] mt-2 max-w-md">
            Sincronizando memorias restauradas y anclando coordenadas en el Paseo de las Vigas Rojas...
          </p>
        </div>
      )}

      {activeAreaId === 'exterior-70s' && (
        <>
          {minimapOpen && (
            <div className="fixed bottom-3 right-3 z-20 w-[min(15rem,55vw)] max-w-[calc(100vw-1.5rem)] gbc-hud-frame p-2 space-y-1.5 pointer-events-auto">
              <div className="flex items-center justify-between text-[9px] font-mono-tabular font-bold text-[#fde047] px-0.5">
                <span className="inline-flex items-center gap-1">
                  <MapIcon className="w-3 h-3 text-[#fde047]" />
                  <span>MAPA · ISLA DEL ORIGEN</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    setMinimapOpen(false);
                  }}
                  className="text-white hover:text-[#fde047] cursor-pointer font-bold"
                >
                [M / TAB / X]
                </button>
              </div>
              {renderMinimapMap()}
              <div className="flex items-center justify-between text-[9px] font-mono-tabular text-slate-200 px-0.5">
                <span>WASD / Clic · 4 Dir</span>
                <span>Shift · Correr</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* HUD Dock for Active Powers [1-4] */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-20 glass-panel px-3 py-1.5 rounded-xl border border-[#00f3ff]/40 flex items-center gap-2 text-xs font-mono">
          <span className="text-[10px] text-[#fde047] font-bold mr-1 hidden sm:inline">PODERES:</span>
        <button
          type="button"
          onClick={() => { setActivePower('pong-hoverboard'); executeActivePower('pong-hoverboard'); }}
          disabled={!isIslandPowerUnlocked('pong-hoverboard', progressState, allUnlocked)}
          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            activePower === 'pong-hoverboard' ? 'bg-[#facc15] text-black shadow-[0_0_10px_#facc15]' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          [1] Paleta {!isIslandPowerUnlocked('pong-hoverboard', progressState, allUnlocked) ? '· BLOQ' : flightFuelUi <= 0 && !allUnlocked ? '· SIN COMBUSTIBLE' : vehicleFlightRef.current.type === 'hoverboard' ? `· ${flightFuelUi}%` : `· ${flightFuelUi}% LISTA`}
        </button>
        <button
          type="button"
          onClick={() => { setActivePower('shifting-blade'); executeActivePower('shifting-blade'); }}
          disabled={!isIslandPowerUnlocked('shifting-blade', progressState, allUnlocked)}
          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            activePower === 'shifting-blade' ? 'bg-[#f97316] text-white shadow-[0_0_10px_#f97316]' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          [2] Espada ({bladeMode === 'short' ? 'Corta' : bladeMode === 'extended' ? 'Larga' : 'Pistola'}) {!isIslandPowerUnlocked('shifting-blade', progressState, allUnlocked) ? '· BLOQ' : ''}
        </button>
        <button type="button" disabled={!isIslandPowerUnlocked('shifting-blade', progressState, allUnlocked)} onClick={() => setBladeMode((mode) => mode === 'short' ? 'extended' : mode === 'extended' ? 'gun' : 'short')} className="px-1 py-1 rounded-md text-[10px] text-slate-200 bg-slate-900 hover:bg-slate-700 disabled:opacity-40" title="Cambiar modo de arma">[C] MODO</button>
        <button
          type="button"
          onClick={() => { setActivePower('orbital-dash'); executeActivePower('orbital-dash'); }}
          disabled={!isIslandPowerUnlocked('orbital-dash', progressState, allUnlocked)}
          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            activePower === 'orbital-dash' ? 'bg-[#00f3ff] text-black shadow-[0_0_10px_#00f3ff]' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          [3] Dash {!isIslandPowerUnlocked('orbital-dash', progressState, allUnlocked) ? '· BLOQ' : dashCooldown > 0 ? `· ${dashCooldown.toFixed(1)}s` : '· LISTO'}
        </button>
        <button
          type="button"
          onClick={() => { setActivePower('sonar-pulse'); executeActivePower('sonar-pulse'); }}
          disabled={!isIslandPowerUnlocked('sonar-pulse', progressState, allUnlocked)}
          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            activePower === 'sonar-pulse' ? 'bg-[#10b981] text-black shadow-[0_0_10px_#10b981]' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          [4] Sonar {!isIslandPowerUnlocked('sonar-pulse', progressState, allUnlocked) ? '· BLOQ' : sonarActive ? '· ACTIVO' : '· LISTO'}
        </button>
        <button
          type="button"
          onClick={() => executeActivePower()}
          className="btn-ui px-3 py-1 rounded-md text-[11px] font-bold text-[#fde047] cursor-pointer ml-1"
        >
          ⚡ [F] Ejecutar
        </button>
      </div>

      {/* Legacy Power Selection Modal */}
      {legacyPowerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-xl glass-panel p-6 rounded-2xl border-2 border-[#00f3ff] space-y-4">
            <div className="text-[#fde047] font-mono text-xs font-bold tracking-widest uppercase">
              FIN DE LA ISLA DEL ORIGEN · LEGADO DEL ARQUITECTO
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-mono text-white">
              Elige un Único Poder como Legado para la Siguiente Era
            </h2>
            <p className="text-xs text-slate-300 font-mono">
              Tus recuerdos, victorias y sectores desbloqueados permanecen guardados para siempre. Selecciona el poder que perdurará activo durante tu travesía en la Isla de los 80:
            </p>

            <div className="grid grid-cols-2 gap-3 text-left">
              <button
                type="button"
                onClick={() => setSelectedLegacyPower('pong-hoverboard')}
                className={`p-3 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                  selectedLegacyPower === 'pong-hoverboard'
                    ? 'border-[#facc15] bg-[#facc15]/20 text-white'
                    : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-[#facc15]">1. Paleta Voladora (Pong)</div>
                <div className="text-[10px] text-slate-400 mt-1">Planea sobre terrenos y fisuras consumiendo fósforo.</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLegacyPower('shifting-blade')}
                className={`p-3 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                  selectedLegacyPower === 'shifting-blade'
                    ? 'border-[#f97316] bg-[#f97316]/20 text-white'
                    : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-[#f97316]">2. Espada Cambiante (Breakout)</div>
                <div className="text-[10px] text-slate-400 mt-1">Hoja de 3 modos: corta, látigo 4-bandas y pistola de energía.</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLegacyPower('orbital-dash')}
                className={`p-3 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                  selectedLegacyPower === 'orbital-dash'
                    ? 'border-[#00f3ff] bg-[#00f3ff]/20 text-white'
                    : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-[#00f3ff]">3. Dash Orbital (Asteroids)</div>
                <div className="text-[10px] text-slate-400 mt-1">Impulso vectorial inercial que irrumpe a través de glitches.</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLegacyPower('sonar-pulse')}
                className={`p-3 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                  selectedLegacyPower === 'sonar-pulse'
                    ? 'border-[#10b981] bg-[#10b981]/20 text-white'
                    : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-[#10b981]">4. Pulso Sonar (Sea Wolf)</div>
                <div className="text-[10px] text-slate-400 mt-1">Onda sónica por periscopio que revela secretos e interactivos.</div>
              </button>
            </div>

            <button
              type="button"
              disabled={!selectedLegacyPower}
              onClick={() => {
                if (!selectedLegacyPower) return;
                setLegacyPowerModalOpen(false);
                callbacksRef.current.onEquipCosmetic(selectedLegacyPower);
                showToast(`¡Poder Legado Consagrado: ${selectedLegacyPower}!`);
                callbacksRef.current.onEnterDonkeyKong();
              }}
              className={`w-full py-3 rounded-xl font-mono font-bold text-sm transition-all ${
                selectedLegacyPower
                  ? 'btn-ui text-[#00f3ff] cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Confirmar Legado y Zapar Hacia los Años 80 →
            </button>
          </div>
        </div>
      )}

      {/* Notificación efímera de hallazgo o vuelo */}
      {(toastBanner || flightStatusText) && (
        <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-30 gbc-hud-frame px-4 py-2 text-xs font-mono font-bold text-[#fde047] text-center max-w-xl">
          {flightStatusText || toastBanner}
        </div>
      )}

      {/* Cuadro de diálogo narrativo estilo Game Boy Color */}
      {activeDialog && (
        <div className="dialogue-backdrop fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3 sm:p-5">
          <div
            className={`dialogue-frame rounded-none w-full p-4 sm:p-6 space-y-3 relative max-h-[92vh] overflow-y-auto ${
              activeDialog.museumExhibit ? 'max-w-4xl' : 'max-w-xl'
            } ${activeDialog.category.toLowerCase().includes('cueva') || activeDialog.category.toLowerCase().includes('castillo') ? 'dialogue-stone' : activeDialog.category.toLowerCase().includes('glitch') || activeDialog.category.toLowerCase().includes('vector') ? 'dialogue-arcane' : 'dialogue-wood'}`}
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-white/30 pb-2.5">
              <div>
                <p className="dialogue-kicker text-[10px] font-mono tracking-widest uppercase">
                  {activeDialog.category}
                </p>
                <h3 className="dialogue-speaker font-mono text-base sm:text-lg font-bold mt-0.5">
                  {activeDialog.title}
                </h3>
                {activeDialog.subtitle && (
                  <p className="text-[11px] font-mono text-[#7dd3fc] mt-1">
                    {activeDialog.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                aria-label="Cerrar diálogo"
                className="text-white hover:text-amber-300 cursor-pointer p-1 font-mono font-bold"
              >
                [X]
              </button>
            </div>

            <div
              className={
                activeDialog.museumExhibit
                  ? 'grid gap-4 md:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1.15fr)]'
                  : ''
              }
            >
              {activeDialog.museumExhibit && (
                <figure className="space-y-2">
                  <MuseumExhibitIllustration
                    exhibit={activeDialog.museumExhibit}
                    className="block w-full border-2 border-white/20 bg-[#08121f]"
                  />
                  <figcaption className="text-[10px] text-slate-400 font-mono">
                    Ilustración original de PIXELVERSE; no es fotografía histórica ni imagen de archivo.
                  </figcaption>
                </figure>
              )}
              <div className={`dialogue-copy space-y-2 text-xs sm:text-sm font-mono leading-relaxed ${dialogueVisibleChars >= dialogueFullText.length ? 'dialogue-complete' : ''}`} onClick={() => setDialogueVisibleChars(dialogueFullText.length)}>
                {activeDialog.paragraphs.map((par, idx) => {
                  const start = activeDialog.paragraphs.slice(0, idx).reduce((total, previous) => total + previous.length + 2, 0);
                  return <p key={idx}>{par.slice(0, Math.max(0, dialogueVisibleChars - start))}</p>;
                })}
              </div>
            </div>

            {activeDialog.museumExhibit && (
              <p className="text-[10px] text-slate-400 font-mono">
                Fuente histórica:{' '}
                <a
                  href={activeDialog.museumExhibit.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 underline underline-offset-2 hover:text-cyan-100"
                >
                  {activeDialog.museumExhibit.sourceLabel}
                </a>
              </p>
            )}

            {activeDialog.hint && (
              <p className="pt-2 border-t border-white/20 text-[11px] text-amber-200 font-mono">
                {activeDialog.hint}
              </p>
            )}

            <div className="flex flex-wrap justify-end pt-2 items-center gap-2">
              {activeDialog.disabledAction && (
                <button
                  type="button"
                  disabled
                  className="border-2 border-amber-300/50 bg-slate-800 px-4 py-1.5 font-mono font-bold text-xs uppercase tracking-wider text-amber-200/70 cursor-not-allowed opacity-80"
                >
                  {activeDialog.disabledAction}
                </button>
              )}
              {activeDialog.primaryAction && (
                <button
                  type="button"
                  onClick={activeDialog.primaryAction.onSelect}
                className="dialogue-action px-4 py-1.5 font-mono font-bold text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
                >
                  {activeDialog.primaryAction.label}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => {
                  retroAudio.uiClick();
                  advanceDialogueRef.current();
                }}
                className="dialogue-action px-4 py-1.5 font-mono font-bold text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
              >
                {dialogueVisibleChars < dialogueFullText.length ? 'REVELAR TEXTO [ENTER]' : 'CONTINUAR [ENTER]'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consola de Alineación Vectorial QuadraScan XY (Museo Viviente 1979) */}
      {vectorModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Proyector Vectorial QuadraScan XY"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="gbc-retro-box max-w-lg w-full p-5 sm:p-6 space-y-4 font-mono">
            <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-white/25 pb-2.5">
              <div>
                <p className="text-[10px] tracking-widest text-[#a78bfa] uppercase">
                  ACERTIJO VECTORIAL · FRONTERA 1979
                </p>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  Proyector QuadraScan XY
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVectorModalOpen(false)}
                className="text-white hover:text-amber-300 cursor-pointer font-bold px-2 py-1"
              >
                [X]
              </button>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              Calibra los tres haces de electrones para desbloquear el Vitrinario Vectorial de 1979. Observa la geometría de Vectra-79 en Las Cavernas de Memoria si necesitas conocer los tres ángulos exactos.
            </p>

            <div className="grid grid-cols-3 gap-3 py-2">
              {(['Haz Alfa (X)', 'Haz Beta (Y)', 'Haz Impulso'] as const).map(
                (axisName, idx) => {
                  const val = vectorAngles[idx];
                  return (
                    <div
                      key={axisName}
                      className="border-2 border-white/25 bg-[#050918] p-3 text-center space-y-2"
                    >
                      <span className="block text-[10px] text-slate-400">{axisName}</span>
                      <span className="block text-xl font-bold text-[#22d3ee] font-mono-tabular">
                        {val}°
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const steps = [0, 45, 90, 135, 180];
                          const nextVal =
                            steps[(steps.indexOf(val) + 1) % steps.length];
                          retroAudio.puzzleNodeTone(idx + 1);
                          setVectorAngles((prev) => {
                            const copy = [...prev] as [number, number, number];
                            copy[idx] = nextVal;
                            return copy;
                          });
                        }}
                        className="w-full py-1.5 px-2 border border-white/40 bg-cyan-950/60 hover:bg-cyan-900 text-xs text-white cursor-pointer"
                      >
                        Rotar +45°
                      </button>
                    </div>
                  );
                }
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/15">
              <button
                type="button"
                onClick={() => setVectorModalOpen(false)}
                className="px-3.5 py-1.5 border border-white/30 bg-black/50 text-xs text-slate-200 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const [t0, t1, t2] = MUSEUM_VECTOR_CONSOLE.targetAngles;
                  if (
                    vectorAngles[0] === t0 &&
                    vectorAngles[1] === t1 &&
                    vectorAngles[2] === t2
                  ) {
                    retroAudio.secretFound();
                    callbacksRef.current.onSolvePuzzle(MUSEUM_VECTOR_CONSOLE.puzzleId);
                    setVectorModalOpen(false);
                    showToast(
                      '¡Alineación Vectorial 45° · 90° · 180° perfecta! El Vitrinario central del Museo se ha desbloqueado.'
                    );
                  } else {
                    retroAudio.npcBlip(0.68);
                    showToast(
                      'Los haces XY aún no convergen · Revisa los ángulos de Vectra-79 en Las Cavernas de Memoria.'
                    );
                  }
                }}
                className="px-4 py-1.5 border-2 border-white bg-[#0284c7] hover:bg-[#0ea5e9] text-xs font-bold text-white cursor-pointer"
              >
                Verificar Alineación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventario Flotante y Estadísticas [I] */}
      {(inventoryOpen || inventoryClosing) && (
        <RpgInventoryModal
          progressState={progressState}
          allUnlocked={allUnlocked}
          areaInfo={{
            eraBadge: eraBadgeText,
            zoneName: currentLocationName,
            zoneSubtitle: currentLocationSubtitle,
            objectiveText: currentObjectiveText,
          }}
          statsSummary={{
            diamondsCollected: collectedDiamondsCount,
            diamondsTotal: TOTAL_70S_DIAMONDS,
            arcadesRestored: restoredArcadesCount,
            arcadesTotal: 5,
            chestsOpened: progressState.rpg.openedChestIds.length,
            chestsTotal: RPG_CHESTS.length,
            questsCompleted: completedQuestsCount,
            questsTotal: RPG_QUESTS.length,
            secretsFound: progressState.rpg.discoveredSecretIds.length,
          }}
          quickControls={{
            canSaveHere: true,
            onQuickSave: () => {
              const savedAreaLabel = performIslandManualSave();
              retroAudio.saveJingle();
              setInventoryOpen(false);
              showToast(`Partida guardada (${savedAreaLabel}) · Progreso e inventario asegurados.`);
            },
            onOpenQuests: () => {
              setInventoryOpen(false);
              setQuestsOpen(true);
            },
            onOpenCodex: () => {
              setInventoryOpen(false);
              setCodexOpen(true);
            },
            canToggleMinimap: activeAreaId === 'exterior-70s',
            minimapOpen,
            onToggleMinimap: () => {
              setMinimapOpen((prev) => !prev);
              setInventoryOpen(false);
            },
            isGbGreenMode,
            onToggleGbGreenMode,
            isAudioMuted,
            onToggleAudio,
            onOpenLevelSelector,
          }}
          closing={inventoryClosing}
          onClose={closeInventory}
          onUseScanner={handleUseScannerPulse}
          onToggleLantern={handleToggleLanternAction}
          onUseWelder={handleUseWelderAction}
          onEquipCosmetic={(itemId) => {
            callbacksRef.current.onEquipCosmetic(itemId);
          }}
        />
      )}

      {/* Diario de Misiones e Investigación [Q] */}
      {questsOpen && (
        <RpgQuestsModal
          progressState={progressState}
          allUnlocked={allUnlocked}
          onSolveCase={(caseId, rewardItemIds) => {
            callbacksRef.current.onSolveCase(caseId, rewardItemIds);
          }}
          onClose={() => setQuestsOpen(false)}
        />
      )}

      {/* Códice del Arquitecto [C] */}
      {codexOpen && (
        <ArchitectCodexModal
          progressState={progressState}
          allUnlocked={allUnlocked}
          onClose={() => setCodexOpen(false)}
        />
      )}

      {/* Menú RPG de Poderes [K] */}
      {powersMenuOpen && (
        <PowersMenuModal
          progressState={progressState}
          allUnlocked={allUnlocked}
          onClose={() => setPowersMenuOpen(false)}
          onInvokeFlight={() => {
            setPowersMenuOpen(false);
            window.setTimeout(() => executeActivePower('pong-hoverboard'), 0);
          }}
          onToggleLantern={() => {
            handleToggleLanternAction();
          }}
          onUseScanner={() => {
            handleUseScannerPulse();
          }}
          onUseWelder={() => {
            handleUseWelderAction();
          }}
          onUpgradePower={(upgradeId, costDiamonds) => {
            if (!callbacksRef.current.onPurchasePowerUpgrade) {
              retroAudio.npcBlip(0.7);
              showToast('Las mejoras de poderes no están disponibles en este momento.');
              return;
            }
            callbacksRef.current.onPurchasePowerUpgrade(upgradeId, costDiamonds);
            retroAudio.portalVictory();
            showToast('¡Mejora de poder adquirida!');
          }}
        />
      )}
    </div>
  );
}

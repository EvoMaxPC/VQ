/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * COMPONENTE 'PowersMenu':
 * Tablero RPG de habilidades con estética de panel de madera labrada y pergamino clásico.
 * - Tarjetas individuales con bordes de píxeles nítidos de 16-bits
 * - Medidores de energía estilo RPG clásico (bloques segmentados SNES/GBA)
 * - Parrilla de tarjetas con grid responsivo (1 a 4 columnas)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Zap,
  Flame,
  Wrench,
  Radio,
  CheckCircle2,
  Lock,
  Sparkles,
  X,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { PixelverseProgressState } from '../memories/progressionState';

/* ============================================================================
   ILUSTRACIONES PIXEL ART EN CANVAS PARA CADA TARJETA DE PODER
   ============================================================================ */

/** Canvas 1: Vuelo de la Barra de Pong */
function PongFlightCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const stars = Array.from({ length: 24 }, (_, i) => ({
      x: (i * 23) % 200,
      y: (i * 31) % 64,
      speed: 10 + (i % 3) * 8,
    }));

    const render = (now: number) => {
      ctx.fillStyle = '#140a04';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fde047';
      for (const s of stars) {
        s.x = (s.x - s.speed * 0.02) % canvas.width;
        if (s.x < 0) s.x += canvas.width;
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 2, 2);
      }

      const t = now * 0.003;
      const paddleY = 30 + Math.sin(t * 2) * 5;

      // Estela
      ctx.fillStyle = '#b45309';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(80 - i * 8, Math.floor(paddleY + Math.sin(t * 3 + i) * 2), 6 - i, 4);
      }

      // Pala de Pong
      ctx.fillStyle = '#facc15';
      ctx.fillRect(82, Math.floor(paddleY - 10), 10, 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(84, Math.floor(paddleY - 8), 6, 16);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} width={200} height={64} className="w-full h-16 [image-rendering:pixelated]" />;
}

/** Canvas 2: Lámpara de Fósforo Ámbar */
function LanternCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const render = (now: number) => {
      const t = now * 0.0025;
      ctx.fillStyle = '#1c0f05';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const rad = 32 + Math.sin(t * 3) * 4;
      const grad = ctx.createRadialGradient(100, 32, 4, 100, 32, rad);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      grad.addColorStop(0.5, 'rgba(217, 119, 6, 0.5)');
      grad.addColorStop(1, 'rgba(28, 15, 5, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(100, 32, rad, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#78350f';
      ctx.fillRect(95, 18, 10, 26);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(97, 22, 6, 18);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} width={200} height={64} className="w-full h-16 [image-rendering:pixelated]" />;
}

/** Canvas 3: Buscador GBC (Pulso TTL) */
function ScannerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const render = (now: number) => {
      const t = now * 0.002;
      ctx.fillStyle = '#061726';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#0e4a6e';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 16) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }

      const ringR = (t * 35) % 60;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(100, 32, ringR, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(96, 28, 8, 8);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} width={200} height={64} className="w-full h-16 [image-rendering:pixelated]" />;
}

/** Canvas 4: Soldador Lógico TTL */
function WelderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const render = (now: number) => {
      const t = now * 0.003;
      ctx.fillStyle = '#032014';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#047857';
      ctx.fillRect(20, 30, 70, 4);
      ctx.fillRect(110, 30, 70, 4);

      ctx.fillStyle = '#facc15';
      ctx.fillRect(90, 26, 12, 12);

      if (Math.sin(t * 10) > 0.1) {
        ctx.fillStyle = '#a7f3d0';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(90 + (Math.random() - 0.5) * 14, 30 + (Math.random() - 0.5) * 14, 2, 2);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} width={200} height={64} className="w-full h-16 [image-rendering:pixelated]" />;
}

/* ============================================================================
   MEDIDOR DE ENERGÍA ESTILO RPG CLÁSICO (BLOQUES SEGMENTADOS SNES/GBA)
   ============================================================================ */

function ClassicRpgEnergyBar({
  current,
  max,
  label,
  fillHex,
  borderHex,
}: {
  current: number;
  max: number;
  label: string;
  fillHex: string;
  borderHex: string;
}) {
  const pct = Math.min(100, Math.max(0, (current / max) * 100));
  const totalBlocks = 10;
  const filledBlocks = Math.round((pct / 100) * totalBlocks);

  return (
    <div className="space-y-1 bg-[#120a05] border border-[#5c3a21] p-2 rounded shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] font-mono-tabular">
      <div className="flex items-center justify-between text-[10px] font-bold tracking-wider">
        <span className="text-[#ebd5b3] flex items-center gap-1">
          <span className="text-amber-400">❖</span> {label}:
        </span>
        <span style={{ color: fillHex }}>
          {current} / {max}
        </span>
      </div>

      {/* Bloques segmentados estilo SNES/GBA */}
      <div className="flex gap-1 h-3 p-0.5 bg-black border border-[#4a2e1b] rounded-sm">
        {Array.from({ length: totalBlocks }).map((_, idx) => {
          const isFilled = idx < filledBlocks;
          return (
            <div
              key={idx}
              className="flex-1 h-full rounded-xs transition-colors duration-200"
              style={{
                backgroundColor: isFilled ? fillHex : '#1a0e08',
                border: isFilled ? `1px solid ${borderHex}` : '1px solid #2d1e12',
                boxShadow: isFilled ? `0 0 4px ${fillHex}aa` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   ESTRUCTURA DE DATOS Y COMPONENTE PRINCIPAL 'PowersMenu'
   ============================================================================ */

export interface PowerSpec {
  id: 'pong-hoverboard' | 'phosphor-lantern' | 'secret-scanner' | 'circuit-welder';
  title: string;
  subtitle: string;
  categoryLabel: string;
  accentHex: string;
  borderHex: string;
  cardBg: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  canvasIllustration: React.FC;
  description: string;
  utility: string;
  requirements: string;
  isUnlocked: boolean;
  currentEnergy: number;
  maxEnergy: number;
  costLabel: string;
  actionButtonText: string;
  upgrades: {
    id: string;
    name: string;
    description: string;
    costDiamonds: number;
    purchased: boolean;
  }[];
}

export interface PowersMenuProps {
  progressState: PixelverseProgressState;
  allUnlocked: boolean;
  onClose: () => void;
  onInvokeFlight: () => void;
  onToggleLantern: () => void;
  onUseScanner: () => void;
  onUseWelder: () => void;
  onUpgradePower: (upgradeId: string, costDiamonds: number) => void;
}

export function PowersMenu({
  progressState,
  allUnlocked,
  onClose,
  onInvokeFlight,
  onToggleLantern,
  onUseScanner,
  onUseWelder,
  onUpgradePower,
}: PowersMenuProps) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const powersData = progressState.rpg.powersState ?? {
    flightFuel: 100,
    maxFlightFuel: 100,
    lanternBattery: 100,
    maxLanternBattery: 100,
    scannerEnergy: 100,
    maxScannerEnergy: 100,
    welderEnergy: 100,
    maxWelderEnergy: 100,
    upgradesPurchased: [],
  };

  const inventory = progressState.rpg.inventoryItems;
  const abilities = progressState.island70s.abilitiesUnlocked;
  const collectedDiamondsCount = progressState.island70s.collectedDiamondIds.length;

  const pongUnlocked =
    allUnlocked ||
    abilities.includes('pong-hoverboard') ||
    inventory.includes('item-barra-pong') ||
    Boolean(progressState.games['pong']?.memoryUnlocked);

  const lanternUnlocked =
    allUnlocked ||
    abilities.includes('phosphor-lantern') ||
    inventory.includes('item-lampara-fosforo');

  const scannerUnlocked =
    allUnlocked ||
    abilities.includes('secret-scanner') ||
    inventory.includes('item-escaner-frecuencias');

  const welderUnlocked =
    allUnlocked ||
    abilities.includes('circuit-welder') ||
    inventory.includes('item-soldador-logico');

  const powerList: PowerSpec[] = [
    {
      id: 'pong-hoverboard',
      title: 'Barra de Pong',
      subtitle: 'Vuelo Astral (1972)',
      categoryLabel: 'HABILIDAD DE VUELO',
      accentHex: '#facc15',
      borderHex: '#d97706',
      cardBg: 'bg-[#241508]',
      icon: Compass,
      canvasIllustration: PongFlightCanvas,
      description:
        'Pala de Pong (1972) canalizada como aeropatín para sobrevolar libremente la isla.',
      utility: 'Cruza abismos, agua y elevaciones inaccesibles a pie.',
      requirements: 'Victoria en Pong (1972) por 3 goles.',
      isUnlocked: pongUnlocked,
      currentEnergy: Math.round(powersData.flightFuel),
      maxEnergy: powersData.maxFlightFuel,
      costLabel: (powersData.upgradesPurchased ?? []).includes('upg-flight-efficiency-1')
        ? '5 Combustible / seg en vuelo'
        : '8 Combustible / seg en vuelo',
      actionButtonText: 'INVOCAR VUELO [F]',
      upgrades: [
        {
          id: 'upg-flight-tank-1',
          name: 'Tanque Estelar (+50 Capacidad)',
          description: 'Aumenta el combustible total a 150 unidades.',
          costDiamonds: 2,
          purchased: (powersData.upgradesPurchased ?? []).includes('upg-flight-tank-1'),
        },
        {
          id: 'upg-flight-efficiency-1',
          name: 'Propulsor Eficiente (-35% Consumo)',
          description: 'Reduce el consumo a 5 unidades/seg.',
          costDiamonds: 3,
          purchased: (powersData.upgradesPurchased ?? []).includes('upg-flight-efficiency-1'),
        },
      ],
    },
    {
      id: 'phosphor-lantern',
      title: 'Lámpara de Fósforo',
      subtitle: 'Resonador Fotónico',
      categoryLabel: 'HERRAMIENTA FOTÓNICA',
      accentHex: '#f59e0b',
      borderHex: '#b45309',
      cardBg: 'bg-[#211205]',
      icon: Flame,
      canvasIllustration: LanternCanvas,
      description:
        'Farol de fósforo ámbar para iluminar cavernas y abrir cofres en la penumbra.',
      utility: 'Disipa la oscuridad e ilumina grutas subterráneas.',
      requirements: 'Obtenida en el Archivo de la Isla del Origen.',
      isUnlocked: lanternUnlocked,
      currentEnergy: Math.round(powersData.lanternBattery),
      maxEnergy: powersData.maxLanternBattery,
      costLabel: '1 Batería / 5 seg activa',
      actionButtonText: progressState.rpg.lanternActive ? 'APAGAR LÁMPARA [L]' : 'ENCENDER LÁMPARA [L]',
      upgrades: [
        {
          id: 'upg-lantern-battery-1',
          name: 'Acumulador de Ámbar (+50 Batería)',
          description: 'Eleva la batería total a 150 unidades.',
          costDiamonds: 1,
          purchased: (powersData.upgradesPurchased ?? []).includes('upg-lantern-battery-1'),
        },
        {
          id: 'upg-lantern-radius-1',
          name: 'Foco de Difusión (+40% Radio)',
          description: 'Amplía el rango de visión iluminado.',
          costDiamonds: 2,
          purchased: (powersData.upgradesPurchased ?? []).includes('upg-lantern-radius-1'),
        },
      ],
    },
    {
      id: 'secret-scanner',
      title: 'Buscador GBC',
      subtitle: 'Pulso Armónico TTL',
      categoryLabel: 'RADAR DE ARTEFACTOS',
      accentHex: '#38bdf8',
      borderHex: '#0284c7',
      cardBg: 'bg-[#071624]',
      icon: Radio,
      canvasIllustration: ScannerCanvas,
      description:
        'Escáner que emite una onda para revelar paredes falsas, rocas e inscripciones.',
      utility:
        'Marca la ubicación exacta de secretos cercanos en 220px.',
      requirements: 'Completar la misión del Templo Pionero.',
      isUnlocked: scannerUnlocked,
      currentEnergy: Math.round(powersData.scannerEnergy),
      maxEnergy: powersData.maxScannerEnergy,
      costLabel: '20 Energía por Pulso emitido',
      actionButtonText: 'EMITIR PULSO TTL [R]',
      upgrades: [
        {
          id: 'upg-scanner-range-1',
          name: 'Resonador Largo Alcance (+60%)',
          description: 'Detección en toda la pantalla.',
          costDiamonds: 2,
          purchased: (powersData.upgradesPurchased ?? []).includes('upg-scanner-range-1'),
        },
        {
          id: 'upg-scanner-recharge-1',
          name: 'Amplificador de Frecuencia',
          description: 'Recarga 5 de energía por secreto hallado.',
          costDiamonds: 2,
          purchased: (powersData.upgradesPurchased ?? []).includes('upg-scanner-recharge-1'),
        },
      ],
    },
    {
      id: 'circuit-welder',
      title: 'Soldador Lógico',
      subtitle: 'Circuito TTL de Cobre',
      categoryLabel: 'HERRAMIENTA MAESTRA',
      accentHex: '#34d399',
      borderHex: '#047857',
      cardBg: 'bg-[#031c14]',
      icon: Wrench,
      canvasIllustration: WelderCanvas,
      description:
        'Soldador de precisión para unir relés rotos y activar puentes averiados.',
      utility: 'Repara mecanismos de circuitos para abrir atajos.',
      requirements: 'Entregado por el Maestro Kertz en Taller TTL.',
      isUnlocked: welderUnlocked,
      currentEnergy: Math.round(powersData.welderEnergy),
      maxEnergy: powersData.maxWelderEnergy,
      costLabel: '15 Energía por Reparación',
      actionButtonText: 'USAR SOLDADOR LÓGICO',
      upgrades: [
        {
          id: 'upg-welder-efficiency-1',
          name: 'Punta de Plata Quántica',
          description: 'Reduce el consumo a solo 5 por uso.',
          costDiamonds: 2,
          purchased: (powersData.upgradesPurchased ?? []).includes('upg-welder-efficiency-1'),
        },
      ],
    },
  ];

  const handleCardAction = (p: PowerSpec) => {
    retroAudio.uiClick();
    if (p.id === 'pong-hoverboard') {
      onInvokeFlight();
      onClose();
    } else if (p.id === 'phosphor-lantern') {
      onToggleLantern();
    } else if (p.id === 'secret-scanner') {
      onUseScanner();
    } else if (p.id === 'circuit-welder') {
      onUseWelder();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="powers-menu-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={() => onClose()}
    >
      {/* PANEL PRINCIPAL TIPO PERGAMINO Y MADERA LABRADA */}
      <div
        className="w-full max-w-5xl bg-[#1c1108] border-4 border-[#5c3a21] rounded-xl p-4 sm:p-6 space-y-5 text-[#f5e6c8] shadow-[0_0_0_2px_#000,0_0_40px_rgba(0,0,0,0.9)] relative my-auto max-h-[92vh] overflow-y-auto font-mono-tabular"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundImage: 'radial-gradient(circle, #2e1c12 0%, #170d07 100%)',
        }}
      >
        {/* Tachuelas / Remaches de Latón en las cuatro esquinas */}
        <span className="absolute top-2 left-2 text-amber-500 font-black text-xs select-none">❖</span>
        <span className="absolute top-2 right-2 text-amber-500 font-black text-xs select-none">❖</span>
        <span className="absolute bottom-2 left-2 text-amber-500 font-black text-xs select-none">❖</span>
        <span className="absolute bottom-2 right-2 text-amber-500 font-black text-xs select-none">❖</span>

        {/* CABECERA DE MADERA Y PLACA DE ORO */}
        <div className="flex items-center justify-between border-b-2 border-[#5c3a21] pb-3 bg-[#120a04] px-4 py-3 rounded-t-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#3b2313] border-2 border-[#d97706] flex items-center justify-center shadow-[inset_0_1px_3px_rgba(255,255,255,0.2)]">
              <Zap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2
                id="powers-menu-title"
                className="text-base sm:text-xl font-black font-display text-amber-200 tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
              >
                ⚔ Tablero RPG de Habilidades y Poderes ⚔
              </h2>
              <p className="text-[11px] text-[#c2a682]">
                ISLA DEL ORIGEN · {collectedDiamondsCount} Diamantes de Memoria · Accesos [K] / [F] / [L] / [R]
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            aria-label="Cerrar tablero de habilidades"
            className="w-9 h-9 rounded border-2 border-[#78350f] bg-[#2b1810] hover:bg-[#3b2313] text-[#ebd5b3] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PARRILLA RESPONSIVA DE TARJETAS (1 Col en móvil, 2 en tablet, 4 en escritorio amplio) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {powerList.map((p) => {
            const IconComp = p.icon;
            const CanvasIll = p.canvasIllustration;
            const isExpanded = expandedCardId === p.id;

            return (
              <div
                key={p.id}
                className={`rounded-lg border-2 ${p.cardBg} p-3.5 flex flex-col justify-between space-y-3 relative overflow-hidden transition-all shadow-lg ${
                  p.isUnlocked ? 'hover:brightness-105 hover:translate-y-[-2px]' : 'opacity-70 grayscale-[25%]'
                }`}
                style={{
                  borderColor: p.isUnlocked ? p.borderHex : '#4a2e1b',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.08)',
                }}
              >
                {/* Ilustración de la tarjeta */}
                <div className="relative border border-[#4a2e1b] rounded overflow-hidden bg-black/70">
                  <CanvasIll />
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-[#1f130b] text-[#ebd5b3] border border-[#5c3a21]">
                    {p.categoryLabel}
                  </div>
                  <div
                    className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border flex items-center gap-1"
                    style={{
                      backgroundColor: p.isUnlocked ? p.accentHex + '20' : '#1e120a',
                      color: p.isUnlocked ? p.accentHex : '#94a3b8',
                      borderColor: p.isUnlocked ? p.borderHex : '#3d2516',
                    }}
                  >
                    {p.isUnlocked ? (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>ACTIVO</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-2.5 h-2.5" />
                        <span>SELLADO</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Encabezado con Icono Grande y Título */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded border-2 flex items-center justify-center shrink-0 shadow-md"
                    style={{
                      borderColor: p.isUnlocked ? p.borderHex : '#4a2e1b',
                      backgroundColor: p.isUnlocked ? p.accentHex + '18' : '#120a05',
                    }}
                  >
                    {p.isUnlocked ? (
                      <IconComp className="w-5 h-5" style={{ color: p.accentHex }} />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#f5e6c8] font-display truncate leading-tight">
                      {p.title}
                    </h3>
                    <p className="text-[10px] text-[#c2a682] truncate">
                      {p.subtitle}
                    </p>
                  </div>
                </div>

                {/* Breve descripción e utilidad */}
                <div className="space-y-1 text-[11px] leading-snug">
                  <p className="text-[#ebd5b3] line-clamp-2">
                    {p.description}
                  </p>
                  <p className="text-[10px] text-amber-300 font-bold">
                    ★ {p.utility}
                  </p>
                </div>

                {/* Requisito de desbloqueo si está sellado */}
                {!p.isUnlocked && (
                  <div className="p-2 rounded bg-[#2a130c] border border-rose-800/60 flex items-start gap-1.5 text-[10px] text-rose-200">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-300 block uppercase">Requisito:</span>
                      <span>{p.requirements}</span>
                    </div>
                  </div>
                )}

                {/* Medidor de Energía Estilo RPG Clásico */}
                {p.isUnlocked && (
                  <ClassicRpgEnergyBar
                    current={p.currentEnergy}
                    max={p.maxEnergy}
                    label="RECURSO"
                    fillHex={p.accentHex}
                    borderHex={p.borderHex}
                  />
                )}

                {/* Desplegable de Mejoras */}
                {p.isUnlocked && p.upgrades.length > 0 && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setExpandedCardId(isExpanded ? null : p.id)}
                      className="w-full py-1 px-2 rounded bg-[#120a05] hover:bg-[#1a0f08] border border-[#4a2e1b] text-[9px] text-[#ebd5b3] flex items-center justify-between cursor-pointer"
                    >
                      <span>
                        Mejoras ({p.upgrades.filter((u) => u.purchased).length}/{p.upgrades.length})
                      </span>
                      <ChevronRight
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="space-y-1.5 pt-1">
                        {p.upgrades.map((upg) => (
                          <div
                            key={upg.id}
                            className="p-1.5 rounded bg-black/60 border border-[#4a2e1b] flex items-center justify-between gap-1.5 text-[9px]"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-amber-200 block truncate">
                                {upg.name}
                              </span>
                              <span className="text-[#c2a682] block truncate">
                                {upg.description}
                              </span>
                            </div>
                            {upg.purchased ? (
                              <span className="font-bold text-emerald-400 px-1 py-0.5 bg-emerald-950/80 border border-emerald-600/40 rounded shrink-0">
                                COMPRADO
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={collectedDiamondsCount < upg.costDiamonds}
                                onClick={() => {
                                  retroAudio.uiClick();
                                  onUpgradePower(upg.id, upg.costDiamonds);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5 cursor-pointer shrink-0 ${
                                  collectedDiamondsCount >= upg.costDiamonds
                                    ? 'bg-amber-400 hover:bg-amber-300 text-black'
                                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                }`}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-amber-900" />
                                <span>{upg.costDiamonds} Diam.</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Botón de Acción Tallado en Madera */}
                <button
                  type="button"
                  disabled={!p.isUnlocked}
                  onClick={() => handleCardAction(p)}
                  className={`w-full py-2 px-2.5 rounded font-bold text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all border-2 shadow-md ${
                    p.isUnlocked
                      ? 'bg-gradient-to-b from-[#d97706] to-[#b45309] hover:from-[#f59e0b] hover:to-[#d97706] text-black border-[#fef08a] active:translate-y-0.5'
                      : 'bg-[#1e120a] text-slate-500 border-[#3d2516] cursor-not-allowed'
                  }`}
                >
                  {p.isUnlocked ? (
                    <>
                      <span>{p.actionButtonText}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-black" />
                    </>
                  ) : (
                    <span>HABILIDAD SELLADA</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Pie de Panel Pergamino */}
        <div className="pt-2 border-t-2 border-[#5c3a21] flex items-center justify-between text-[10px] text-[#c2a682]">
          <span>Recarga energía en Puntos de Guardado, altares o cofres de la isla.</span>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded border border-[#78350f] bg-[#2b1810] hover:bg-[#3b2313] text-[#ebd5b3] hover:text-white cursor-pointer"
          >
            Cerrar Tablero [ESC]
          </button>
        </div>
      </div>
    </div>
  );
}

// Exportación alias 'PowersMenuModal' para retrocompatibilidad
export const PowersMenuModal = PowersMenu;

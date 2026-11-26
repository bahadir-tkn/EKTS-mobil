import type { CircuitDocument } from '../types/circuit';

export const PRESET_CIRCUITS: CircuitDocument[] = [
  {
    id: 'preset-latching',
    name: 'Sürekli Çalıştırma (Mühürleme)',
    description:
      'Start butonuna basıldığında K1 bobini enerjilenir, paralel K1 açık kontağı ile kendini mühürler ve yeşil sinyal lambası yanar. Stop butonu devreyi keser.',
    components: [
      { id: 'p1-l1', type: 'power_l1', x: 180, y: 60, rotation: 0, label: 'L1' },
      { id: 'p1-f1', type: 'fuse', x: 180, y: 140, rotation: 0, label: 'F1' },
      { id: 'p1-s0', type: 'btn_stop', x: 180, y: 240, rotation: 0, label: 'S0' },
      { id: 'p1-s1', type: 'btn_start', x: 180, y: 360, rotation: 0, label: 'S1' },
      { id: 'p1-k1-latch', type: 'contact_no', x: 320, y: 360, rotation: 0, label: 'K1' },
      { id: 'p1-k1-coil', type: 'coil_contactor', x: 180, y: 480, rotation: 0, label: 'K1' },
      { id: 'p1-k1-lamp', type: 'contact_no', x: 460, y: 360, rotation: 0, label: 'K1' },
      {
        id: 'p1-h1',
        type: 'lamp',
        x: 460,
        y: 480,
        rotation: 0,
        label: 'H1',
        lampColor: 'green',
      },
      { id: 'p1-n', type: 'power_n', x: 320, y: 580, rotation: 0, label: 'N' },
    ],
    wires: [
      {
        id: 'w1-1',
        from: { componentId: 'p1-l1', pinId: 'out' },
        to: { componentId: 'p1-f1', pinId: '1' },
      },
      {
        id: 'w1-2',
        from: { componentId: 'p1-f1', pinId: '2' },
        to: { componentId: 'p1-s0', pinId: '11' },
      },
      {
        id: 'w1-3',
        from: { componentId: 'p1-s0', pinId: '12' },
        to: { componentId: 'p1-s1', pinId: '13' },
      },
      {
        id: 'w1-4',
        from: { componentId: 'p1-s0', pinId: '12' },
        to: { componentId: 'p1-k1-latch', pinId: '13' },
        waypoints: [
          { x: 180, y: 300 },
          { x: 320, y: 300 },
        ],
      },
      {
        id: 'w1-5',
        from: { componentId: 'p1-s1', pinId: '14' },
        to: { componentId: 'p1-k1-coil', pinId: 'A1' },
      },
      {
        id: 'w1-6',
        from: { componentId: 'p1-k1-latch', pinId: '14' },
        to: { componentId: 'p1-k1-coil', pinId: 'A1' },
        waypoints: [
          { x: 320, y: 420 },
          { x: 180, y: 420 },
        ],
      },
      {
        id: 'w1-7',
        from: { componentId: 'p1-f1', pinId: '2' },
        to: { componentId: 'p1-k1-lamp', pinId: '13' },
        waypoints: [
          { x: 180, y: 190 },
          { x: 460, y: 190 },
        ],
      },
      {
        id: 'w1-8',
        from: { componentId: 'p1-k1-lamp', pinId: '14' },
        to: { componentId: 'p1-h1', pinId: 'X1' },
      },
      {
        id: 'w1-9',
        from: { componentId: 'p1-k1-coil', pinId: 'A2' },
        to: { componentId: 'p1-n', pinId: 'out' },
        waypoints: [
          { x: 180, y: 540 },
          { x: 320, y: 540 },
        ],
      },
      {
        id: 'w1-10',
        from: { componentId: 'p1-h1', pinId: 'X2' },
        to: { componentId: 'p1-n', pinId: 'out' },
        waypoints: [
          { x: 460, y: 540 },
          { x: 320, y: 540 },
        ],
      },
    ],
  },

  {
    id: 'preset-forward-reverse',
    name: 'İleri - Geri (Devir Yönü Değiştirme)',
    description:
      'Elektriksel kilitlemeli 3 fazlı asenkron motor yön kontrolü. K1 (İleri) ve K2 (Geri) kapalı kontakları çapraz bağlıdır; faz sırası değişerek yön terslenir.',
    components: [
      // 3-Phase Power Section (Left)
      { id: 'p2-l1', type: 'power_l1', x: 100, y: 60, rotation: 0, label: 'L1' },
      { id: 'p2-l2', type: 'power_l2', x: 140, y: 60, rotation: 0, label: 'L2' },
      { id: 'p2-l3', type: 'power_l3', x: 180, y: 60, rotation: 0, label: 'L3' },
      { id: 'p2-k1-p', type: 'contact_power_3p', x: 140, y: 240, rotation: 0, label: 'K1' },
      { id: 'p2-k2-p', type: 'contact_power_3p', x: 320, y: 240, rotation: 0, label: 'K2' },
      { id: 'p2-m1', type: 'motor_3ph', x: 220, y: 440, rotation: 0, label: 'M1' },

      // Control Section (Right)
      { id: 'p2-ctrl-l1', type: 'power_l1', x: 540, y: 60, rotation: 0, label: 'L1' },
      { id: 'p2-f1', type: 'fuse', x: 540, y: 140, rotation: 0, label: 'F1' },
      { id: 'p2-s0', type: 'btn_stop', x: 540, y: 240, rotation: 0, label: 'S0' },

      // Forward Branch (K1)
      { id: 'p2-s1', type: 'btn_start', x: 540, y: 360, rotation: 0, label: 'S1' },
      { id: 'p2-k1-no', type: 'contact_no', x: 640, y: 360, rotation: 0, label: 'K1' },
      { id: 'p2-k2-nc', type: 'contact_nc', x: 540, y: 460, rotation: 0, label: 'K2' },
      { id: 'p2-k1-coil', type: 'coil_contactor', x: 540, y: 560, rotation: 0, label: 'K1' },

      // Reverse Branch (K2)
      { id: 'p2-s2', type: 'btn_start', x: 760, y: 360, rotation: 0, label: 'S2' },
      { id: 'p2-k2-no', type: 'contact_no', x: 860, y: 360, rotation: 0, label: 'K2' },
      { id: 'p2-k1-nc', type: 'contact_nc', x: 760, y: 460, rotation: 0, label: 'K1' },
      { id: 'p2-k2-coil', type: 'coil_contactor', x: 760, y: 560, rotation: 0, label: 'K2' },

      // Neutral
      { id: 'p2-n', type: 'power_n', x: 660, y: 660, rotation: 0, label: 'N' },
    ],
    wires: [
      // Power feed L1/L2/L3 to K1 3P
      { id: 'w2-p1', from: { componentId: 'p2-l1', pinId: 'out' }, to: { componentId: 'p2-k1-p', pinId: '1' } },
      { id: 'w2-p2', from: { componentId: 'p2-l2', pinId: 'out' }, to: { componentId: 'p2-k1-p', pinId: '3' } },
      { id: 'w2-p3', from: { componentId: 'p2-l3', pinId: 'out' }, to: { componentId: 'p2-k1-p', pinId: '5' } },

      // Power busbars L1/L2/L3 to K2 3P (cleanly staggered horizontal rails)
      {
        id: 'w2-p4',
        from: { componentId: 'p2-l1', pinId: 'out' },
        to: { componentId: 'p2-k2-p', pinId: '1' },
        waypoints: [
          { x: 100, y: 110 },
          { x: 280, y: 110 },
        ],
      },
      {
        id: 'w2-p5',
        from: { componentId: 'p2-l2', pinId: 'out' },
        to: { componentId: 'p2-k2-p', pinId: '3' },
        waypoints: [
          { x: 140, y: 135 },
          { x: 320, y: 135 },
        ],
      },
      {
        id: 'w2-p6',
        from: { componentId: 'p2-l3', pinId: 'out' },
        to: { componentId: 'p2-k2-p', pinId: '5' },
        waypoints: [
          { x: 180, y: 160 },
          { x: 360, y: 160 },
        ],
      },

      // K1 outputs to Motor U, V, W (Forward: L1->U, L2->V, L3->W)
      {
        id: 'w2-m1',
        from: { componentId: 'p2-k1-p', pinId: '2' },
        to: { componentId: 'p2-m1', pinId: 'U' },
        waypoints: [
          { x: 100, y: 360 },
          { x: 180, y: 360 },
        ],
      },
      {
        id: 'w2-m2',
        from: { componentId: 'p2-k1-p', pinId: '4' },
        to: { componentId: 'p2-m1', pinId: 'V' },
        waypoints: [
          { x: 140, y: 340 },
          { x: 220, y: 340 },
        ],
      },
      {
        id: 'w2-m3',
        from: { componentId: 'p2-k1-p', pinId: '6' },
        to: { componentId: 'p2-m1', pinId: 'W' },
        waypoints: [
          { x: 180, y: 320 },
          { x: 260, y: 320 },
        ],
      },

      // K2 outputs to Motor W, V, U (Reverse: L1->W, L2->V, L3->U)
      {
        id: 'w2-m4',
        from: { componentId: 'p2-k2-p', pinId: '2' },
        to: { componentId: 'p2-m1', pinId: 'W' },
        waypoints: [
          { x: 280, y: 320 },
          { x: 260, y: 320 },
        ],
      },
      {
        id: 'w2-m5',
        from: { componentId: 'p2-k2-p', pinId: '4' },
        to: { componentId: 'p2-m1', pinId: 'V' },
        waypoints: [
          { x: 320, y: 340 },
          { x: 220, y: 340 },
        ],
      },
      {
        id: 'w2-m6',
        from: { componentId: 'p2-k2-p', pinId: '6' },
        to: { componentId: 'p2-m1', pinId: 'U' },
        waypoints: [
          { x: 360, y: 375 },
          { x: 180, y: 375 },
        ],
      },

      // Control circuit top feed
      { id: 'w2-c1', from: { componentId: 'p2-ctrl-l1', pinId: 'out' }, to: { componentId: 'p2-f1', pinId: '1' } },
      { id: 'w2-c2', from: { componentId: 'p2-f1', pinId: '2' }, to: { componentId: 'p2-s0', pinId: '11' } },

      // Stop to Forward & Reverse branches
      { id: 'w2-c3', from: { componentId: 'p2-s0', pinId: '12' }, to: { componentId: 'p2-s1', pinId: '13' } },
      {
        id: 'w2-c4',
        from: { componentId: 'p2-s0', pinId: '12' },
        to: { componentId: 'p2-k1-no', pinId: '13' },
        waypoints: [
          { x: 540, y: 300 },
          { x: 640, y: 300 },
        ],
      },
      {
        id: 'w2-c5',
        from: { componentId: 'p2-s0', pinId: '12' },
        to: { componentId: 'p2-s2', pinId: '13' },
        waypoints: [
          { x: 540, y: 300 },
          { x: 760, y: 300 },
        ],
      },
      {
        id: 'w2-c6',
        from: { componentId: 'p2-s0', pinId: '12' },
        to: { componentId: 'p2-k2-no', pinId: '13' },
        waypoints: [
          { x: 540, y: 300 },
          { x: 860, y: 300 },
        ],
      },

      // Forward branch latch -> K2 NC -> K1 coil
      { id: 'w2-c7', from: { componentId: 'p2-s1', pinId: '14' }, to: { componentId: 'p2-k2-nc', pinId: '11' } },
      {
        id: 'w2-c8',
        from: { componentId: 'p2-k1-no', pinId: '14' },
        to: { componentId: 'p2-k2-nc', pinId: '11' },
        waypoints: [
          { x: 640, y: 410 },
          { x: 540, y: 410 },
        ],
      },
      { id: 'w2-c9', from: { componentId: 'p2-k2-nc', pinId: '12' }, to: { componentId: 'p2-k1-coil', pinId: 'A1' } },

      // Reverse branch latch -> K1 NC -> K2 coil
      { id: 'w2-c10', from: { componentId: 'p2-s2', pinId: '14' }, to: { componentId: 'p2-k1-nc', pinId: '11' } },
      {
        id: 'w2-c11',
        from: { componentId: 'p2-k2-no', pinId: '14' },
        to: { componentId: 'p2-k1-nc', pinId: '11' },
        waypoints: [
          { x: 860, y: 410 },
          { x: 760, y: 410 },
        ],
      },
      { id: 'w2-c12', from: { componentId: 'p2-k1-nc', pinId: '12' }, to: { componentId: 'p2-k2-coil', pinId: 'A1' } },

      // Neutral return
      {
        id: 'w2-n1',
        from: { componentId: 'p2-k1-coil', pinId: 'A2' },
        to: { componentId: 'p2-n', pinId: 'out' },
        waypoints: [
          { x: 540, y: 620 },
          { x: 660, y: 620 },
        ],
      },
      {
        id: 'w2-n2',
        from: { componentId: 'p2-k2-coil', pinId: 'A2' },
        to: { componentId: 'p2-n', pinId: 'out' },
        waypoints: [
          { x: 760, y: 620 },
          { x: 660, y: 620 },
        ],
      },
    ],
  },

  {
    id: 'preset-timer-delay',
    name: 'Zaman Röleli Gecikmeli Çalıştırma',
    description:
      'Start butonuna basıldığında K1 mühürlenir ve T1 düz zaman rölesi 3 saniye geri sayar. Süre sonunda T1 gecikmeli kontağı kapanır, motor ve yeşil lamba devreye girer.',
    components: [
      // 3-Phase Power Section (Left)
      { id: 'p3-l1', type: 'power_l1', x: 100, y: 60, rotation: 0, label: 'L1' },
      { id: 'p3-l2', type: 'power_l2', x: 140, y: 60, rotation: 0, label: 'L2' },
      { id: 'p3-l3', type: 'power_l3', x: 180, y: 60, rotation: 0, label: 'L3' },
      { id: 'p3-k2-p', type: 'contact_power_3p', x: 140, y: 240, rotation: 0, label: 'K2' },
      { id: 'p3-m1', type: 'motor_3ph', x: 140, y: 420, rotation: 0, label: 'M1' },

      // Control Section (Right)
      { id: 'p3-ctrl-l1', type: 'power_l1', x: 380, y: 60, rotation: 0, label: 'L1' },
      { id: 'p3-f1', type: 'fuse', x: 380, y: 140, rotation: 0, label: 'F1' },
      { id: 'p3-s0', type: 'btn_stop', x: 380, y: 240, rotation: 0, label: 'S0' },
      { id: 'p3-s1', type: 'btn_start', x: 380, y: 360, rotation: 0, label: 'S1' },
      { id: 'p3-k1-no', type: 'contact_no', x: 480, y: 360, rotation: 0, label: 'K1' },
      { id: 'p3-k1-coil', type: 'coil_contactor', x: 380, y: 480, rotation: 0, label: 'K1' },
      {
        id: 'p3-t1-coil',
        type: 'coil_timer_on',
        x: 520,
        y: 480,
        rotation: 0,
        label: 'T1',
        delaySeconds: 3,
      },
      { id: 'p3-t1-no', type: 'contact_timer_no', x: 660, y: 360, rotation: 0, label: 'T1' },
      { id: 'p3-k2-coil', type: 'coil_contactor', x: 660, y: 480, rotation: 0, label: 'K2' },
      {
        id: 'p3-h1',
        type: 'lamp',
        x: 780,
        y: 480,
        rotation: 0,
        label: 'H1',
        lampColor: 'green',
      },
      { id: 'p3-n', type: 'power_n', x: 580, y: 580, rotation: 0, label: 'N' },
    ],
    wires: [
      // Power wiring
      { id: 'w3-p1', from: { componentId: 'p3-l1', pinId: 'out' }, to: { componentId: 'p3-k2-p', pinId: '1' } },
      { id: 'w3-p2', from: { componentId: 'p3-l2', pinId: 'out' }, to: { componentId: 'p3-k2-p', pinId: '3' } },
      { id: 'w3-p3', from: { componentId: 'p3-l3', pinId: 'out' }, to: { componentId: 'p3-k2-p', pinId: '5' } },
      { id: 'w3-p4', from: { componentId: 'p3-k2-p', pinId: '2' }, to: { componentId: 'p3-m1', pinId: 'U' } },
      { id: 'w3-p5', from: { componentId: 'p3-k2-p', pinId: '4' }, to: { componentId: 'p3-m1', pinId: 'V' } },
      { id: 'w3-p6', from: { componentId: 'p3-k2-p', pinId: '6' }, to: { componentId: 'p3-m1', pinId: 'W' } },

      // Control feed
      { id: 'w3-c1', from: { componentId: 'p3-ctrl-l1', pinId: 'out' }, to: { componentId: 'p3-f1', pinId: '1' } },
      { id: 'w3-c2', from: { componentId: 'p3-f1', pinId: '2' }, to: { componentId: 'p3-s0', pinId: '11' } },

      // After Stop -> S1, K1 latch, and T1 delayed NO
      { id: 'w3-c3', from: { componentId: 'p3-s0', pinId: '12' }, to: { componentId: 'p3-s1', pinId: '13' } },
      {
        id: 'w3-c4',
        from: { componentId: 'p3-s0', pinId: '12' },
        to: { componentId: 'p3-k1-no', pinId: '13' },
        waypoints: [
          { x: 380, y: 300 },
          { x: 480, y: 300 },
        ],
      },
      {
        id: 'w3-c5',
        from: { componentId: 'p3-s0', pinId: '12' },
        to: { componentId: 'p3-t1-no', pinId: '17' },
        waypoints: [
          { x: 380, y: 300 },
          { x: 660, y: 300 },
        ],
      },

      // S1 & K1 latch -> K1 coil and T1 timer coil in parallel
      { id: 'w3-c6', from: { componentId: 'p3-s1', pinId: '14' }, to: { componentId: 'p3-k1-coil', pinId: 'A1' } },
      {
        id: 'w3-c7',
        from: { componentId: 'p3-k1-no', pinId: '14' },
        to: { componentId: 'p3-k1-coil', pinId: 'A1' },
        waypoints: [
          { x: 480, y: 420 },
          { x: 380, y: 420 },
        ],
      },
      {
        id: 'w3-c8',
        from: { componentId: 'p3-k1-no', pinId: '14' },
        to: { componentId: 'p3-t1-coil', pinId: 'A1' },
        waypoints: [
          { x: 480, y: 420 },
          { x: 520, y: 420 },
        ],
      },

      // T1 delayed NO -> K2 coil & Green Lamp H1
      { id: 'w3-c9', from: { componentId: 'p3-t1-no', pinId: '18' }, to: { componentId: 'p3-k2-coil', pinId: 'A1' } },
      {
        id: 'w3-c10',
        from: { componentId: 'p3-t1-no', pinId: '18' },
        to: { componentId: 'p3-h1', pinId: 'X1' },
        waypoints: [
          { x: 660, y: 420 },
          { x: 780, y: 420 },
        ],
      },

      // Common Neutral busbar
      {
        id: 'w3-n1',
        from: { componentId: 'p3-k1-coil', pinId: 'A2' },
        to: { componentId: 'p3-n', pinId: 'out' },
        waypoints: [
          { x: 380, y: 540 },
          { x: 580, y: 540 },
        ],
      },
      {
        id: 'w3-n2',
        from: { componentId: 'p3-t1-coil', pinId: 'A2' },
        to: { componentId: 'p3-n', pinId: 'out' },
        waypoints: [
          { x: 520, y: 540 },
          { x: 580, y: 540 },
        ],
      },
      {
        id: 'w3-n3',
        from: { componentId: 'p3-k2-coil', pinId: 'A2' },
        to: { componentId: 'p3-n', pinId: 'out' },
        waypoints: [
          { x: 660, y: 540 },
          { x: 580, y: 540 },
        ],
      },
      {
        id: 'w3-n4',
        from: { componentId: 'p3-h1', pinId: 'X2' },
        to: { componentId: 'p3-n', pinId: 'out' },
        waypoints: [
          { x: 780, y: 540 },
          { x: 580, y: 540 },
        ],
      },
    ],
  },

  {
    id: 'preset-star-delta',
    name: 'Yıldız - Üçgen (Y/Δ) Yol Verme',
    description:
      'Klasik EKTS 6 uçlu motor Yıldız-Üçgen yol verme devresi. Start ile Ana (K1) ve Yıldız (KY) kontaktörleri çekip motoru Yıldız (Y) başlatır; T1 süresi (4 sn) dolunca elektriksel kilitlemeli Üçgen (KU) bağlantısına geçer.',
    components: [
      // 3-Phase Power Section (Left)
      { id: 'p4-rst', type: 'power_3ph', x: 140, y: 60, rotation: 0, label: 'RST' },
      { id: 'p4-k1-p', type: 'contact_power_3p', x: 140, y: 200, rotation: 0, label: 'K1' },
      { id: 'p4-m1', type: 'motor_3ph_6pin', x: 140, y: 360, rotation: 0, label: 'M1' },
      { id: 'p4-ku-p', type: 'contact_power_3p', x: 300, y: 200, rotation: 0, label: 'KU' },
      { id: 'p4-ky-p', type: 'contact_power_3p', x: 300, y: 500, rotation: 0, label: 'KY' },

      // Control Section (Right)
      { id: 'p4-ctrl-l1', type: 'power_l1', x: 520, y: 60, rotation: 0, label: 'L1' },
      { id: 'p4-f1', type: 'fuse', x: 520, y: 140, rotation: 0, label: 'F1' },
      { id: 'p4-aar', type: 'thermal_nc', x: 520, y: 240, rotation: 0, label: 'AAR' },
      { id: 'p4-s0', type: 'btn_stop', x: 520, y: 340, rotation: 0, label: 'S0' },

      // Main Contactor K1 + Latch + Timer T1
      { id: 'p4-s1', type: 'btn_start', x: 520, y: 440, rotation: 0, label: 'S1' },
      { id: 'p4-k1-no', type: 'contact_no', x: 620, y: 440, rotation: 0, label: 'K1' },
      { id: 'p4-k1-coil', type: 'coil_contactor', x: 520, y: 580, rotation: 0, label: 'K1' },
      {
        id: 'p4-t1-coil',
        type: 'coil_timer_on',
        x: 640,
        y: 580,
        rotation: 0,
        label: 'T1',
        delaySeconds: 4,
      },

      // Star Contactor KY branch (T1 NC -> KU NC -> KY coil)
      { id: 'p4-t1-nc', type: 'contact_timer_nc', x: 760, y: 400, rotation: 0, label: 'T1' },
      { id: 'p4-ku-nc', type: 'contact_nc', x: 760, y: 490, rotation: 0, label: 'KU' },
      { id: 'p4-ky-coil', type: 'coil_contactor', x: 760, y: 580, rotation: 0, label: 'KY' },

      // Delta Contactor KU branch (T1 NO -> KY NC -> KU coil)
      { id: 'p4-t1-no', type: 'contact_timer_no', x: 880, y: 400, rotation: 0, label: 'T1' },
      { id: 'p4-ky-nc', type: 'contact_nc', x: 880, y: 490, rotation: 0, label: 'KY' },
      { id: 'p4-ku-coil', type: 'coil_contactor', x: 880, y: 580, rotation: 0, label: 'KU' },

      // Neutral
      { id: 'p4-n', type: 'power_n', x: 700, y: 680, rotation: 0, label: 'N' },
    ],
    wires: [
      // 3-phase feed to K1 (Main)
      { id: 'w4-p1', from: { componentId: 'p4-rst', pinId: 'L1' }, to: { componentId: 'p4-k1-p', pinId: '1' } },
      { id: 'w4-p2', from: { componentId: 'p4-rst', pinId: 'L2' }, to: { componentId: 'p4-k1-p', pinId: '3' } },
      { id: 'w4-p3', from: { componentId: 'p4-rst', pinId: 'L3' }, to: { componentId: 'p4-k1-p', pinId: '5' } },

      // 3-phase feed to KU (Delta contactor)
      {
        id: 'w4-p4',
        from: { componentId: 'p4-rst', pinId: 'L1' },
        to: { componentId: 'p4-ku-p', pinId: '1' },
        waypoints: [
          { x: 100, y: 100 },
          { x: 260, y: 100 },
        ],
      },
      {
        id: 'w4-p5',
        from: { componentId: 'p4-rst', pinId: 'L2' },
        to: { componentId: 'p4-ku-p', pinId: '3' },
        waypoints: [
          { x: 140, y: 120 },
          { x: 300, y: 120 },
        ],
      },
      {
        id: 'w4-p6',
        from: { componentId: 'p4-rst', pinId: 'L3' },
        to: { componentId: 'p4-ku-p', pinId: '5' },
        waypoints: [
          { x: 180, y: 140 },
          { x: 340, y: 140 },
        ],
      },

      // K1 output -> Motor top terminals U1, V1, W1 (L1->U1, L2->V1, L3->W1)
      { id: 'w4-m1', from: { componentId: 'p4-k1-p', pinId: '2' }, to: { componentId: 'p4-m1', pinId: 'U1' } },
      { id: 'w4-m2', from: { componentId: 'p4-k1-p', pinId: '4' }, to: { componentId: 'p4-m1', pinId: 'V1' } },
      { id: 'w4-m3', from: { componentId: 'p4-k1-p', pinId: '6' }, to: { componentId: 'p4-m1', pinId: 'W1' } },

      // Delta KU outputs -> Motor bottom W2, U2, V2 (L1->W2, L2->U2, L3->V2 so U1-U2=L1-L2, V1-V2=L2-L3, W1-W2=L3-L1)
      {
        id: 'w4-d1',
        from: { componentId: 'p4-ku-p', pinId: '2' },
        to: { componentId: 'p4-ky-p', pinId: '1' },
      },
      {
        id: 'w4-d2',
        from: { componentId: 'p4-ku-p', pinId: '4' },
        to: { componentId: 'p4-ky-p', pinId: '3' },
      },
      {
        id: 'w4-d3',
        from: { componentId: 'p4-ku-p', pinId: '6' },
        to: { componentId: 'p4-ky-p', pinId: '5' },
      },

      // Motor bottom W2, U2, V2 tapped into the KU/KY common vertical rails
      {
        id: 'w4-b1',
        from: { componentId: 'p4-m1', pinId: 'W2' },
        to: { componentId: 'p4-ky-p', pinId: '1' },
        waypoints: [
          { x: 100, y: 420 },
          { x: 260, y: 420 },
        ],
      },
      {
        id: 'w4-b2',
        from: { componentId: 'p4-m1', pinId: 'U2' },
        to: { componentId: 'p4-ky-p', pinId: '3' },
        waypoints: [
          { x: 140, y: 440 },
          { x: 300, y: 440 },
        ],
      },
      {
        id: 'w4-b3',
        from: { componentId: 'p4-m1', pinId: 'V2' },
        to: { componentId: 'p4-ky-p', pinId: '5' },
        waypoints: [
          { x: 180, y: 460 },
          { x: 340, y: 460 },
        ],
      },

      // Star point shorting bridge across bottom of KY (2 - 4 - 6)
      {
        id: 'w4-y1',
        from: { componentId: 'p4-ky-p', pinId: '2' },
        to: { componentId: 'p4-ky-p', pinId: '4' },
        waypoints: [
          { x: 260, y: 560 },
          { x: 300, y: 560 },
        ],
      },
      {
        id: 'w4-y2',
        from: { componentId: 'p4-ky-p', pinId: '4' },
        to: { componentId: 'p4-ky-p', pinId: '6' },
        waypoints: [
          { x: 300, y: 560 },
          { x: 340, y: 560 },
        ],
      },

      // Control circuit feed: L1 -> F1 -> AAR -> S0
      { id: 'w4-c1', from: { componentId: 'p4-ctrl-l1', pinId: 'out' }, to: { componentId: 'p4-f1', pinId: '1' } },
      { id: 'w4-c2', from: { componentId: 'p4-f1', pinId: '2' }, to: { componentId: 'p4-aar', pinId: '95' } },
      { id: 'w4-c3', from: { componentId: 'p4-aar', pinId: '96' }, to: { componentId: 'p4-s0', pinId: '11' } },

      // S0 -> S1 & K1 latch
      { id: 'w4-c4', from: { componentId: 'p4-s0', pinId: '12' }, to: { componentId: 'p4-s1', pinId: '13' } },
      {
        id: 'w4-c5',
        from: { componentId: 'p4-s0', pinId: '12' },
        to: { componentId: 'p4-k1-no', pinId: '13' },
        waypoints: [
          { x: 520, y: 390 },
          { x: 620, y: 390 },
        ],
      },

      // S1 & K1 latch -> K1 coil, T1 timer coil, T1 NC (KY branch), T1 NO (KU branch)
      { id: 'w4-c6', from: { componentId: 'p4-s1', pinId: '14' }, to: { componentId: 'p4-k1-coil', pinId: 'A1' } },
      {
        id: 'w4-c7',
        from: { componentId: 'p4-k1-no', pinId: '14' },
        to: { componentId: 'p4-k1-coil', pinId: 'A1' },
        waypoints: [
          { x: 620, y: 500 },
          { x: 520, y: 500 },
        ],
      },
      {
        id: 'w4-c8',
        from: { componentId: 'p4-k1-no', pinId: '14' },
        to: { componentId: 'p4-t1-coil', pinId: 'A1' },
        waypoints: [
          { x: 620, y: 500 },
          { x: 640, y: 500 },
        ],
      },
      {
        id: 'w4-c9',
        from: { componentId: 'p4-k1-no', pinId: '14' },
        to: { componentId: 'p4-t1-nc', pinId: '15' },
        waypoints: [
          { x: 620, y: 500 },
          { x: 700, y: 500 },
          { x: 700, y: 350 },
          { x: 760, y: 350 },
        ],
      },
      {
        id: 'w4-c10',
        from: { componentId: 'p4-t1-nc', pinId: '15' },
        to: { componentId: 'p4-t1-no', pinId: '17' },
        waypoints: [
          { x: 760, y: 350 },
          { x: 880, y: 350 },
        ],
      },

      // KY & KU interlock series wires
      { id: 'w4-c11', from: { componentId: 'p4-t1-nc', pinId: '16' }, to: { componentId: 'p4-ku-nc', pinId: '11' } },
      { id: 'w4-c12', from: { componentId: 'p4-ku-nc', pinId: '12' }, to: { componentId: 'p4-ky-coil', pinId: 'A1' } },
      { id: 'w4-c13', from: { componentId: 'p4-t1-no', pinId: '18' }, to: { componentId: 'p4-ky-nc', pinId: '11' } },
      { id: 'w4-c14', from: { componentId: 'p4-ky-nc', pinId: '12' }, to: { componentId: 'p4-ku-coil', pinId: 'A1' } },

      // Common Neutral busbar
      {
        id: 'w4-n1',
        from: { componentId: 'p4-k1-coil', pinId: 'A2' },
        to: { componentId: 'p4-n', pinId: 'out' },
        waypoints: [
          { x: 520, y: 640 },
          { x: 700, y: 640 },
        ],
      },
      {
        id: 'w4-n2',
        from: { componentId: 'p4-t1-coil', pinId: 'A2' },
        to: { componentId: 'p4-n', pinId: 'out' },
        waypoints: [
          { x: 640, y: 640 },
          { x: 700, y: 640 },
        ],
      },
      {
        id: 'w4-n3',
        from: { componentId: 'p4-ky-coil', pinId: 'A2' },
        to: { componentId: 'p4-n', pinId: 'out' },
        waypoints: [
          { x: 760, y: 640 },
          { x: 700, y: 640 },
        ],
      },
      {
        id: 'w4-n4',
        from: { componentId: 'p4-ku-coil', pinId: 'A2' },
        to: { componentId: 'p4-n', pinId: 'out' },
        waypoints: [
          { x: 880, y: 640 },
          { x: 700, y: 640 },
        ],
      },
    ],
  },
];

export function cloneCircuit(circuit: CircuitDocument): CircuitDocument {
  return {
    id: circuit.id,
    name: circuit.name,
    description: circuit.description,
    components: circuit.components.map((c) => ({ ...c })),
    wires: circuit.wires.map((w) => ({
      ...w,
      from: { ...w.from },
      to: { ...w.to },
      waypoints: w.waypoints ? w.waypoints.map((p) => ({ ...p })) : undefined,
    })),
  };
}

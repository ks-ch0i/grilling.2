# Health and Round HUD Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep player health at its original position, put the round label directly below the stage label, and extend the boss health bar across the remaining top-row space.

**Architecture:** Keep all changes in the existing Phaser `StageScene`. Arrange the fixed-screen stage label, round label, health icons, boss label, and boss bar as separate top-row regions; leave simulation, health values, and save data untouched.

**Tech Stack:** JavaScript ES modules, Phaser 4.2.1, Vite, Node test runner.

---

### Task 1: Reposition player health and round HUD

**Files:**
- Modify: `src/game/scenes/StageScene.js`
- Verify: production build and the live 640×360 stage HUD

- [x] **Step 1: Restore the heart row to its original upper-left position**

Restore the heart creation line to its original position:

```js
this.hearts=[0,1,2].map(i=>this.add.sprite(105+i*25,32,'objects',7).setOrigin(.5,1).setScale(.5).setScrollFactor(0).setDepth(10));
```

The 64×64 heart frame renders at 32×32 after scaling. With bottom anchor y=32, the icons occupy y=0–32 and x=89–171, leaving the stage name and round label to the left and boss HUD to the right.

- [x] **Step 2: Place the round label directly below the stage name and remove its fill**

Replace the round label with a compact line directly below the stage name and remove its opaque fill:

```js
this.roundHud=this.add.text(12,30,'',{fontFamily:'monospace',fontSize:'10px',color:'#ffe4a2'}).setStroke('#17131c',2).setScrollFactor(0).setDepth(10);
```

Do not add a `backgroundColor` or padding. Keep the existing round text update in `renderWorld()` unchanged. At 10px monospace, the text plus 2px outline fits before the first heart begins at x=89.

- [x] **Step 3: Use the remaining top row for the boss label and long bar**

Move the boss name to x=190 and draw both bar rectangles from x=190 to x=620:

```js
this.bossHud=this.add.text(190,10,'',{fontFamily:'monospace',fontSize:'11px',color:'#fff1d1'}).setScrollFactor(0).setDepth(10);
this.hudGraphics.clear();if(showBoss){this.hudGraphics.fillStyle(0x312c2d);this.hudGraphics.fillRect(190,29,430,8);this.hudGraphics.fillStyle(0xe99166);this.hudGraphics.fillRect(190,29,Math.round(430*boss.hp/boss.maxHp),8);}
```

The bar starts 19px after the heart row ends at x=171 and leaves 20px at the right edge. The boss label remains above it.

- [ ] **Step 4: Build and inspect the stage HUD**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173`, choose **라운드 선택 (개발용)**, then **숲 보스**. This loads the Forest boss HUD without waiting for regular round progression. At the normal 640×360 viewport, confirm the round label sits immediately below the stage label, the hearts are back at their original coordinates, the boss name and long bar start to their right, and no text or icon overlaps or is clipped.

Expected layout bounds: hearts occupy x=89–171 and y=0–32; the stage and round labels begin at x=12 and fit before x=89; the boss name/bar begin at x=190, after the hearts, and the bar ends at x=620. These bounds leave gaps between every text/image region.

Live visual inspection was attempted, but the local browser access host was unavailable and Orca reported that the Edge window could not be focused. Do not treat the screenshot check as confirmed. Then run:

```powershell
npm.cmd run build
```

Expected: Vite completes the production build successfully. The repository has no StageScene HUD test, so the live view is the direct visual check.

- [x] `npm.cmd run build` — passed; Vite emitted the existing warning for a JavaScript chunk larger than 500 kB.
- [ ] Live screenshot inspection — not verified because browser access was unavailable and the Edge window could not be focused.

- [x] **Step 5: Commit the focused HUD change**

```powershell
git add src/game/scenes/StageScene.js
git commit -m "fix(ui): reposition health and round HUD"
```

// import java.awt.AWTEvent;
// import java.awt.FlowLayout;
// import java.awt.Frame;
// import java.awt.event.KeyEvent;
// import java.awt.event.MouseEvent;
// import java.awt.event.WindowEvent;
// import java.util.Random;

const MAX_MONSTERS = 320;
const VIEWPORT_WIDTH = 240;
const VIEWPORT_WIDTH_HALF = VIEWPORT_WIDTH / 2;

const VIEWPORT_HEIGHT = 240;
const VIEWPORT_HEIGHT_HALF = VIEWPORT_HEIGHT / 2;

const SCREEN_WIDTH = VIEWPORT_WIDTH * 2;
const SCREEN_HEIGHT = VIEWPORT_HEIGHT * 2;


class Left4kDead {
  constructor() {
    this.userInput = new UserInput();
    this.game = new Game();
    this.map = null;

    this.closestHit;
    this.closestHitDistance;
  }

  run() {
    while (true) {
      this.game.restart();
      this.runGameLoop();
    }
  }

  runGameLoop() {
    while (true) {
      let endRoomTopLeft;
      let endRoomBottomRight;
      let startPoint;
      let monsters;
      let lastTime;
      let viewport;
      let playerDir;
      let mouse;
      let shootDir;
      let cos;
      let sin;
      let camera;
      let wasMonsterHit;
      let i;

      this.game.winLevel();
      endRoomTopLeft = new Point(0, 0);
      endRoomBottomRight = new Point(0, 0);

      // Make the levels random but repeatable.
      random = this.game.randomForLevel();

      this.map = new Map(1024, 1024);

      startPoint = new Point(0, 0);
      this.map.generate(random, startPoint, endRoomTopLeft, endRoomBottomRight);

      monsters = new Monster[MAX_MONSTERS];
      for (i = 0; i < MAX_MONSTERS; ++i) {
        monsters[i] = new Monster(i);
      }

      // Place the player (monsterData[0-15]) in the center of the start room.
      monsters[0].setAsPlayer(startPoint);

      lastTime = window.performance.now();

      viewport = new Viewport(VIEWPORT_WIDTH, VIEWPORT_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT, getGraphics());

      playerDir = 0;

      while (true) {
        if (this.game.isStarted()) {
          this.game.advanceTick();
          this.game.advanceRushTime(random);

          mouse = this.userInput.mouseEvent;
          playerDir = Math.atan2(mouse / VIEWPORT_WIDTH - VIEWPORT_WIDTH_HALF, mouse % VIEWPORT_HEIGHT - VIEWPORT_HEIGHT_HALF);

          shootDir = playerDir + (random.nextInt(100) - random.nextInt(100)) / 100.0 * 0.2;
          cos = Math.cos(-shootDir);
          sin = Math.sin(-shootDir);

          camera = monsters[0].position;

          viewport.prepareFrame(this.game, this.map, camera, playerDir);

          this.resetClosestHitDistance(cos, sin, camera);
          this.processMonsters(viewport, this.game.getTick(), monsters, playerDir, cos, sin, camera);

          if (this.didPlayerPressFire()) {
            wasMonsterHit = this.closestHit > 0;
            this.closestHitDistance = viewport.handleShot(
              this.game, this.userInput, wasMonsterHit, playerDir, cos, sin, this.closestHitDistance);
            if (wasMonsterHit) {
              monsters[this.closestHit].markDamaged();
              monsters[this.closestHit].markEnraged();
            }
          }

          if (this.game.getDamage() >= 220) {
            this.userInput.setTriggerPressed(false);
            this.game.setMaxHurt();
            return;
          }
          if (this.userInput.isReloadPressed() && !this.game.isAmmoFull() && this.game.getClips() < 220) {
            this.game.reloadGun();
          }

          if (this.isPlayerInEndRoom(endRoomTopLeft, endRoomBottomRight, camera)) {
            console.log("You made it!");
            break;
          }
        }

        this.game.decayBonusTime();
        this.game.decayHurt();

        viewport.completeFrame(this.game, this.userInput);

        do {
          Thread.yield();
        } while (window.performance.now() - lastTime < 0);
        if (!isActive())
          return;

        lastTime += (1000000000 / 30);
      }
    }
  }

  isPlayerInEndRoom(endRoomTopLeft, endRoomBottomRight, camera) {
    return camera.x > endRoomTopLeft.x && camera.x < endRoomBottomRight.x
        && camera.y > endRoomTopLeft.y && camera.y < endRoomBottomRight.y;
  }

  resetClosestHitDistance(cos, sin, camera) {
    let distance = 0;
    let xm;
    let ym;
    let i;
    for (i = 0; i < VIEWPORT_WIDTH + 10; i++) {
      // xm = camera.x + (int) (cos * i / 2);
      // ym = camera.y - (int) (sin * i / 2);
      xm = camera.x + Math.floor(cos * i / 2);
      ym = camera.y - Math.floor(sin * i / 2);

      if (this.map.isMonsterSafe(xm, ym))
        break;
      distance = i / 2;
    }
    this.closestHit = 0;
    this.closestHitDistance = distance;
  }

  processMonsters(viewport, tick, monsters, playerDir, cos, sin, camera) {
    let i;
    for (i = 0; i < 256 + 16; ++i) {
      this.processMonster(viewport, tick, monsters[i], playerDir, cos, sin, camera);
    }
  }

  didPlayerPressFire() {
    return this.game.advanceShotTimer() && this.userInput.isTriggerPressed();
  }

  updateClosestHit(index, distance) {
    if (distance < this.closestHitDistance) {
      this.closestHit = index;
      this.closestHitDistance = distance;
    }
  }

  processMonster(viewport, tick, monster, playerDir, cos, sin, camera) {
    let xPos = monster.position.x;
    let yPos = monster.position.y;
    let distance;
    let move;
    let distanceToPlayer;
    let rx;
    let ry;
    let shouldSkip;

    if (!monster.isActive()) {
      // Try to activate it.

      // Pick a random spot to put it.
      xPos = (random.nextInt(62) + 1) * 16 + 8;
      yPos = (random.nextInt(62) + 1) * 16 + 8;

      distance = new Point(camera.x - xPos, camera.y - yPos);
      if (this.isTooCloseToSpawn(distance)) {
        // Too close. Not fair. So put the monster inside a wall. I don't
        // understand why this isn't just a continue;
        xPos = 1;
        yPos = 1;
      }

      // Are all these true?
      // 1. The monster is not on a wall or other monster, AND
      // 2. Any of these is true: a. It's an early-numbered monster, OR b.
      // It's rush time, OR c. It's the first tick of the this.game and it's one
      // of the last 16 monsters.
      if (!this.map.isMonsterHead(xPos, yPos)
          && (monster.isEarly() || this.game.getRushTime() > 0 || (monster.isSpecial() && tick == 1))) {
        monster.place(xPos, yPos, this.game.getRushTime(),
            this.map.getElement(xPos, yPos));
        // Mark the this.map as having a monster here.
        this.map.setMonsterHead(xPos, yPos);
      } else {
        return;
      }
    } else {
      distance = new Point(camera.x - xPos, camera.y - yPos);

      if (monster.isSpecial()) {
        if (this.isTouchingPlayer(distance)) {
          this.killMonster(monster);
          return;
        }
      } else {
        if (this.isOutOfView(distance)) {
          // Not a special monster. If it wandered too far from the player,
          // or more likely the player wandered too far from it, kill it.
          // Basically, this keeps the player reasonably surrounded with
          // monsters waiting to come to life without wasting too many
          // resources on idle ones.
          this.killMonster(monster);
          return;
        }
      }
    }

    viewport.drawMonster(tick, monster, playerDir, camera, xPos);

    moved = false;

    if (monster.hasTakenDamage()) {
      monster.processDamage(this.map, this.game, playerDir, xPos, yPos);
      return;
    }

    distanceToPlayer = new Point(camera.x - xPos, camera.y - yPos);

    if (!monster.isSpecial()) {
      // Calculate distance to player.
      rx = -(cos * distanceToPlayer.x - sin * distanceToPlayer.y);
      ry = cos * distanceToPlayer.y + sin * distanceToPlayer.x;

      // Is this monster near the player?
      if (monster.isMouthTouchingPlayer(rx, ry)) {
        this.game.inflictNibbleDamage();
      }

      if (monster.canSeePlayer(rx, ry) && random.nextInt(10) == 0) {
        monster.agitate();
      }

      // Mark which monster so far is closest to the player.
      if (rx > 0 && ry > -8 && ry < 8) {
        // updateClosestHit(monster.getIndex(), (int) rx);
        this.updateClosestHit(monster.getIndex(), Math.floor(rx));
      }

      for (i = 0; i < 2; i++) {
        shouldSkip = new Boolean(false);
        moved = this.doOneMovementIteration(monster, moved, i, shouldSkip, distanceToPlayer);
        if (shouldSkip)
          return;
      }
      if (moved) {
        monster.advanceSpriteFrame();
      }
    }
  }

  isTooCloseToSpawn(distance) {
    return distance.x * distance.x + distance.y * distance.y < 180 * 180;
  }

  isOutOfView(distance) {
    return distance.x * distance.x + distance.y * distance.y > 340 * 340;
  }

  isTouchingPlayer(distance) {
    return distance.x * distance.x + distance.y * distance.y < 8 * 8;
  }

  killMonster(monster) {
    // Replace the this.map pixel.
    this.map.setElement(monster.position.x, monster.position.y,
        monster.getSavedMapPixel());

    // Mark monster inactive.
    monster.markInactive();

    if (monster.isSpecial()) {
      this.game.resetBonusTime();

      // 50-50 chance of resetting damage or giving ammo.
      if ((monster.getIndex() & 1) == 0) {
        this.game.resetDamage();
      } else {
        this.game.resetClips();
      }
    }
  }

  doOneMovementIteration(monster, moved, iteration, shouldSkip, distanceToPlayer) {
    let movement = new Point(0, 0);
    let xxd;
    let yyd;
    let dir;
    let xx;
    let yy;

    if (monster.isPlayer()) {
      this.userInput.handleKeyboardInput(movement);
    } else {
      // Not agitated enough. Don't do anything.
      if (!monster.isSomewhatEnraged()) {
        shouldSkip = true;
        return false;
      }

      monster.wanderToward(distanceToPlayer);

      // Move generally toward the player.
      xxd = Math.sqrt(distanceToPlayer.x * distanceToPlayer.x);
      yyd = Math.sqrt(distanceToPlayer.y * distanceToPlayer.y);
      if (random.nextInt(1024) / 1024.0 < yyd / xxd) {
        if (distanceToPlayer.y < 0)
          movement.y -= 1;
        if (distanceToPlayer.y > 0)
          movement.y += 1;
      }
      if (random.nextInt(1024) / 1024.0 < xxd / yyd) {
        if (distanceToPlayer.x < 0)
          movement.x -= 1;
        if (distanceToPlayer.x > 0)
          movement.x += 1;
      }

      // Mark that the monster moved so we can update pixels later.
      moved = true;

      // Pick the right sprite frame depending on direction.
      dir = Math.atan2(distanceToPlayer.y, distanceToPlayer.x);
      // monster.setDirection((((int) (dir / (Math.PI * 2) * 16 + 4.5 + 16)) & 15));
      monster.setDirection(((Math.floor(dir / (Math.PI * 2) * 16 + 4.5 + 16)) & 15));
    }

    // I think this is a way to move fast but not go through walls.
    // Start by moving a small amount, test for wall hit, if successful
    // try moving more.
    movement.y *= iteration;
    movement.x *= 1 - iteration;

    if (this.didMove(movement)) {
      // Restore the this.map pixel during collision detection.
      this.map.setElement(monster.position.x, monster.position.y, monster.getSavedMapPixel());

      // Did the monster bonk into a wall?
      for (xx = monster.position.x + movement.x - 3; xx <= monster.position.x + movement.x + 3; xx++) {
        for (yy = monster.position.y + movement.y - 3; yy <= monster.position.y + movement.y + 3; yy++) {
          if (this.map.isWall(xx, yy)) {
            // Yes. We're not moving. Put back our pixel.
            this.map.setMonsterHead(monster.position.x, monster.position.y);
            // Try wandering in a different direction.
            monster.pickWanderDirection();
            return moved;
          }
        }
      }

      // Move the monster.
      moved = true;
      monster.move(this.map, movement);
    }

    return moved;
  }

  didMove(movement) {
    return movement.x != 0 || movement.y != 0;
  }

  /**
   * Scan key event and turn into a bitmap.
   */
  processEvent(e) {
    let down = false;
    switch (e.getID()) {
    case KeyEvent.KEY_PRESSED:
      down = true;
    case KeyEvent.KEY_RELEASED:
      this.userInput.setIsPressed((e).getKeyCode(), down);
      break;
    case MouseEvent.MOUSE_PRESSED:
      down = true;
    case MouseEvent.MOUSE_RELEASED:
      this.userInput.setTriggerPressed(down);
    case MouseEvent.MOUSE_MOVED:
    case MouseEvent.MOUSE_DRAGGED:
      this.userInput.mouseEvent = (e).getX() / 2 + (e).getY() / 2 * VIEWPORT_HEIGHT;
    }
  }
}

// main() {
//   Left4kDead left4kDead = new Left4kDead();
//   left4kDead.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
//   left4kDead.setVisible(true);
//   left4kDead.setLayout(new FlowLayout());
//   left4kDead.run();
// }

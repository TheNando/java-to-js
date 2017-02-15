import Point from './Point';

class Monster {
  constructor(index) {
    this.activity = null;
    this.damage = null;
    this.direction = null;
    this.frame = null;
    this.rage = null;
    this.savedMapPixel = null;
    this.wanderDirection = null;

    this.index = index;
    this.position = new Point(0, 0);
  }

  advanceSpriteFrame() {
    this.frame += 1;
  }

  agitate() {
    this.rage += 1;
  }

  canSeePlayer(rx, ry) {
    return rx > -32 && rx < 220 && ry > -32 && ry < 32;
  }

  hasTakenDamage() {
    return this.damage > 0;
  }

  isActive() {
    return this.activity != 0;
  }

  isEarly() {
    return this.index <= 128;
  }

  isMouthTouchingPlayer(rx, ry) {
    return rx > -6 && rx < 6 && ry > -6 && ry < 6 && !isPlayer();
  }

  isPlayer() {
    return this.index == 0;
  }

  isSomewhatEnraged() {
    return this.rage >= 8;
  }

  isSpecial() {
    return this.index >= 255;
  }

  markActive() {
    this.activity = 1;
  }

  markDamaged() {
    this.damage = 1;
  }

  markEnraged() {
    this.rage = 127;
  }

  markInactive() {
    this.activity = 0;
  }

  move(map, movement) {
    // Restore prior pixel.
    map.setElement(this.position.x, this.position.y, this.savedMapPixel);

    // New position.
    this.position.x += movement.x;
    this.position.y += movement.y;

    // Remember new pixel's contents.
    this.savedMapPixel = map.getElement(this.position.x, this.position.y);

    // Put ourselves here.
    map.setMonsterHead(this.position.x, this.position.y);
  }

  pickWanderDirection() {
    this.wanderDirection = random.nextInt(25);
  }

  place(x, y, rushTime, pixelToSave) {
    this.position.x = x;
    this.position.y = y;

    // Remember this map pixel.
    this.savedMapPixel = pixelToSave;

    // Mark monster as idle or attacking.
    this.rage = (rushTime > 0 || random.nextInt(3) == 0) ? 127 : 0;

    // Mark monster active.
    this.activity = 1;

    // Distribute the monsters' initial direction.
    this.direction = this.index & 15;
  }

  processDamage(map, game, playerDir, xPos, yPos) {
    let rot;
    let amount;
    let poww;
    let pow;
    let dir;
    let xdd;
    let ydd;
    let col;
    let i;
    let j;
    let xd;
    let yd;

    // Add to monster's cumulative damage and reset temporary damage.
    this.activity += random.nextInt(3) + 1;
    this.damage = 0;

    rot = 0.25; // How far around the blood spreads, radians
    amount = 8; // How much blood
    poww = 32; // How far to spread the blood

    // Is this monster sufficiently messed up to die?
    if (this.activity >= 2 + game.getLevel()) {
      rot = Math.PI * 2; // All the way around
      amount = 60; // lots of blood
      poww = 16;
      map.setElement(xPos, yPos, 0xa00000); // Red
      this.activity = 0; // Kill monster
      game.addScoreForMonsterDeath();
    }

    // Draw blood.
    for (i = 0; i < amount; i++) {
      pow = (random.nextInt(100) * random.nextInt(100)) * poww / 10000 + 4;
      dir = (random.nextInt(100) - random.nextInt(100)) / 100.0 * rot;
      xdd = (Math.cos(playerDir + dir) * pow) + random.nextInt(4) - random.nextInt(4);
      ydd = (Math.sin(playerDir + dir) * pow) + random.nextInt(4) - random.nextInt(4);
      col = (random.nextInt(128) + 120);

      // TODO: loop label
      bloodLoop: for (j = 2; j < pow; j++) {
        // xd = (int) (xPos + xdd * j / pow);
        // yd = (int) (yPos + ydd * j / pow);
        xd = Math.floor(xPos + xdd * j / pow);
        yd = Math.floor(yPos + ydd * j / pow);

        // If the blood encounters a wall, stop spraying.
        if (map.isAnyWallSafe(xd, yd)) {
          break bloodLoop;
        }

        // Occasionally splat some blood and darken it.
        if (random.nextInt(2) != 0) {
          map.setElementSafe(xd, yd, col << 16);
          col = col * 8 / 9;
        }
      }
    }
  }

  setAsPlayer(startPoint) {
    this.position = startPoint;
    this.savedMapPixel = 0x808080;
    this.markActive();
  }

  wanderToward(distanceToPlayer) {
    if (this.wanderDirection != 12) {
      distanceToPlayer.x = (this.wanderDirection) % 5 - 2;
      distanceToPlayer.y = (this.wanderDirection) / 5 - 2;
      if (random.nextInt(10) == 0) {
        this.wanderDirection = 12;
      }
    }
  }
}

export default Monster;

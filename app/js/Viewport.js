import Point from './Point';

const PIXEL_ZOMBIE_SKIN = 0xa0ff90;
const PIXEL_SKIN = 0xFF9993;

class Viewport {
  constructor(width, height, screenWidth, screenHeight, graphics) {
    // Graphics ogr;
    // Graphics sg;

    this.width = width;
    this.width_half = width / 2;
    this.height = height;
    this.height_half = height / 2;

    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    this.image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
    this.ogr = this.image.getGraphics();
    this.sg = graphics;

    // Array of game image
    // TODO: this.pixels = ((DataBufferInt) this.image.getRaster().getDataBuffer()).getData();
    this.lightmap = new int[width * height];

    this.brightness = new int[512];
    this.generateBrightness();

    this.sprites = new int[18 * 4 * 16 * 12 * 12];
    this.generateSprites();

    this.random = Random.instance;
  }

  /**
   * Generates a bunch of top-down sprites using surprisingly compact code.
   */
  generateSprites() {
    let pix = 0;
    let i;
    let skin;
    let clothes;
    let t;
    let d;
    let dir;
    let cos;
    let sin;
    let x;
    let y;
    let col;
    let xPix;
    let yPix;

    for (i = 0; i < 18; i++) {
      skin = PIXEL_SKIN;
      clothes = 0xFFffff;

      if (i > 0) {
        skin = PIXEL_ZOMBIE_SKIN;
        clothes = ((this.random.nextInt(256) * this.random.nextInt(256) * this.random.nextInt(256)) & 0x7f7f7f);
      }
      for (t = 0; t < 4; t++) {
        for (d = 0; d < 16; d++) {
          dir = d * Math.PI * 2 / 16.0;

          if (t == 1)
            dir += 0.5 * Math.PI * 2 / 16.0;
          if (t == 3)
            dir -= 0.5 * Math.PI * 2 / 16.0;

          // if (i == 17)
          // {
          // dir = d * Math.PI * 2 / 64;
          // }

          cos = Math.cos(dir);
          sin = Math.sin(dir);

          for (y = 0; y < 12; y++) {
            col = 0x000000;
            for (x = 0; x < 12; x++) {
              // xPix = (int) (cos * (x - 6) + sin * (y - 6) + 6.5);
              // yPix = (int) (cos * (y - 6) - sin * (x - 6) + 6.5);
              xPix = Math.floor(cos * (x - 6) + sin * (y - 6) + 6.5);
              yPix = Math.floor(cos * (y - 6) - sin * (x - 6) + 6.5);

              if (i == 17) {
                if (xPix > 3 && xPix < 9 && yPix > 3 && yPix < 9) {
                  col = 0xff0000 + (t & 1) * 0xff00;
                }
              } else {
                if (t == 1 && xPix > 1 && xPix < 4 && yPix > 3 && yPix < 8)
                  col = skin;
                if (t == 3 && xPix > 8 && xPix < 11 && yPix > 3 && yPix < 8)
                  col = skin;

                if (xPix > 1 && xPix < 11 && yPix > 5 && yPix < 8) {
                  col = clothes;
                }
                if (xPix > 4 && xPix < 8 && yPix > 4 && yPix < 8) {
                  col = skin;
                }
              }
              this.sprites[pix++] = col;

              // If we just drew a pixel, make the next one an almost-black
              // pixel, and if it's already an almost-black one, make it
              // transparent (full black). (This is all honored only if the
              // next pixel isn't actually set to something else.) This takes
              // advantage of the left-to-right scanning of the sprite
              // generation to create a slight shadow effect on each sprite.
              if (col > 1) {
                col = 1;
              } else {
                col = 0;
              }
            }
          }
        }
      }
    }
  }

  generateBrightness() {
    let offs = 30;
    let i;
    for (i = 0; i < 512; i++) {
      // this.brightness[i] = (int) (255.0 * offs / (i + offs));
      this.brightness[i] = Math.floor(255.0 * offs / (i + offs));
      if (i < 4)
        this.brightness[i] = this.brightness[i] * i / 4;
    }
  }

  calculateLightmap(map, tick, playerDir, camera) {
    let i;
    let j;
    let xt;
    let yt;
    let tmp;
    let dd;
    let brr;
    let dist;
    let xx;
    let yy;
    let xm;
    let ym;
    let xd;
    let yd;
    let ddd;
    let br;
    for (i = 0; i < width * 4; i++) {
      // Calculate a along the outer wall of the view.
      xt = i % width - width_half;
      yt = (i / height % 2) * (height - 1) - height_half;

      if (i >= width * 2) {
        tmp = xt;
        xt = yt;
        yt = tmp;
      }

      // Figure out how far the current beam is from the player's view.
      // In radians, not degrees, but same idea -- if the player is looking
      // 180 degrees south, and this beam is pointing 270 degrees west,
      // then the answer is 90 degrees (in radians). This is for creating a
      // flashlight effect in front of the player.
      //
      // Clamp to a circle (2 x pi).
      dd = Math.atan2(yt, xt) - playerDir;
      if (dd < -Math.PI)
        dd += Math.PI * 2;
      if (dd >= Math.PI)
        dd -= Math.PI * 2;

      // This calculation is weird because of the 1- and the *255. It seems
      // arbitrary. Maybe it is. brr is probably supposed to stand for
      // something like "brightness times radius squared."
      // brr = (int) ((1 - dd * dd) * 255);
      brr = Math.floor((1 - dd * dd) * 255);

      dist = width_half;
      if (brr < 0) {
        // Cut off the flashlight past a certain angle, but for better
        // playability leave a small halo going all the way around the player.
        brr = 0;
        dist = 32;
      }
      // At the very start of the level, fade in the light gradually.
      if (tick < 60)
        brr = brr * tick / 60;

      for (j = 0; j < dist; j++) {
        // Loop through the beam's pixels one fraction of the total distance
        // each iteration. This is very slightly inefficient because in some
        // cases we'll calculate the same pixel twice.
        xx = xt * j / width_half + width_half;
        yy = yt * j / height_half + height_half;
        xm = xx + camera.x - width_half;
        ym = yy + camera.y - height_half;

        // Stop the light if it hits a wall.
        if (map.isWallSafe(xm, ym))
          break;

        // Do an approximate distance calculation. I'm not sure why this
        // couldn't have been built into the brightness table, which would let
        // us easily index using j.
        xd = (xx - width_half) * 256 / width_half;
        yd = (yy - height_half) * 256 / height_half;
        ddd = (xd * xd + yd * yd) / 256;
        br = this.brightness[ddd] * brr / 255;

        // Draw the halo around the player.
        if (ddd < 16) {
          tmp = 128 * (16 - ddd) / 16;
          br = br + tmp * (255 - br) / 255;
        }

        // Fill in the lightmap entry.
        this.lightmap[xx + yy * width] = br;
      }
    }
  }

  drawNoiseAndHUD(game) {
    let y;
    let x;
    let noise;
    let c;
    let l;
    let r;
    let g;
    let b;
    for (y = 0; y < height; y++) {
      for (x = 0; x < width; x++) {
        noise = this.random.nextInt(16) * this.random.nextInt(16) / 16;
        if (!game.isStarted())
          noise *= 4;

        c = this.pixels[x + y * width];
        l = this.lightmap[x + y * width];
        this.lightmap[x + y * width] = 0;
        r = ((c >> 16) & 0xff) * l / 255 + noise;
        g = ((c >> 8) & 0xff) * l / 255 + noise;
        b = ((c) & 0xff) * l / 255 + noise;

        r = r * (255 - game.getHurtTime()) / 255 + game.getHurtTime();
        g = g * (255 - game.getBonusTime()) / 255 + game.getBonusTime();
        this.pixels[x + y * width] = r << 16 | g << 8 | b;
      }
      if (y % 2 == 0 && (y >= game.getDamage() && y < 220)) {
        for (x = 232; x < 238; x++) {
          this.pixels[y * width + x] = 0x800000;
        }
      }
      if (y % 2 == 0 && (y >= game.getAmmo() && y < 220)) {
        for (x = 224; x < 230; x++) {
          this.pixels[y * width + x] = 0x808000;
        }
      }
      if (y % 10 < 9 && (y >= game.getClips() && y < 220)) {
        for (x = 221; x < 222; x++) {
          this.pixels[y * width + 221] = 0xffff00;
        }
      }
    }
  }

  isWithinView(xm, ym) {
    return xm > 0 && ym > 0 && xm < width && ym < height;
  }

  drawBulletTrace(cos, sin, closestHitDist) {
    let glow = 0;
    let i;
    let xm;
    let ym;
    for (i = closestHitDist; i >= 0; i--) {
      // Calculate pixel position.
      // xm = +(int) (cos * i) + width_half;
      // ym = -(int) (sin * i) + height_half;
      xm = +Math.floor(cos * i) + width_half;
      ym = -Math.floor(sin * i) + height_half;

      // Are we still within the view?
      if (this.isWithinView(xm, ym)) {

        // Every so often, draw a white dot and renew the glow. This gives a
        // cool randomized effect that looks like spitting sparks.
        if (this.random.nextInt(20) == 0 || j == closestHitDist) {
          this.pixels[xm + ym * width] = 0xffffff;
          glow = 200;
        }

        // Either way, brighten up the path according to the current glow.
        this.lightmap[xm + ym * width] += glow * (255 - this.lightmap[xm + ym * width]) / 255;
      }

      // Fade the glow.
      glow = glow * 20 / 21;
    }
  }

  drawBulletDebris(playerDir, hitMonster, hitPoint) {
    let i;
    let pow;
    let dir;
    let xd;
    let yd;
    for (i = 0; i < 10; i++) {
      pow = this.random.nextInt(100) * this.random.nextInt(100) * 8.0 / 10000;
      dir = (this.random.nextInt(100) - this.random.nextInt(100)) / 100.0;
      // xd = (int) (hitPoint.x - Math.cos(playerDir + dir) * pow) + this.random.nextInt(4) - this.random.nextInt(4);
      // yd = (int) (hitPoint.y - Math.sin(playerDir + dir) * pow) + this.random.nextInt(4) - this.random.nextInt(4);
      xd = Math.floor(hitPoint.x - Math.cos(playerDir + dir) * pow) + this.random.nextInt(4) - this.random.nextInt(4);
      yd = Math.floor(hitPoint.y - Math.sin(playerDir + dir) * pow) + this.random.nextInt(4) - this.random.nextInt(4);
      if (xd >= 0 && yd >= 0 && xd < width && yd < height) {
        if (hitMonster) {
          // Blood
          this.pixels[xd + yd * width] = 0xff0000;
        } else {
          // Wall
          this.pixels[xd + yd * width] = 0xcacaca;
        }
      }
    }
  }

  drawImpactFlash(hitPoint) {
    let x;
    let y;
    let offsetPoint;
    for (x = -12; x <= 12; x++) {
      for (y = -12; y <= 12; y++) {
        offsetPoint = new Point(hitPoint.x + x, hitPoint.y + y);
        if (offsetPoint.x >= 0 && offsetPoint.y >= 0 && offsetPoint.x < width && offsetPoint.y < height) {
          this.lightmap[offsetPoint.x + offsetPoint.y * width] += 2000
              / (x * x + y * y + 10)
              * (255 - this.lightmap[offsetPoint.x + offsetPoint.y * width]) / 255;
        }
      }
    }
  }

  drawMonster(tick, monster, playerDir, camera, xPos) {
    let p;
    let y;
    let x;
    let c;

    // Monster is active. Calculate position relative to player.
    let xm = xPos - camera.x + width_half;
    let ym = monster.position.y - camera.y + height_half;

    // Get monster's direction. This is just for figuring out which sprite
    // to draw.
    let d = monster.getDirection();
    if (monster.isPlayer()) {
      // or if this is the player, convert radian direction.
      // d = (((int) (playerDir / (Math.PI * 2) * 16 + 4.5 + 16)) & 15);
      d = ((Math.floor(playerDir / (Math.PI * 2) * 16 + 4.5 + 16)) & 15);
    }

    d += ((monster.getFrame() / 4) & 3) * 16;

    // If non-special monster, convert to actual sprite pixel offset.
    // TODO: What's up with the 0?
    p = (0 * 16 + d) * 144;
    if (!monster.isPlayer()) {
      p += ((monster.getIndex() & 15) + 1) * 144 * 16 * 4;
    }

    // Special non-player monster: cycle through special sprite, either
    // red or yellow, spinning.
    if (monster.isSpecial()) {
      p = (17 * 4 * 16 + ((monster.getIndex() & 1) * 16 + (tick & 15))) * 144;
    }

    // Render the monster.
    for (y = ym - 6; y < ym + 6; y++) {
      for (x = xm - 6; x < xm + 6; x++) {
        c = this.sprites[p++];
        if (c > 0 && x >= 0 && y >= 0 && x < width && y < height) {
          this.pixels[x + y * width] = c;
        }
      }
    }
  }

  copyView(map, camera) {
    let x;
    let y;
    let xm;
    let ym;
    for (y = 0; y < height; y++) {
      xm = camera.x - (width >> 1);
      ym = y + camera.y - (height >> 1);
      for (x = 0; x < width; x++) {
        this.pixels[x + y * width] = map.getElementSafe(xm + x, ym);
      }
    }
  }

  drawStatusText(game, userInput) {
    this.ogr.drawString("" + game.getScore(), 4, 232);
    if (!game.isStarted()) {
      this.ogr.drawString("Left 4k Dead", 80, 70);
      if (userInput.isTriggerPressed() && game.getHurtTime() == 0) {
        game.markGameStarted();
        userInput.setTriggerPressed(false);
      }
    } else if (game.getTick() < 60) {
      game.drawLevel(this.ogr);
    }
  }

  drawToScreen(screen_width, screen_height) {
    this.sg.drawImage(this.image, 0, 0, screen_width, screen_height, 0, 0, width, height, null);
  }

  completeFrame(game, userInput) {
    this.drawNoiseAndHUD(game);
    this.drawStatusText(game, userInput);
    this.drawToScreen(screenWidth, screenHeight);
  }

  prepareFrame(game, map, camera, playerDir) {
    this.calculateLightmap(map, game.getTick(), playerDir, camera);
    this.copyView(map, camera);
  }

  handleShot(game, userInput, wasMonsterHit, playerDir, cos, sin, closestHitDistance) {
    let hitPoint;
    
    // Is the ammo used up?
    if (!game.isAmmoAvailable()) {
      // Yes.
      game.setLongShootDelay();
      // Require trigger release.
      userInput.setTriggerPressed(false);
    } else {
      // No.
      game.setShortShootDelay();
      // Use up bullets.
      game.consumeAmmo(4);
    }

    this.drawBulletTrace(cos, sin, closestHitDistance);

    // Did the bullet hit within view?
    if (closestHitDistance < width_half) {
      closestHitDistance -= 3;
      // hitPoint = new Point((int) (width_half + cos * closestHitDistance), (int) (height_half - sin * closestHitDistance));
      hitPoint = new Point(Math.floot(width_half + cos * closestHitDistance), Math.floot(height_half - sin * closestHitDistance));

      this.drawImpactFlash(hitPoint);
      this.drawBulletDebris(playerDir, wasMonsterHit, hitPoint);
    }

    return closestHitDistance;
  }
}

export default Viewport;

import Random from './Random'

class Game {
  constructor() {
    // Fields that are reset during attract.
    this.bonusTime = null
    this.hurtTime = null // Makes the screen red when player is getting bitten
    this.score = null

    // Fields that are reset when entering attract.
    this.ammo = null
    this.clips = null
    this.damage = null
    this.isStarted = false
    this.level = null
    this.rushTime = null
    this.shootDelay = null
    this.tick = null

    this.random = Random.instance
  }

  addScoreForMonsterDeath() {
    this.score += this.level
  }

  advanceRushTime() {
    this.rushTime += 1
    if (this.rushTime >= 150) {
      this.rushTime = -this.random.nextInt(200) * 10
    }
  }

  // Returns true if OK to shoot now.
  advanceShotTimer() {
    this.shootDelay -= 1
    return this.shootDelay < 0
  }

  advanceTick() {
    this.tick++
  }

  consumeAmmo(amount) {
    this.ammo += amount
  }

  decayBonusTime() {
    this.bonusTime = this.bonusTime * 8 / 9
  }

  decayHurt() {
    this.hurtTime /= 2
  }

  drawLevel(ogr) {
    ogr.drawString('Level ' + this.level, 90, 70)
  }

  inflictNibbleDamage() {
    this.damage += 1
    this.hurtTime += 20
  }

  isAmmoAvailable() {
    return this.ammo < 220
  }

  isAmmoFull() {
    return this.ammo <= 20
  }

  isStarted() {
    return this.isStarted
  }

  markGameStarted() {
    this.score = 0
    this.isStarted = true
    console.log('Starting new game...')
  }

  // TODO: Disabled until good performance, seedable random
  // randomForLevel() {
  //   return new Random(4329 + this.level);
  // }

  reloadGun() {
    this.shootDelay = 30
    this.ammo = 20
    this.clips += 10
  }

  resetBonusTime() {
    this.bonusTime = 120
  }

  resetClips() {
    this.clips = 20
  }

  resetDamage() {
    this.damage = 20
  }

  restart() {
    this.isStarted = false
    this.level = 0
    this.shootDelay = 0
    this.rushTime = 150
    this.damage = 20
    this.ammo = 20
    this.clips = 20
    console.log('Entering attract...')
  }

  setLongShootDelay() {
    this.shootDelay = 2
  }

  setMaxHurt() {
    this.hurtTime = 255
  }

  setShortShootDelay() {
    this.shootDelay = 1
  }

  winLevel() {
    this.level += 1
    this.tick = 0
    console.log(`Advancing to level ${level}...`)
  }
}

export default Game

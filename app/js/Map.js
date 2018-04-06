import Alea from 'alea'

const PIXEL_MASK_WALL = 0xff0000
const PIXEL_MONSTER_HEAD = 0xfffffe
const PIXEL_INNER_WALL = 0xffffff
const PIXEL_BORDER_WALL = 0xff8052
const PIXEL_OUTER_WALL = 0xfffefe
const PIXEL_MASK_END_ROOM = 0xff0000
const ROOM_COUNT = 70

class Map {
  constructor(width, height) {
    this.elements = new Int32Array(width * height)
    this.height = height
    this.random = new Alea()
    this.random.nextInt = (max) => this.random() * max | 0
    this.width = width
  }

  getElement(x, y) {
    return this.elements[x + y * this.width]
  }

  getElementSafe(x, y) {
    return this.elements[(x + y * this.width) & (this.width * this.height - 1)]
  }

  setElement(x, y, pixel) {
    this.elements[x + y * this.width] = pixel
  }

  setElementSafe(x, y, pixel) {
    this.elements[(x + y * this.width) & (this.width * this.height - 1)] = pixel
  }

  maskEndRoom(x, y) {
    // Give the end room a red tint.
    this.elements[x + y * this.width] &= PIXEL_MASK_END_ROOM
  }

  isWall(x, y) {
    return this.getElement(x, y) >= 0xfffffe
  }

  isWallSafe(x, y) {
    return this.getElementSafe(x, y) == 0xffffff
  }

  isMonsterSafe(x, y) {
    // 0xffffff is the color of character clothes.
    return this.getElementSafe(x, y) == 0xffffff
  }

  isMonsterHead(x, y) {
    return this.getElement(x, y) >= PIXEL_MONSTER_HEAD
  }

  setMonsterHead(x, y) {
    this.setElement(x, y, PIXEL_MONSTER_HEAD)
  }

  setInnerWall(x, y) {
    this.setElement(x, y, PIXEL_INNER_WALL)
  }

  setBorderWall(x, y) {
    this.setElement(x, y, PIXEL_BORDER_WALL)
  }

  setOuterWall(x, y) {
    this.setElement(x, y, PIXEL_OUTER_WALL)
  }

  isAnyWall(x, y) {
    return this.getElement(x, y) >= PIXEL_MASK_WALL
  }

  isAnyWallSafe(x, y) {
    return this.getElementSafe(x, y) >= PIXEL_MASK_WALL
  }

  generate(startPoint, endRoomTopLeft, endRoomBottomRight) {
    let x
    let y
    let i
    let j
    let br
    let d
    let xGap
    let yGap
    let ww
    let hh
    let xx
    let yy

    // Draw the floor of the level with an uneven green color.
    // Put a wall around the perimeter.
    for (y = 0; y < this.height; y++) {
      for (x = 0; x < this.width; x++) {
        br = this.random.nextInt(32) + 112
        this.setElement(x, y, ((br / 3) << 16) | (br << 8))
        if (x < 4 || y < 4 || x >= this.width - 4 || y >= this.height - 4) {
          this.setOuterWall(x, y)
        }
      }
    }

    // Create 70 rooms. Put the player in the 69th, and make the 70th red.
    for (i = 0; i < ROOM_COUNT; i++) {
      let isStartRoom = i == ROOM_COUNT - 2
      let isEndRoom = i == ROOM_COUNT - 1

      // Create a room that's possibly as big as the level, whose coordinates
      // are clamped to the nearest multiple of 16.
      let w = this.random.nextInt(8) + 2
      let h = this.random.nextInt(8) + 2
      let xm = this.random.nextInt(64 - w - 2) + 1
      let ym = this.random.nextInt(64 - h - 2) + 1

      w *= 16
      h *= 16

      w += 5
      h += 5
      xm *= 16
      ym *= 16

      if (isStartRoom) {
        startPoint.x = xm + w / 2
        startPoint.y = ym + h / 2
      }

      if (isEndRoom) {
        endRoomTopLeft.x = xm + 5
        endRoomTopLeft.y = ym + 5
        endRoomBottomRight.x = xm + w - 5
        endRoomBottomRight.y = ym + w - 5
      }

      for (y = ym; y < ym + h; y++) {
        for (x = xm; x < xm + w; x++) {
          // This seems to calculate the thickness of the wall.
          d = x - xm
          if (xm + w - x - 1 < d) d = xm + w - x - 1
          if (y - ym < d) d = y - ym
          if (ym + h - y - 1 < d) d = ym + h - y - 1

          // Are we inside the wall, and thus in the room?
          if (d > 4) {
            // Yes, we are. Draw the floor.

            // Vary the color of the floor.
            br = this.random.nextInt(16) + 112

            // Floor diagonal
            if (((x + y) & 3) == 0) {
              br += 16
            }

            // Grayish concrete floor
            this.setElement(
              x,
              y,
              ((br * 3 / 3) << 16) | ((br * 4 / 4) << 8) | (br * 4 / 4)
            )
          } else {
            // No, we're not. Draw the orange wall border.
            this.setBorderWall(x, y)
          }

          if (isEndRoom) {
            this.maskEndRoom(x, y)
          }
        }
      }

      // Put two exits in the room.
      for (j = 0; j < 2; j++) {
        xGap = this.random.nextInt(w - 24) + xm + 5
        yGap = this.random.nextInt(h - 24) + ym + 5
        ww = 5
        hh = 5

        xGap = xGap / 16 * 16 + 5
        yGap = yGap / 16 * 16 + 5
        if (this.random.nextInt(2) == 0) {
          xGap = xm + (w - 5) * this.random.nextInt(2)
          hh = 11
        } else {
          ww = 11
          yGap = ym + (h - 5) * this.random.nextInt(2)
        }
        for (y = yGap; y < yGap + hh; y++) {
          for (x = xGap; x < xGap + ww; x++) {
            // A slightly darker color represents the exit.
            br = this.random.nextInt(32) + 112 - 64
            this.setElement(
              x,
              y,
              ((br * 3 / 3) << 16) | ((br * 4 / 4) << 8) | (br * 4 / 4)
            )
          }
        }
      }
    }

    // Paint the inside of each wall white. This is for wall-collision detection.
    for (y = 1; y < this.height - 1; y++) {
      // TODO: loop label
      inloop: for (x = 1; x < this.width - 1; x++) {
        for (xx = x - 1; xx <= x + 1; xx++) {
          for (yy = y - 1; yy <= y + 1; yy++) {
            if (!this.isAnyWall(xx, yy)) {
              continue inloop
            }
          }
        }
        this.setInnerWall(x, y)
      }
    }
  }
}

export default Map

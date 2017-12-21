import { observable, computed, action, extendObservable, useStrict } from 'mobx'
import _ from 'lodash'

import { PLAYING, PAUSING, STOPPED } from '../constants/gameStatus'
import { DROP_INTERVAL_ACCELERATING, DROP_INTERVAL_MIN, DROP_INTERVAL_DEC } from '../constants/options'
import { COLORS, SHAPES } from '../constants/tetromino'
import {
  generateInitState,
  isPositionAvailable,
  rotate,
  fitTetrominoWithinBoundaries,
  setDropTimeout,
  clearDropTimeout,
  transferTetroGridIntoWell,
  hasLineToClear,
  clearLines,
  getInitTetroPosition,
  getRandomTetromino
} from '../utils'
import { getTetrisStateFromStorage, updateTetrisStateStorage } from '../utils/storage'

// useStrict(true)

export default class TetrisStore {
  @computed get isPlaying() {
    return this.gameStatus === PLAYING
  }

  constructor() {
    extendObservable(this, generateInitState())
  }

  @action onGameStart = () => {
    extendObservable(this, generateInitState(true))
  }

  @action onGameInit = () => {
    clearDropTimeout()
    const state = getTetrisStateFromStorage() || generateInitState()
    extendObservable(this, state)
  }

  @action onGamePause = () => {
    clearDropTimeout()
    this.gameStatus = PAUSING
  }

  @action onGameResume = () => {
    this.onDrop()
    this.gameStatus = PLAYING
  }

  @action onHorizontalMove = (direction) => {
    const { currTetroPosition, grid, currTetroGrid } = this
    
    const newPosition = {
      x: currTetroPosition.x + direction,
      y: currTetroPosition.y
    }

    if (!isPositionAvailable(grid, currTetroGrid, newPosition)) return
    this.currTetroPosition = newPosition
  }

  @action onRotate = () => {
    const { currTetroGrid, currTetroPosition, grid } = this
    const newTetroGrid = rotate(currTetroGrid)
    const newPosition = fitTetrominoWithinBoundaries(grid, newTetroGrid, currTetroPosition)
  
    if (!isPositionAvailable(grid, newTetroGrid, newPosition))  return
  
    this.currTetroGrid = newTetroGrid
    this.currTetroPosition = newPosition
  }

  @action onDrop() {
    const { 
      gameStatus,
      isAccelerating,
      dropInterval,
      grid,
      currTetroGrid,
      currTetroPosition,
      currTetromino,
      score,
      linesCleared,
      nextTetromino
    } = this

    setDropTimeout(() => {
      if (gameStatus === STOPPED) return
      if (gameStatus === PLAYING) {
        // drop
        // get the newPosition 
        const newPosition = _.assign({}, currTetroPosition, {
          y: currTetroPosition.y + 1
        })

        // drop until it hits something
        if (isPositionAvailable(grid, currTetroGrid, newPosition)) {
          // return updateTetrisStateStorage(_.assign({}, state, { currTetroPosition: newPosition }))
          return this.currTetroPosition = newPosition
        }
        
        // there is no extra room for the new tetromino, game over
        if (currTetroPosition.y < 0) {
          clearDropTimeout()
          updateTetrisStateStorage(null)
          this.gameStatus = STOPPED
          return
        }
        
        let newGrid = transferTetroGridIntoWell({
          grid,
          tetroGrid: currTetroGrid,
          tetroPosition: currTetroPosition, // not newPosition!!
          color: COLORS[currTetromino]
        })

        if (hasLineToClear(newGrid)) {
          return extendObservable(this, {
            score: score + 10,
            linesCleared: linesCleared + 1,
            grid: clearLines(newGrid),
            currTetromino: nextTetromino,
            currTetroGrid: SHAPES[nextTetromino],
            currTetroPosition: getInitTetroPosition(nextTetromino),
            nextTetromino: getRandomTetromino(),
            dropInterval: dropInterval <= DROP_INTERVAL_MIN ? DROP_INTERVAL_MIN :  dropInterval - DROP_INTERVAL_DEC
          })
        } else {
          return extendObservable(this, {
            grid: newGrid,
            score: score + 4,
            currTetromino: nextTetromino,
            currTetroGrid: SHAPES[nextTetromino],
            currTetroPosition: getInitTetroPosition(nextTetromino),
            nextTetromino: getRandomTetromino()
          })
        }
      }
      this.onDrop()
    }, isAccelerating ? DROP_INTERVAL_ACCELERATING : dropInterval)
  }

  @action onEnableAccelerate = () => {
    this.isAccelerating = true
  }

  @action onDisableAccelerate = () => {
    this.isAccelerating = false
  }
}
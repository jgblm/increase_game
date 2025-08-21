<script setup>
import GameComponent from './GameComponent.vue'
import { ref, onMounted, onUnmounted } from 'vue'

const gameComponent = ref(null)
let saveLoop

// 每5秒保存游戏
const saveGame = () => {
  if (gameComponent.value) {
    gameComponent.value.saveGame()
  }
}

onMounted(() => {
  saveLoop = setInterval(saveGame, 5000)
})

onUnmounted(() => {
  if (saveLoop) clearInterval(saveLoop)
})
</script>

<template>
  <GameComponent ref="gameComponent" />
</template>

<style scoped>
</style>
<script setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {decryptData, encryptData} from './utils/crypto.js'
import {NumberWithUnit} from './utils/NumberWithUnit.js'

const STORAGE_KEY = 'increase_game_save'

// 获取环境变量中的收入增长倍数，默认为1.2
const INCOME_MULTIPLIER = parseFloat(import.meta.env.VITE_INCOME_MULTIPLIER) || 1.2
const ITEM_MAX_COUNT = 10
const ITEM_MAX_LEVEL = 10
const NUMBER_UNIT = ["", "万", "亿", "兆", "京", "垓", "秭", "穰", "沟", "涧", "正", "载", "极"]

// 游戏数据
const coins = ref(new NumberWithUnit(0, 0))
const items = ref([
  {id: 1, name: '商品', level: 0, count: 3},
  {id: 2, name: '商品', level: 0, count: 0},
  {id: 3, name: '商品', level: 0, count: 0}
])

// 商店基础值
const shopBaseValue = ref(new NumberWithUnit(1, 0))

// 游戏循环
let gameLoop

// 商店升级次数
const shopUpgradeLevel = ref(0)

// 活动数据
const luckyDrawCost = ref(50)
const luckyDrawResult = ref('')
const isLuckyDrawVisible = ref(false)
const speedBoostEndTime = ref(0) // 速度提升结束时间


// 计算每秒收入
const incomePerSecond = computed(() => {
  let baseIncome = items.value.reduce((total, item) => {
    return total.add(getItemIncome(item).multiply(item.count))
  }, new NumberWithUnit(0, 0))

  // 检查是否在速度提升期间
  if (Date.now() < speedBoostEndTime.value) {
    baseIncome = baseIncome.multiply(2) // 2倍速度
  }

  return baseIncome
})

// 检查是否在速度提升期间
const isSpeedBoostActive = computed(() => {
  return Date.now() < speedBoostEndTime.value
})

// 获取速度提升剩余时间（分钟）
const speedBoostRemainingMinutes = computed(() => {
  if (!isSpeedBoostActive.value) return 0
  const remainingMs = speedBoostEndTime.value - Date.now()
  return Math.ceil(remainingMs / (1000 * 60))
})

// 检查商店是否应该升级（商品数量和等级都达到最大值）
const shouldUpgradeShop = computed(() => {
  const maxLevelItem = items.value[2] // 第三个商品
  // 每次升级需要的等级和数量递增
  const requiredLevel = ITEM_MAX_LEVEL
  const requiredCount = ITEM_MAX_COUNT
  return maxLevelItem && maxLevelItem.level >= requiredLevel && maxLevelItem.count >= requiredCount
})

// 监听商店升级条件
watch(shouldUpgradeShop, (newVal) => {
  if (newVal) {
    upgradeShop()
  }
})

// 商店升级功能
const upgradeShop = () => {
  shopUpgradeLevel.value++
  shopBaseValue.value = shopBaseValue.value.multiply(1000)

  // 重置所有商品的等级和数量
  items.value.forEach((item, index) => {
    item.level = 0
    item.count = index === 0 ? 3 : 0 // 商品1数量为1，其他为0
  })

  saveGame()
}

// 每秒增加金币
const updateCoins = () => {
  coins.value = coins.value.add(incomePerSecond.value)
}

// 从本地存储加载游戏状态
const loadGame = () => {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      const decryptedData = decryptData(savedData)
      console.log('Loaded data:', decryptedData)
      if (decryptedData) {
        // 解析解密后的数据（可能是字符串或对象）
        let parsedData
        if (typeof decryptedData === 'string') {
          parsedData = JSON.parse(decryptedData)
        } else {
          parsedData = decryptedData
        }
        
        coins.value = NumberWithUnit.fromObject(parsedData.coins) || new NumberWithUnit(0, 0)
        console.log('Loaded coins:', coins.value)

        // 加载速度提升结束时间
        speedBoostEndTime.value = parsedData.speedBoostEndTime || 0

        // 加载商店基础值
        shopBaseValue.value = NumberWithUnit.fromObject(parsedData.shopBaseValue) || new NumberWithUnit(1, 0)
        // 处理加载数据异常
        if (shopBaseValue.value.number <= 0) {
          shopBaseValue.value = new NumberWithUnit(1, 0)
        }
        console.log('Loaded shopBaseValue:', shopBaseValue.value)
        // 确保物品结构正确
        if (parsedData.items && Array.isArray(parsedData.items) && parsedData.items.length === 3) {
          items.value = parsedData.items.map((item, index) => {
            return {
              id: index + 1,
              name: '商品',
              level: item.level || 0,
              count: item.count || 0
            }
          })
        }

        // 加载商店升级次数
        shopUpgradeLevel.value = parsedData.shopUpgradeLevel || 0

        // 持续检查商店升级条件直到不满足为止
        const checkAndUpgradeShop = () => {
          if (shouldUpgradeShop.value) {
            upgradeShop()
            // 使用setTimeout确保异步执行，避免栈溢出
            setTimeout(checkAndUpgradeShop, 0)
          }
        }

        // 在加载后检查商店升级条件
        setTimeout(checkAndUpgradeShop, 0)
      }
    }
  } catch (e) {
    console.error('加载游戏状态失败:', e)
  }
}

// 将游戏状态保存到本地存储
const saveGame = () => {
  try {
    const gameState = {
      coins: { number: coins.value.number, unit: coins.value.unit },
      items: items.value.map(item => ({ ...item })),
      timestamp: Date.now(), // 添加时间戳
      speedBoostEndTime: speedBoostEndTime.value, // 保存速度提升结束时间
      shopUpgradeLevel: shopUpgradeLevel.value, // 保存商店升级次数
      shopBaseValue: { number: shopBaseValue.value.number, unit: shopBaseValue.value.unit } // 保存商店基础值
    }

    const encryptedData = encryptData(JSON.stringify(gameState))
    if (encryptedData) {
      localStorage.setItem(STORAGE_KEY, encryptedData)
    } else {
      console.warn('Failed to encrypt game data')
    }
  } catch (e) {
    console.error('保存游戏状态失败:', e)
  }
}

// 计算商品的购买价格
const getItemCost = (item) => {
  const basePrices = [10, 50, 200] // 商品的基础价格倍数
  return shopBaseValue.value.multiply(basePrices[item.id - 1])
}

// 计算商品的升级价格
const getItemUpgradeCost = (item) => {
  const cost = getItemCost(item)
  return cost.multiply(2 * Math.pow(1.2, item.level))
}

// 计算单个商品的每秒收入
const getItemIncome = (item) => {
  const basePrices = [10, 50, 200] // 商品的基础价格倍数
  const basePrice = shopBaseValue.value.multiply(basePrices[item.id - 1])

  // 根据商品类型计算收入因子
  let incomeFactor
  switch (item.id) {
    case 1: // 商品1
      incomeFactor = 10
      break
    case 2: // 商品2
      incomeFactor = 7.5
      break
    case 3: // 商品3
      incomeFactor = 5
      break
  }

  return (basePrice.divide(incomeFactor)).multiply(Math.pow(INCOME_MULTIPLIER, item.level))
}

// 购买商品
const buyItem = (item) => {
  // 添加数量限制，每个商品最多只能购买10个
  if (item.count >= 10) {
    return false
  }

  const cost = getItemCost(item)
  if (coins.value.ge(cost)) {
    coins.value = coins.value.subtract(cost)
    item.count++
    saveGame() // 购买后立即保存
    return true
  }
  return false
}

// 升级商品
const upgradeItem = (item) => {
  // 添加等级限制，每个商品最多只能升级10次
  if (item.level >= 10) {
    return false
  }

  const cost = getItemUpgradeCost(item)
  if (coins.value.ge(cost)) {
    coins.value = coins.value.subtract(cost)
    item.level++
    saveGame() // 升级后立即保存
    return true
  }
  return false
}

// 手动增加金币（用于测试和游戏循环）
const addCoins = (amount) => {
  coins.value.add(amount)
}

// 重置游戏（用于测试）
const resetGame = () => {
  coins.value = new NumberWithUnit(0, 0)
  items.value = [
    {id: 1, name: '商品', level: 0, count: 3},
    {id: 2, name: '商品', level: 0, count: 0},
    {id: 3, name: '商品', level: 0, count: 0}
  ]
  shopBaseValue.value = new NumberWithUnit(1, 0)
  speedBoostEndTime.value = 0
  shopUpgradeLevel.value = 0
  saveGame() // 重置后保存
}

// 大轮盘抽奖
const doLuckyDraw = () => {
  if (coins.value.lessThan(new NumberWithUnit(luckyDrawCost.value, 0))) {
    luckyDrawResult.value = '金币不足，无法抽奖！'
    isLuckyDrawVisible.value = true
    return
  }

  coins.value = coins.value.subtract(new NumberWithUnit(luckyDrawCost.value, 0))

  // 抽奖选项和概率（均等概率，各1/7）
  const options = [
    {
      name: '2倍当前金币', action: () => {
        coins.value = coins.value.multiply(2)
      }
    },
    {
      name: '5倍当前金币', action: () => {
        coins.value = coins.value.multiply(5)
      }
    },
    {
      name: '10倍当前金币', action: () => {
        coins.value = coins.value.multiply(10)
      }
    },
    {
      name: '金币清0', action: () => {
        coins.value = new NumberWithUnit(0, 0)
      }
    },
    {
      name: '金币减半', action: () => {
        coins.value = coins.value.multiply(0.5)
      }
    },
    {
      name: '谢谢惠顾', action: () => {
      }
    },
    {
      name: '3小时2倍收益', action: () => {
        speedBoostEndTime.value = Date.now() + (3 * 60 * 60 * 1000)
      }
    }
  ]

  // 随机选择一个选项
  const resultIndex = Math.floor(Math.random() * options.length)
  const result = options[resultIndex]

  // 执行结果
  result.action()

  // 显示结果
  luckyDrawResult.value = result.name
  isLuckyDrawVisible.value = true

  // 保存游戏状态
  saveGame()
}

// 测试运气按钮
const testLuck = () => {
  console.log('Testing luck...')
  // 50%概率获得3小时2倍收益
  const isLucky = Math.random() < 0.5
  console.log('Is lucky:', isLucky)
  
  if (isLucky) {
    speedBoostEndTime.value = Date.now() + (3 * 60 * 60 * 1000) // 3小时
    luckyDrawResult.value = '恭喜！获得3小时2倍收益加成！'
    console.log('Lucky result:', luckyDrawResult.value)
  } else {
    luckyDrawResult.value = '运气不佳，再接再厉！'
    console.log('Unlucky result:', luckyDrawResult.value)
  }
  
  isLuckyDrawVisible.value = true
  console.log('Dialog visibility:', isLuckyDrawVisible.value)

  // 保存游戏状态
  saveGame()
}

// 关闭抽奖结果弹窗
const closeLuckyDraw = () => {
  console.log('Closing lucky draw dialog')
  isLuckyDrawVisible.value = false
  luckyDrawResult.value = ''
  console.log('Dialog visibility after close:', isLuckyDrawVisible.value)
  console.log('Lucky draw result after close:', luckyDrawResult.value)
}

// 初始化游戏
onMounted(() => {
  loadGame()
  gameLoop = setInterval(updateCoins, 1000)
})

onUnmounted(() => {
  if (gameLoop) clearInterval(gameLoop)
})

defineExpose({
  coins,
  items,
  incomePerSecond,
  getItemCost,
  getItemUpgradeCost,
  getItemIncome,
  buyItem,
  upgradeItem,
  addCoins,
  resetGame,
  saveGame,
  loadGame,
  isSpeedBoostActive,
  speedBoostRemainingMinutes,
  updateCoins
})
</script>

<template>
  <div class="game-container">
    <h1>增长游戏</h1>

    <div class="stats">
      <div class="main-stats">
        <div class="coins">金币: {{ coins }}</div>
        <div class="income">每秒收入: {{ incomePerSecond }}</div>
      </div>
      <div v-if="isSpeedBoostActive" class="speed-boost">
        2倍收益剩余: {{ speedBoostRemainingMinutes }}分钟
      </div>
      <div v-if="shopUpgradeLevel > 0" class="shop-upgraded">
        商店已升级 {{ shopUpgradeLevel }} 次！
      </div>
    </div>

    <div class="items">
      <h2>商店</h2>
      <div class="item" v-for="item in items" :key="item.id">
        <div class="item-header">
          <h3>{{ item.name }} (Lv{{ item.level }})</h3>
          <div class="item-count">数量: {{ item.count }}</div>
        </div>
        <div class="item-stats">
          <div>单价收入: {{ getItemIncome(item) }}</div>
          <div>总收入: {{ getItemIncome(item).multiply(item.count) }}</div>
        </div>
        <div class="item-cost">价格: {{ getItemCost(item) }}</div>
        <div class="item-upgrade-cost">升级价格: {{ getItemUpgradeCost(item) }}</div>
        <div class="item-actions">
          <button @click="buyItem(item)"
                  :disabled="getItemCost(item).greaterThan(coins) || item.count >= ITEM_MAX_COUNT">
            购买
          </button>
          <button @click="upgradeItem(item)"
                  :disabled="getItemUpgradeCost(item).greaterThan(coins) || item.level >= ITEM_MAX_LEVEL">
            升级
          </button>
        </div>
      </div>
    </div>

    <div class="activities">
      <h2>活动</h2>
      <div class="activity">
        <h3>活动一：大轮盘</h3>
        <p>花费 {{ luckyDrawCost }} 金币抽奖，奖品包括：</p>
        <ul>
          <li>2倍当前金币</li>
          <li>5倍当前金币</li>
          <li>10倍当前金币</li>
          <li>金币清0</li>
          <li>金币减半</li>
          <li>谢谢惠顾</li>
          <li>3小时2倍收益</li>
        </ul>
        <button @click="doLuckyDraw" :disabled="coins < luckyDrawCost">
          抽奖 ({{ luckyDrawCost }}金币)
        </button>
      </div>

      <div class="activity">
        <h3>活动二：测试运气</h3>
        <p>点击测试运气，50%概率获得3小时2倍收益加成</p>
        <button @click="testLuck">测试运气</button>
      </div>
    </div>

    <div class="game-actions">
      <button @click="saveGame">立即保存游戏</button>
      <button @click="loadGame">加载游戏</button>
      <button @click="resetGame">重置游戏</button>
    </div>

    <!-- 抽奖结果弹窗 -->
    <div v-if="isLuckyDrawVisible" class="modal-overlay" @click="closeLuckyDraw">
      <div class="modal-content" @click.stop>
        <h3>抽奖结果</h3>
        <p>{{ luckyDrawResult }}</p>
        <button @click="closeLuckyDraw">确定</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  position: relative;
}

.stats {
  background-color: #f0f0f0;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.main-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.coins {
  font-size: 24px;
  font-weight: bold;
  color: #ffcc00;
}

.income {
  font-size: 18px;
  color: #00aa00;
}

.speed-boost {
  font-size: 16px;
  color: #ff0000;
  font-weight: bold;
  margin-bottom: 5px;
}

.shop-upgraded {
  font-size: 16px;
  color: #0000ff;
  font-weight: bold;
}

.items h2, .activities h2 {
  margin-bottom: 15px;
}

.item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #fafafa;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.item-header h3 {
  margin: 0;
  color: #333;
}

.item-count {
  font-weight: bold;
  color: #666;
}

.item-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #555;
}

.item-cost {
  font-weight: bold;
  margin-bottom: 5px;
  color: #ff6600;
}

.item-upgrade-cost {
  font-weight: bold;
  margin-bottom: 10px;
  color: #0066cc;
}

.item-actions {
  display: flex;
  gap: 10px;
}

.activities {
  margin: 20px 0;
}

.activity {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #fafafa;
}

.activity h3 {
  margin-top: 0;
}

.activity ul {
  padding-left: 20px;
}

.activity li {
  margin-bottom: 5px;
}

.game-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* 抽奖结果弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  max-width: 300px;
  width: 80%;
}

.modal-content h3 {
  margin-top: 0;
}

.modal-content button {
  margin-top: 15px;
}
</style>
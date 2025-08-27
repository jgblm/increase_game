export class NumberWithUnit {
  constructor(number = 0, unit = 0) {
    this.number = number
    this.unit = unit
  }

  // 将数字转换为字符串表示形式
  toString() {
    const NUMBER_UNIT = ["", "万", "亿", "兆", "京", "垓", "秭", "穰", "沟", "涧", "正", "载", "极"]
    
    // 处理非数字情况
    if (typeof this.number !== 'number' || isNaN(this.number)) {
      return '0'
    }
    
    // 处理负数
    if (this.number < 0) {
      const negativeNumber = new NumberWithUnit(-this.number, this.unit)
      return '-' + negativeNumber.toString()
    }
    
    // 如果单位超出范围，则进行进位处理
    let { number, unit } = this
    while (number >= 10000 && unit < NUMBER_UNIT.length - 1) {
      number /= 10000
      unit++
    }
    
    // 格式化数字显示
    if (number >= 1000 && unit > 0) {
      // 对于大于等于1000且有单位的数字，显示整数部分
      return Math.floor(number) + NUMBER_UNIT[unit]
    } else if (unit > 0) {
      // 对于有单位的数字，保留适当的小数位数
      const formattedNumber = number.toFixed(2).replace(/\.?0+$/, '')
      return formattedNumber + NUMBER_UNIT[unit]
    } else {
      // 没有单位的数字直接显示
      return Math.floor(number).toString()
    }
  }

  // 加法操作
  add(other) {
    // 如果单位相同，直接相加
    if (this.unit === other.unit) {
      return new NumberWithUnit(this.number + other.number, this.unit)
    }
    
    // 如果单位不同，将单位调整为较小的那个
    if (this.unit > other.unit) {
      // 将this的单位调整为other的单位
      const unitDiff = this.unit - other.unit
      const numberInOtherUnit = this.number * Math.pow(10000, unitDiff)
      return new NumberWithUnit(numberInOtherUnit + other.number, other.unit)
    } else {
      // 将other的单位调整为this的单位
      const unitDiff = other.unit - this.unit
      const numberInThisUnit = other.number * Math.pow(10000, unitDiff)
      return new NumberWithUnit(this.number + numberInThisUnit, this.unit)
    }
  }

  // 减法操作
  subtract(other) {
    // 如果单位相同，直接相减
    if (this.unit === other.unit) {
      return new NumberWithUnit(this.number - other.number, this.unit)
    }
    
    // 如果单位不同，将单位调整为较小的那个
    if (this.unit > other.unit) {
      // 将this的单位调整为other的单位
      const unitDiff = this.unit - other.unit
      const numberInOtherUnit = this.number * Math.pow(10000, unitDiff)
      return new NumberWithUnit(numberInOtherUnit - other.number, other.unit)
    } else {
      // 将other的单位调整为this的单位
      const unitDiff = other.unit - this.unit
      const numberInThisUnit = other.number * Math.pow(10000, unitDiff)
      return new NumberWithUnit(this.number - numberInThisUnit, this.unit)
    }
  }

  // 乘法操作
  multiply(factor) {
    return new NumberWithUnit(this.number * factor, this.unit)
  }

  // 除法操作
  divide(divisor) {
    // 如果除数是NumberWithUnit实例
    if (divisor instanceof NumberWithUnit) {
      // 如果单位相同，直接相除
      if (this.unit === divisor.unit) {
        return new NumberWithUnit(this.number / divisor.number, this.unit)
      }
      
      // 如果单位不同，将被除数的单位调整为除数的单位
      if (this.unit > divisor.unit) {
        // 将this的单位调整为divisor的单位
        const unitDiff = this.unit - divisor.unit
        const numberInDivisorUnit = this.number * Math.pow(10000, unitDiff)
        return new NumberWithUnit(numberInDivisorUnit / divisor.number, divisor.unit)
      } else {
        // 将divisor的单位调整为this的单位
        const unitDiff = divisor.unit - this.unit
        const numberInThisUnit = divisor.number * Math.pow(10000, unitDiff)
        return new NumberWithUnit(this.number / numberInThisUnit, this.unit)
      }
    } else {
      // 如果除数是普通数字
      return new NumberWithUnit(this.number / divisor, this.unit)
    }
  }

  // 大于等于比较操作
  ge(other) {
    if (this.unit === other.unit) {
      return this.number >= other.number
    }
    
    // 单位不同时，单位大的数更大
    if (this.unit > other.unit) {
      return true
    } else {
      return false
    }
  }

  // 大于比较操作
  greaterThan(other) {
    if (this.unit === other.unit) {
      return this.number > other.number
    }
    
    return this.unit > other.unit || (this.unit === other.unit && this.number > other.number)
  }

  // 小于比较操作
  lessThan(other) {
    if (this.unit === other.unit) {
      return this.number < other.number
    }
    
    return this.unit < other.unit || (this.unit === other.unit && this.number < other.number)
  }

  // 检查是否可以进行单位进位
  canCarry() {
    return this.number >= 10000
  }

  // 执行单位进位
  carry() {
    const NUMBER_UNIT = ["", "万", "亿", "兆", "京", "垓", "秭", "穰", "沟", "涧", "正", "载", "极"]
    
    if (this.number >= 10000 && this.unit < NUMBER_UNIT.length - 1) {
      return new NumberWithUnit(this.number / 10000, this.unit + 1)
    }
    
    return new NumberWithUnit(this.number, this.unit)
  }
  
  // 将对象转换为普通对象，用于序列化
  toObject() {
    return {
      number: this.number,
      unit: this.unit
    }
  }
  
  // 从普通对象创建NumberWithUnit实例，用于反序列化
  static fromObject(obj) {
    // 检查输入是否为有效对象
    if (!obj || typeof obj !== 'object') {
      return new NumberWithUnit(0, 0)
    }
    
    // 从对象中提取number和unit属性，如果不存在则使用默认值
    const number = typeof obj.number === 'number' ? obj.number : 0
    const unit = typeof obj.unit === 'number' ? obj.unit : 0
    
    return new NumberWithUnit(number, unit)
  }
}
export interface PricePoint {
  timestamp: number
  price: number
}

export interface TokenMetrics {
  averagePrice: number
  volatility: number // standard deviation
  maxPrice: number
  minPrice: number
  medianPrice: number
  priceRange: number
  sampleSize: number
}

export class TokenAnalysisCalculator {
  constructor(private data: PricePoint[]) {}

  private isEmpty(): boolean {
    return this.data.length === 0
  }

  getAveragePrice(): number {
    if (this.isEmpty()) return 0
    const sum = this.data.reduce((acc, p) => acc + p.price, 0)
    return sum / this.data.length
  }

  getVolatility(): number {
    if (this.isEmpty()) return 0
    const avg = this.getAveragePrice()
    const variance =
      this.data.reduce((acc, p) => acc + (p.price - avg) ** 2, 0) /
      this.data.length
    return Math.sqrt(variance)
  }

  getMaxPrice(): number {
    if (this.isEmpty()) return 0
    return this.data.reduce((max, p) => (p.price > max ? p.price : max), -Infinity)
  }

  getMinPrice(): number {
    if (this.isEmpty()) return 0
    return this.data.reduce((min, p) => (p.price < min ? p.price : min), Infinity)
  }

  getMedianPrice(): number {
    if (this.isEmpty()) return 0
    const sorted = [...this.data].map(p => p.price).sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2
    }
    return sorted[mid]
  }

  getPriceRange(): number {
    if (this.isEmpty()) return 0
    return this.getMaxPrice() - this.getMinPrice()
  }

  computeMetrics(): TokenMetrics {
    return {
      averagePrice: this.getAveragePrice(),
      volatility: this.getVolatility(),
      maxPrice: this.getMaxPrice(),
      minPrice: this.getMinPrice(),
      medianPrice: this.getMedianPrice(),
      priceRange: this.getPriceRange(),
      sampleSize: this.data.length,
    }
  }
}

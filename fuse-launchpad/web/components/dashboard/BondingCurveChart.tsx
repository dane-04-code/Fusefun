"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
    createChart,
    ColorType,
    ISeriesApi,
    CandlestickData,
    Time,
    IChartApi,
} from "lightweight-charts"

interface BondingCurveChartProps {
    currentPrice: number
    symbol: string
    mint?: string
    trades?: TradeData[]
}

interface TradeData {
    timestamp: number
    price: number
    volume: number
    type: 'buy' | 'sell'
}

type TimeFrame = "1m" | "5m" | "15m" | "1h" | "1d"

interface CandleData {
    time: Time
    open: number
    high: number
    low: number
    close: number
}

export function BondingCurveChart({ currentPrice, symbol, mint, trades = [] }: BondingCurveChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
    const candlesRef = useRef<CandleData[]>([])

    const [timeFrame, setTimeFrame] = useState<TimeFrame>("1m")
    const [isLoading, setIsLoading] = useState(true)

    // Get interval in seconds for each timeframe
    const getIntervalSeconds = useCallback((tf: TimeFrame): number => {
        switch (tf) {
            case "1m": return 60
            case "5m": return 300
            case "15m": return 900
            case "1h": return 3600
            case "1d": return 86400
            default: return 60
        }
    }, [])

    // Convert trades to candles
    const tradesToCandles = useCallback((tradeData: TradeData[], tf: TimeFrame): CandleData[] => {
        if (tradeData.length === 0) return []

        const interval = getIntervalSeconds(tf) * 1000
        const candleMap = new Map<number, CandleData>()

        tradeData.forEach(trade => {
            const candleTime = Math.floor(trade.timestamp / interval) * interval / 1000

            if (!candleMap.has(candleTime)) {
                candleMap.set(candleTime, {
                    time: candleTime as Time,
                    open: trade.price,
                    high: trade.price,
                    low: trade.price,
                    close: trade.price,
                })
            } else {
                const candle = candleMap.get(candleTime)!
                candle.high = Math.max(candle.high, trade.price)
                candle.low = Math.min(candle.low, trade.price)
                candle.close = trade.price
            }
        })

        return Array.from(candleMap.values()).sort((a, b) => (a.time as number) - (b.time as number))
    }, [getIntervalSeconds])

    // Generate initial data (when no real trades)
    const generateInitialData = useCallback((price: number, tf: TimeFrame): CandleData[] => {
        if (!price || price === 0) return []

        const interval = getIntervalSeconds(tf)
        const now = Math.floor(Date.now() / 1000)
        const startTime = now - (interval * 50) // 50 candles of history
        const candles: CandleData[] = []

        let currentCandlePrice = price * 0.9

        for (let i = 0; i < 50; i++) {
            const candleTime = startTime + (i * interval)
            const volatility = tf === "1d" ? 0.05 : tf === "1h" ? 0.02 : 0.01
            const change = (Math.random() - 0.45) * volatility

            const open = currentCandlePrice
            const close = open * (1 + change)
            const high = Math.max(open, close) * (1 + Math.random() * 0.003)
            const low = Math.min(open, close) * (1 - Math.random() * 0.003)

            candles.push({
                time: candleTime as Time,
                open,
                high,
                low,
                close,
            })

            currentCandlePrice = close
        }

        // Make last candle end at current price
        if (candles.length > 0) {
            const lastCandle = candles[candles.length - 1]
            lastCandle.close = price
            lastCandle.high = Math.max(lastCandle.high, price)
            lastCandle.low = Math.min(lastCandle.low, price)
        }

        return candles
    }, [getIntervalSeconds])

    // Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return

        const container = chartContainerRef.current
        const chart = createChart(container, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#9ca3af",
            },
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.03)" },
                horzLines: { color: "rgba(255, 255, 255, 0.03)" },
            },
            width: container.clientWidth,
            height: container.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: timeFrame === "1m",
                borderColor: "rgba(255, 255, 255, 0.1)",
                rightOffset: 5,
                barSpacing: 8,
            },
            rightPriceScale: {
                borderColor: "rgba(255, 255, 255, 0.1)",
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    color: "rgba(0, 255, 136, 0.3)",
                    style: 2,
                    labelBackgroundColor: "#1a1a2e",
                },
                horzLine: {
                    color: "rgba(0, 255, 136, 0.3)",
                    style: 2,
                    labelBackgroundColor: "#1a1a2e",
                },
            },
        })

        // Add candlestick series using v3 API
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: "#00ff88",
            downColor: "#ff4757",
            borderUpColor: "#00ff88",
            borderDownColor: "#ff4757",
            wickUpColor: "#00ff88",
            wickDownColor: "#ff4757",
        })

        chartRef.current = chart
        candleSeriesRef.current = candlestickSeries

        // Get candle data
        let candles: CandleData[]
        if (trades && trades.length > 0) {
            candles = tradesToCandles(trades, timeFrame)
        } else {
            candles = generateInitialData(currentPrice, timeFrame)
        }

        candlesRef.current = candles

        if (candles.length > 0) {
            candlestickSeries.setData(candles as CandlestickData<Time>[])
        }

        chart.timeScale().fitContent()
        setIsLoading(false)

        const handleResize = () => {
            if (container) {
                chart.applyOptions({
                    width: container.clientWidth,
                    height: container.clientHeight,
                })
            }
        }

        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
            chart.remove()
        }
    }, [timeFrame, trades, generateInitialData, tradesToCandles, currentPrice])

    // Update on price change
    useEffect(() => {
        if (!candleSeriesRef.current || !currentPrice || isLoading) return

        const interval = getIntervalSeconds(timeFrame)
        const now = Math.floor(Date.now() / 1000)
        const currentCandleTime = Math.floor(now / interval) * interval

        if (candlesRef.current.length === 0) return

        const lastCandle = candlesRef.current[candlesRef.current.length - 1]
        const lastCandleTime = lastCandle.time as number

        if (currentCandleTime > lastCandleTime) {
            // New candle
            const newCandle: CandleData = {
                time: currentCandleTime as Time,
                open: lastCandle.close,
                high: Math.max(lastCandle.close, currentPrice),
                low: Math.min(lastCandle.close, currentPrice),
                close: currentPrice,
            }
            candlesRef.current.push(newCandle)
            candleSeriesRef.current.update(newCandle as CandlestickData<Time>)
        } else {
            // Update current candle
            lastCandle.high = Math.max(lastCandle.high, currentPrice)
            lastCandle.low = Math.min(lastCandle.low, currentPrice)
            lastCandle.close = currentPrice
            candleSeriesRef.current.update(lastCandle as CandlestickData<Time>)
        }
    }, [currentPrice, timeFrame, getIntervalSeconds, isLoading])

    const timeFrameButtons: TimeFrame[] = ["1m", "5m", "15m", "1h", "1d"]

    return (
        <div className="w-full h-full relative flex flex-col bg-black/20">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                {/* Timeframe Selector */}
                <div className="flex items-center gap-1">
                    {timeFrameButtons.map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeFrame(tf)}
                            className={`px-2.5 py-1 text-[10px] font-mono font-medium transition-all ${timeFrame === tf
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "text-gray-500 hover:text-white hover:bg-white/5 border border-transparent"
                            }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>

                {/* Price Display */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-mono">{symbol}/SOL</span>
                    <span className="text-sm font-mono font-bold text-primary">
                        {currentPrice?.toFixed(9) || '0.000000000'}
                    </span>
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 relative min-h-0">
                <div
                    ref={chartContainerRef}
                    className="w-full h-full"
                />

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            Loading chart...
                        </div>
                    </div>
                )}

                {!isLoading && candlesRef.current.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-gray-500 text-sm text-center">
                            No trading data yet
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

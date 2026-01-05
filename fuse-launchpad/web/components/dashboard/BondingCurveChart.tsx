"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createChart, ColorType, ISeriesApi, CandlestickData, Time, IChartApi } from "lightweight-charts"

interface BondingCurveChartProps {
    currentPrice: number
    symbol: string
    mint?: string
}

type TimeFrame = "1s" | "1m" | "5m" | "1h" | "1d"

interface CandleData {
    time: Time
    open: number
    high: number
    low: number
    close: number
}

export function BondingCurveChart({ currentPrice, symbol, mint }: BondingCurveChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
    const candlesRef = useRef<CandleData[]>([])
    const lastCandleTimeRef = useRef<number>(0)

    const [timeFrame, setTimeFrame] = useState<TimeFrame>("1m")
    const [isLoading, setIsLoading] = useState(true)

    // Get interval in seconds for each timeframe
    const getIntervalSeconds = useCallback((tf: TimeFrame): number => {
        switch (tf) {
            case "1s": return 1
            case "1m": return 60
            case "5m": return 300
            case "1h": return 3600
            case "1d": return 86400
            default: return 60
        }
    }, [])

    // Generate initial candle data
    const generateInitialData = useCallback((price: number, tf: TimeFrame): CandleData[] => {
        const interval = getIntervalSeconds(tf)
        const now = Math.floor(Date.now() / 1000)
        const startTime = now - (interval * 50) // 50 candles of history
        const candles: CandleData[] = []

        let currentCandlePrice = price * 0.9 // Start at 90% of current price

        for (let i = 0; i < 50; i++) {
            const candleTime = startTime + (i * interval)
            const volatility = 0.03 // 3% volatility

            // Random walk
            const change = (Math.random() - 0.48) * volatility
            const open = currentCandlePrice
            const close = open * (1 + change)
            const high = Math.max(open, close) * (1 + Math.random() * 0.01)
            const low = Math.min(open, close) * (1 - Math.random() * 0.01)

            candles.push({
                time: candleTime as Time,
                open: open,
                high: high,
                low: low,
                close: close,
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

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#9ca3af",
            },
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.05)" },
                horzLines: { color: "rgba(255, 255, 255, 0.05)" },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: timeFrame === "1s" || timeFrame === "1m",
                borderColor: "rgba(255, 255, 255, 0.1)",
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
                    color: "rgba(255, 255, 255, 0.3)",
                    style: 2,
                    labelBackgroundColor: "#1f2937",
                },
                horzLine: {
                    color: "rgba(255, 255, 255, 0.3)",
                    style: 2,
                    labelBackgroundColor: "#1f2937",
                },
            },
        })

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: "#22c55e",
            downColor: "#ef4444",
            borderUpColor: "#22c55e",
            borderDownColor: "#ef4444",
            wickUpColor: "#22c55e",
            wickDownColor: "#ef4444",
        })

        chartRef.current = chart
        seriesRef.current = candlestickSeries

        // Generate initial data
        const initialData = generateInitialData(currentPrice, timeFrame)
        candlesRef.current = initialData
        candlestickSeries.setData(initialData as CandlestickData<Time>[])

        if (initialData.length > 0) {
            lastCandleTimeRef.current = initialData[initialData.length - 1].time as number
        }

        chart.timeScale().fitContent()
        setIsLoading(false)

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                })
            }
        }

        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
            chart.remove()
        }
    }, [timeFrame, generateInitialData])

    // Update Data on Price Change
    useEffect(() => {
        if (!seriesRef.current || !currentPrice || isLoading) return

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
            seriesRef.current.update(newCandle as CandlestickData<Time>)
        } else {
            // Update current candle
            lastCandle.high = Math.max(lastCandle.high, currentPrice)
            lastCandle.low = Math.min(lastCandle.low, currentPrice)
            lastCandle.close = currentPrice
            seriesRef.current.update(lastCandle as CandlestickData<Time>)
        }
    }, [currentPrice, timeFrame, getIntervalSeconds, isLoading])

    // Timeframe buttons
    const timeFrameButtons: TimeFrame[] = ["1s", "1m", "5m", "1h", "1d"]

    return (
        <div className="w-full h-full relative group flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                {/* Timeframe Selector */}
                <div className="flex items-center gap-1">
                    {timeFrameButtons.map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeFrame(tf)}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeFrame === tf
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>

                {/* Price Display */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{symbol}/SOL</span>
                    <span className={`text-sm font-mono font-bold ${candlesRef.current.length > 1 &&
                            candlesRef.current[candlesRef.current.length - 1]?.close > candlesRef.current[candlesRef.current.length - 2]?.close
                            ? "text-green-400"
                            : "text-red-400"
                        }`}>
                        {currentPrice.toFixed(9)}
                    </span>
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 relative">
                <div
                    ref={chartContainerRef}
                    className="w-full h-full"
                />

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="text-gray-400 text-sm">Loading chart...</div>
                    </div>
                )}
            </div>

            {/* TradingView Watermark */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 opacity-50 pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 36 28" fill="currentColor" className="text-gray-500">
                    <path d="M14 22H7V11H0V4h14v18zM28 22h-8l7.5-18h8L28 22z" />
                </svg>
            </div>
        </div>
    )
}

"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
    createChart,
    ColorType,
    ISeriesApi,
    CandlestickData,
    Time,
    IChartApi,
    CandlestickSeries,
    HistogramSeries,
    LineSeries
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

type TimeFrame = "1m" | "5m" | "15m" | "1h" | "4h" | "1d"

interface CandleData {
    time: Time
    open: number
    high: number
    low: number
    close: number
    volume?: number
}

export function BondingCurveChart({ currentPrice, symbol, mint, trades = [] }: BondingCurveChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
    const ma7SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
    const ma25SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
    const candlesRef = useRef<CandleData[]>([])

    const [timeFrame, setTimeFrame] = useState<TimeFrame>("1m")
    const [isLoading, setIsLoading] = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showMA, setShowMA] = useState(true)
    const [showVolume, setShowVolume] = useState(true)
    const [hoverData, setHoverData] = useState<{
        time: string
        open: number
        high: number
        low: number
        close: number
        volume: number
        change: number
    } | null>(null)

    // Get interval in seconds for each timeframe
    const getIntervalSeconds = useCallback((tf: TimeFrame): number => {
        switch (tf) {
            case "1m": return 60
            case "5m": return 300
            case "15m": return 900
            case "1h": return 3600
            case "4h": return 14400
            case "1d": return 86400
            default: return 60
        }
    }, [])

    // Calculate moving average
    const calculateMA = (data: CandleData[], period: number): { time: Time; value: number }[] => {
        const result: { time: Time; value: number }[] = []
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0
            for (let j = 0; j < period; j++) {
                sum += data[i - j].close
            }
            result.push({
                time: data[i].time,
                value: sum / period
            })
        }
        return result
    }

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
                    volume: trade.volume
                })
            } else {
                const candle = candleMap.get(candleTime)!
                candle.high = Math.max(candle.high, trade.price)
                candle.low = Math.min(candle.low, trade.price)
                candle.close = trade.price
                candle.volume = (candle.volume || 0) + trade.volume
            }
        })

        return Array.from(candleMap.values()).sort((a, b) => (a.time as number) - (b.time as number))
    }, [getIntervalSeconds])

    // Generate initial data (when no real trades)
    const generateInitialData = useCallback((price: number, tf: TimeFrame): CandleData[] => {
        // If we have no price, show empty chart
        if (!price || price === 0) return []

        const interval = getIntervalSeconds(tf)
        const now = Math.floor(Date.now() / 1000)
        const startTime = now - (interval * 100) // 100 candles of history
        const candles: CandleData[] = []

        let currentCandlePrice = price * 0.85 // Start at 85% of current price

        for (let i = 0; i < 100; i++) {
            const candleTime = startTime + (i * interval)

            // More realistic volatility based on timeframe
            const baseVolatility = tf === "1d" ? 0.08 : tf === "4h" ? 0.04 : tf === "1h" ? 0.025 : 0.015
            const trendBias = 0.001 // Slight upward bias

            const change = (Math.random() - 0.48 + trendBias) * baseVolatility
            const open = currentCandlePrice
            const close = open * (1 + change)
            const wickSize = Math.random() * 0.005
            const high = Math.max(open, close) * (1 + wickSize)
            const low = Math.min(open, close) * (1 - wickSize)

            // Random volume
            const baseVolume = 1000 + Math.random() * 5000
            const volumeSpike = Math.random() > 0.9 ? 3 : 1

            candles.push({
                time: candleTime as Time,
                open,
                high,
                low,
                close,
                volume: baseVolume * volumeSpike
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
                minBarSpacing: 4,
            },
            rightPriceScale: {
                borderColor: "rgba(255, 255, 255, 0.1)",
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2,
                },
                autoScale: true,
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
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: false,
            },
        })

        // Add volume series first (so it's behind candles)
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: 'volume',
        })

        chart.priceScale('volume').applyOptions({
            scaleMargins: {
                top: 0.85,
                bottom: 0,
            },
        })

        // Add candlestick series
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#00ff88",
            downColor: "#ff4757",
            borderUpColor: "#00ff88",
            borderDownColor: "#ff4757",
            wickUpColor: "#00ff88",
            wickDownColor: "#ff4757",
        })

        // Add MA lines
        const ma7Series = chart.addSeries(LineSeries, {
            color: '#ffd93d',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        })

        const ma25Series = chart.addSeries(LineSeries, {
            color: '#6c5ce7',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        })

        chartRef.current = chart
        candleSeriesRef.current = candlestickSeries
        volumeSeriesRef.current = volumeSeries
        ma7SeriesRef.current = ma7Series
        ma25SeriesRef.current = ma25Series

        // Get candle data
        let candles: CandleData[]
        if (trades && trades.length > 0) {
            candles = tradesToCandles(trades, timeFrame)
        } else {
            candles = generateInitialData(currentPrice, timeFrame)
        }

        candlesRef.current = candles

        if (candles.length > 0) {
            // Set candle data
            candlestickSeries.setData(candles as CandlestickData<Time>[])

            // Set volume data
            const volumeData = candles.map(c => ({
                time: c.time,
                value: c.volume || 0,
                color: c.close >= c.open ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 71, 87, 0.3)'
            }))
            volumeSeries.setData(volumeData)

            // Set MA data
            if (showMA) {
                const ma7Data = calculateMA(candles, 7)
                const ma25Data = calculateMA(candles, 25)
                ma7Series.setData(ma7Data)
                ma25Series.setData(ma25Data)
            }
        }

        chart.timeScale().fitContent()
        setIsLoading(false)

        // Crosshair move handler for hover data
        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.seriesData) {
                setHoverData(null)
                return
            }

            const candleData = param.seriesData.get(candlestickSeries) as CandlestickData<Time> | undefined
            if (candleData) {
                const date = new Date((param.time as number) * 1000)
                const prevCandle = candlesRef.current.find(c => c.time === param.time)
                const idx = candlesRef.current.findIndex(c => c.time === param.time)
                const prevClose = idx > 0 ? candlesRef.current[idx - 1].close : candleData.open
                const change = ((candleData.close - prevClose) / prevClose) * 100

                setHoverData({
                    time: date.toLocaleString(),
                    open: candleData.open,
                    high: candleData.high,
                    low: candleData.low,
                    close: candleData.close,
                    volume: prevCandle?.volume || 0,
                    change
                })
            }
        })

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
    }, [timeFrame, trades, showMA, showVolume, generateInitialData, tradesToCandles, currentPrice])

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
                volume: 0
            }
            candlesRef.current.push(newCandle)
            candleSeriesRef.current.update(newCandle as CandlestickData<Time>)

            // Update volume
            if (volumeSeriesRef.current) {
                volumeSeriesRef.current.update({
                    time: currentCandleTime as Time,
                    value: 0,
                    color: currentPrice >= lastCandle.close ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 71, 87, 0.3)'
                })
            }
        } else {
            // Update current candle
            lastCandle.high = Math.max(lastCandle.high, currentPrice)
            lastCandle.low = Math.min(lastCandle.low, currentPrice)
            lastCandle.close = currentPrice
            candleSeriesRef.current.update(lastCandle as CandlestickData<Time>)
        }
    }, [currentPrice, timeFrame, getIntervalSeconds, isLoading])

    // Toggle fullscreen
    const toggleFullscreen = () => {
        if (!chartContainerRef.current) return

        if (!isFullscreen) {
            chartContainerRef.current.parentElement?.requestFullscreen()
        } else {
            document.exitFullscreen()
        }
        setIsFullscreen(!isFullscreen)
    }

    // Timeframe buttons
    const timeFrameButtons: TimeFrame[] = ["1m", "5m", "15m", "1h", "4h", "1d"]

    return (
        <div className={`w-full h-full relative group flex flex-col bg-black/20 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-black/40">
                {/* Left: Timeframe Selector */}
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

                {/* Center: Indicators */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowMA(!showMA)}
                        className={`px-2 py-1 text-[10px] font-mono transition-all border ${showMA
                            ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
                            : "text-gray-500 border-transparent hover:text-white"
                        }`}
                    >
                        MA
                    </button>
                    <button
                        onClick={() => setShowVolume(!showVolume)}
                        className={`px-2 py-1 text-[10px] font-mono transition-all border ${showVolume
                            ? "text-blue-400 border-blue-400/30 bg-blue-400/10"
                            : "text-gray-500 border-transparent hover:text-white"
                        }`}
                    >
                        VOL
                    </button>
                </div>

                {/* Right: Price & Controls */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-mono">{symbol}/SOL</span>
                        <span className={`text-sm font-mono font-bold ${
                            candlesRef.current.length > 1 &&
                            candlesRef.current[candlesRef.current.length - 1]?.close > candlesRef.current[candlesRef.current.length - 2]?.close
                                ? "text-primary"
                                : "text-red-400"
                        }`}>
                            {currentPrice?.toFixed(9) || '0.000000000'}
                        </span>
                    </div>
                    <button
                        onClick={toggleFullscreen}
                        className="p-1 text-gray-500 hover:text-white transition-colors"
                        title="Toggle fullscreen"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {isFullscreen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Hover Data Overlay */}
            {hoverData && (
                <div className="absolute top-12 left-3 z-10 bg-black/80 border border-white/10 p-2 text-[10px] font-mono space-y-1">
                    <div className="text-gray-400">{hoverData.time}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        <span className="text-gray-500">O:</span>
                        <span className="text-white">{hoverData.open.toFixed(9)}</span>
                        <span className="text-gray-500">H:</span>
                        <span className="text-primary">{hoverData.high.toFixed(9)}</span>
                        <span className="text-gray-500">L:</span>
                        <span className="text-red-400">{hoverData.low.toFixed(9)}</span>
                        <span className="text-gray-500">C:</span>
                        <span className="text-white">{hoverData.close.toFixed(9)}</span>
                    </div>
                    <div className={`${hoverData.change >= 0 ? 'text-primary' : 'text-red-400'}`}>
                        {hoverData.change >= 0 ? '+' : ''}{hoverData.change.toFixed(2)}%
                    </div>
                </div>
            )}

            {/* MA Legend */}
            {showMA && (
                <div className="absolute top-12 right-3 z-10 flex items-center gap-3 text-[10px] font-mono">
                    <span className="text-yellow-400">MA7</span>
                    <span className="text-purple-400">MA25</span>
                </div>
            )}

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

                {/* No data message */}
                {!isLoading && candlesRef.current.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-gray-500 text-sm text-center">
                            <div className="text-2xl mb-2">📊</div>
                            No trading data yet
                            <div className="text-xs text-gray-600 mt-1">Chart will update when trades occur</div>
                        </div>
                    </div>
                )}
            </div>

            {/* TradingView Watermark */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 opacity-30 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 36 28" fill="currentColor" className="text-gray-500">
                    <path d="M14 22H7V11H0V4h14v18zM28 22h-8l7.5-18h8L28 22z" />
                </svg>
                <span className="text-[9px] text-gray-500 font-mono">TradingView</span>
            </div>
        </div>
    )
}

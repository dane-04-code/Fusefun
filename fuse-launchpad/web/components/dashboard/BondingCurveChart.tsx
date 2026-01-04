"use client"

import { useEffect, useRef } from "react"
import { createChart, ColorType, ISeriesApi } from "lightweight-charts"

interface BondingCurveChartProps {
    currentPrice: number
    symbol: string
}

export function BondingCurveChart({ currentPrice, symbol }: BondingCurveChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<any>(null)
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null)

    // Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#D9D9D9",
            },
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.05)" },
                horzLines: { color: "rgba(255, 255, 255, 0.05)" },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
            },
            rightPriceScale: {
                borderColor: "rgba(255, 255, 255, 0.1)",
            },
        })

        const areaSeries = chart.addAreaSeries({
            lineColor: "#22c55e", // Green line
            topColor: "rgba(34, 197, 94, 0.4)", // Green gradient
            bottomColor: "rgba(34, 197, 94, 0.0)",
            lineWidth: 2,
        })

        chartRef.current = chart
        seriesRef.current = areaSeries

        // Initial data point
        const now = Math.floor(Date.now() / 1000)
        areaSeries.setData([
            { time: (now - 60) as any, value: currentPrice * 0.98 }, // Fake history point 1
            { time: (now - 30) as any, value: currentPrice * 0.99 }, // Fake history point 2
            { time: now as any, value: currentPrice },
        ])

        chart.timeScale().fitContent()

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth })
            }
        }

        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
            chart.remove()
        }
    }, [])

    // Update Data on Price Change
    useEffect(() => {
        if (seriesRef.current && currentPrice) {
            const now = Math.floor(Date.now() / 1000)
            seriesRef.current.update({
                time: now as any,
                value: currentPrice,
            })
        }
    }, [currentPrice])

    return (
        <div className="w-full h-full relative group">
            <div
                ref={chartContainerRef}
                className="w-full h-full"
            />

            {/* Chart Header Overlay */}
            <div className="absolute top-4 left-4 flex flex-col pointer-events-none">
                <span className="text-sm text-muted-foreground">{symbol}/SOL</span>
                <span className="text-3xl font-bold font-mono text-green-500">
                    {currentPrice.toFixed(9)}
                </span>
            </div>
        </div>
    )
}

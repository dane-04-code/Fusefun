/**
 * FUSE.FUN Chart Integration
 * 
 * Integrates TradingView Lightweight Charts with the API
 * Provides real-time chart updates and trade indicators
 */

class FuseChartManager {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.chart = null;
        this.candleSeries = null;
        this.volumeSeries = null;
        this.currentMint = null;
        this.unsubscribe = null;
        this.interval = options.interval || '1m';
        
        // Theme colors
        this.colors = {
            background: '#0d0d0d',
            text: '#a3a3a3',
            grid: '#1f1f1f',
            upColor: '#00FFA3',
            downColor: '#FF5555',
            volumeUp: 'rgba(0, 255, 163, 0.3)',
            volumeDown: 'rgba(255, 85, 85, 0.3)'
        };
    }

    /**
     * Initialize the chart
     */
    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Chart container not found:', this.containerId);
            return;
        }

        // Check if LightweightCharts is available
        if (typeof LightweightCharts === 'undefined') {
            console.error('TradingView Lightweight Charts library not loaded');
            return;
        }

        // Create chart
        this.chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight || 400,
            layout: {
                background: { type: 'solid', color: this.colors.background },
                textColor: this.colors.text
            },
            grid: {
                vertLines: { color: this.colors.grid },
                horzLines: { color: this.colors.grid }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal
            },
            rightPriceScale: {
                borderColor: this.colors.grid,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2
                }
            },
            timeScale: {
                borderColor: this.colors.grid,
                timeVisible: true,
                secondsVisible: false
            },
            handleScroll: {
                vertTouchDrag: false
            }
        });

        // Create candlestick series
        this.candleSeries = this.chart.addCandlestickSeries({
            upColor: this.colors.upColor,
            downColor: this.colors.downColor,
            borderUpColor: this.colors.upColor,
            borderDownColor: this.colors.downColor,
            wickUpColor: this.colors.upColor,
            wickDownColor: this.colors.downColor
        });

        // Create volume series
        this.volumeSeries = this.chart.addHistogramSeries({
            color: this.colors.volumeUp,
            priceFormat: {
                type: 'volume'
            },
            priceScaleId: '',
            scaleMargins: {
                top: 0.8,
                bottom: 0
            }
        });

        // Handle resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Observe container size changes
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.handleResize());
            this.resizeObserver.observe(container);
        }

        return this;
    }

    /**
     * Handle container resize
     */
    handleResize() {
        const container = document.getElementById(this.containerId);
        if (container && this.chart) {
            this.chart.applyOptions({
                width: container.clientWidth,
                height: container.clientHeight || 400
            });
        }
    }

    /**
     * Load chart data for a token
     */
    async loadToken(mint) {
        if (this.currentMint === mint) return;
        
        // Unsubscribe from previous token
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.currentMint = mint;

        try {
            // Fetch historical data
            const candles = await window.fuseAPI.getChartData(mint, this.interval);
            
            if (candles && candles.length > 0) {
                // Update candlestick series
                this.candleSeries.setData(candles.map(c => ({
                    time: c.time,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close
                })));

                // Update volume series with color based on price direction
                this.volumeSeries.setData(candles.map(c => ({
                    time: c.time,
                    value: c.volume,
                    color: c.close >= c.open ? this.colors.volumeUp : this.colors.volumeDown
                })));

                // Fit content
                this.chart.timeScale().fitContent();
            } else {
                // No data - show empty chart
                this.candleSeries.setData([]);
                this.volumeSeries.setData([]);
            }

            // Subscribe to real-time updates
            this.subscribeToUpdates(mint);

        } catch (error) {
            console.error('Failed to load chart data:', error);
        }
    }

    /**
     * Subscribe to real-time trade updates
     */
    subscribeToUpdates(mint) {
        if (!window.fuseAPI) return;

        this.unsubscribe = window.fuseAPI.subscribe(mint, (trade) => {
            this.handleTradeUpdate(trade);
        });
    }

    /**
     * Handle incoming trade update
     */
    handleTradeUpdate(trade) {
        const price = trade.solAmount / trade.tokenAmount;
        const time = Math.floor(trade.timestamp / 1000);
        
        // Get interval duration in seconds
        const intervalSeconds = this.getIntervalSeconds();
        const candleTime = Math.floor(time / intervalSeconds) * intervalSeconds;

        // Update candlestick
        this.candleSeries.update({
            time: candleTime,
            open: price,
            high: price,
            low: price,
            close: price
        });

        // Update volume
        this.volumeSeries.update({
            time: candleTime,
            value: trade.solAmount,
            color: trade.type === 'buy' ? this.colors.volumeUp : this.colors.volumeDown
        });

        // Add trade marker
        this.addTradeMarker(trade, candleTime, price);
    }

    /**
     * Add a marker for a trade
     */
    addTradeMarker(trade, time, price) {
        const markers = this.candleSeries.markers() || [];
        
        // Limit markers to avoid performance issues
        if (markers.length > 50) {
            markers.shift();
        }

        markers.push({
            time: time,
            position: trade.type === 'buy' ? 'belowBar' : 'aboveBar',
            color: trade.type === 'buy' ? this.colors.upColor : this.colors.downColor,
            shape: trade.type === 'buy' ? 'arrowUp' : 'arrowDown',
            text: `${trade.type === 'buy' ? 'B' : 'S'} ${trade.solAmount.toFixed(2)}`
        });

        this.candleSeries.setMarkers(markers);
    }

    /**
     * Get interval duration in seconds
     */
    getIntervalSeconds() {
        const intervals = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '1h': 3600,
            '4h': 14400,
            '1d': 86400
        };
        return intervals[this.interval] || 60;
    }

    /**
     * Change chart interval
     */
    setInterval(interval) {
        if (this.interval === interval) return;
        
        this.interval = interval;
        
        if (this.currentMint) {
            this.loadToken(this.currentMint);
        }
    }

    /**
     * Add a price line
     */
    addPriceLine(price, title, color) {
        return this.candleSeries.createPriceLine({
            price: price,
            color: color || this.colors.upColor,
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            axisLabelVisible: true,
            title: title
        });
    }

    /**
     * Remove all price lines
     */
    clearPriceLines() {
        // Note: Lightweight Charts doesn't have a direct method to remove all price lines
        // You'd need to track them and remove individually
    }

    /**
     * Take screenshot of chart
     */
    takeScreenshot() {
        if (!this.chart) return null;
        return this.chart.takeScreenshot();
    }

    /**
     * Destroy the chart
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
        }
        
        window.removeEventListener('resize', this.handleResize);
    }
}

/**
 * Create and mount chart with interval controls
 */
function createFuseChart(containerId, mint) {
    const manager = new FuseChartManager(containerId);
    manager.init();
    
    if (mint) {
        manager.loadToken(mint);
    }
    
    return manager;
}

// Export
window.FuseChartManager = FuseChartManager;
window.createFuseChart = createFuseChart;

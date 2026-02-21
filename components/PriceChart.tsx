"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export function PriceChart() {
    const [chartData, setChartData] = useState<ChartData<"line"> | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [priceChange, setPriceChange] = useState<number | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await axios.get(
                    "https://api.coingecko.com/api/v3/coins/stellar/market_chart?vs_currency=usd&days=30&interval=daily"
                );

                const prices: number[][] = res.data.prices;
                if (!prices || prices.length === 0) return;

                const firstPrice = prices[0][1];
                const lastPrice = prices[prices.length - 1][1];
                setCurrentPrice(lastPrice);
                setPriceChange(((lastPrice - firstPrice) / firstPrice) * 100);

                setChartData({
                    labels: prices.map((p: number[]) =>
                        moment.unix(p[0] / 1000).format("MMM DD")
                    ),
                    datasets: [
                        {
                            label: "XLM/USD",
                            data: prices.map((p: number[]) => p[1]),
                            borderColor: "#3b82f6",
                            backgroundColor: (context) => {
                                const ctx = context.chart.ctx;
                                const gradient = ctx.createLinearGradient(0, 0, 0, 250);
                                gradient.addColorStop(0, "rgba(59, 130, 246, 0.3)");
                                gradient.addColorStop(1, "rgba(59, 130, 246, 0)");
                                return gradient;
                            },
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 5,
                            pointHoverBackgroundColor: "#3b82f6",
                            pointHoverBorderColor: "#fff",
                            pointHoverBorderWidth: 2,
                            tension: 0.4,
                            fill: true,
                        },
                    ],
                });
            } catch (e) {
                console.error("Failed to fetch XLM price data", e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const options: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false,
        },
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
            tooltip: {
                backgroundColor: "rgba(24, 24, 27, 0.95)",
                titleColor: "#a1a1aa",
                bodyColor: "#fff",
                borderColor: "rgba(63, 63, 70, 0.5)",
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                titleFont: { size: 11 },
                bodyFont: { size: 14, weight: "bold" },
                callbacks: {
                    label: (ctx) => `$${(ctx.parsed.y ?? 0).toFixed(4)}`,
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: "#52525b",
                    font: { size: 10 },
                    maxTicksLimit: 7,
                },
                border: {
                    display: false,
                },
            },
            y: {
                grid: {
                    color: "rgba(63, 63, 70, 0.2)",
                },
                ticks: {
                    color: "#52525b",
                    font: { size: 10 },
                    callback: (value) => `$${Number(value).toFixed(3)}`,
                },
                border: {
                    display: false,
                },
            },
        },
    };

    return (
        <div className="bg-zinc-950/80 backdrop-blur-3xl border border-zinc-800/50 rounded-3xl p-4 sm:p-6 w-full max-w-[480px] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <img
                        src="https://cryptologos.cc/logos/stellar-xlm-logo.png"
                        alt="XLM"
                        className="w-8 h-8 rounded-full"
                    />
                    <div>
                        <h3 className="text-white font-semibold text-sm">Stellar Lumens</h3>
                        <span className="text-zinc-500 text-xs">XLM / USD</span>
                    </div>
                </div>
                <div className="text-right">
                    {currentPrice !== null ? (
                        <>
                            <p className="text-white font-semibold text-lg">
                                ${currentPrice.toFixed(4)}
                            </p>
                            {priceChange !== null && (
                                <span
                                    className={`text-xs font-medium ${priceChange >= 0 ? "text-emerald-400" : "text-red-400"
                                        }`}
                                >
                                    {priceChange >= 0 ? "+" : ""}
                                    {priceChange.toFixed(2)}% (30d)
                                </span>
                            )}
                        </>
                    ) : (
                        <div className="w-16 h-6 bg-zinc-800 rounded animate-pulse" />
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="h-[200px] relative">
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : chartData ? (
                    <Line data={chartData} options={options} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
                        Failed to load chart data
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                <span>30-Day Price History</span>
                <span>Source: CoinGecko</span>
            </div>
        </div>
    );
}

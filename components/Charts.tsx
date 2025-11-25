import React, { FC, useMemo } from 'react';
import { getStatusColor, formatCurrency } from '../lib';

export const StatusBarChart: FC<{ data: { name: string; count: number; totalForecast: number; totalMargin: number; }[] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="chart-container">
            {total > 0 ? (
                <>
                    <div className="bar-chart-header">
                        <span>Status</span>
                        <span>#</span>
                        <span style={{ gridColumn: '3 / 4' }}></span> {/* Empty for bar */}
                        <span className="header-value">Forecast $</span>
                        <span className="header-value">Margin $</span>
                    </div>
                    <div className="bar-chart">
                        {data.map(({ name, count, totalForecast, totalMargin }) => {
                            const percentage = total > 0 ? (count / total) * 100 : 0;
                            return (
                                <div className="bar-row" key={name}>
                                    <div className="bar-label">{name}</div>
                                    <div className="bar-value">{count}</div>
                                    <div className="bar-wrapper">
                                        <div 
                                            className="bar-fill" 
                                            style={{ width: `${percentage}%`, backgroundColor: getStatusColor(name) }}
                                            title={`${count} opportunities (${percentage.toFixed(1)}%)`}
                                        ></div>
                                    </div>
                                    <div className="bar-financial-value">{formatCurrency(totalForecast)}</div>
                                    <div className="bar-financial-value">{formatCurrency(totalMargin)}</div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <p className="no-data-message">No active opportunities to display in the funnel.</p>
            )}
        </div>
    );
};

export const BarChart: FC<{
    data: { month: string; onboarded: number; terminated: number }[];
}> = ({ data }) => {
    const maxValue = useMemo(() => {
        const max = Math.max(...data.flatMap(d => [d.onboarded, d.terminated]));
        return Math.ceil(max / 10) * 10 || 10; // Round up to nearest 10, default to 10
    }, [data]);

    return (
        <div className="bar-chart-vertical-container">
            <div className="bar-chart-y-axis">
                <span>{maxValue}</span>
                <span>{maxValue * 0.75}</span>
                <span>{maxValue * 0.5}</span>
                <span>{maxValue * 0.25}</span>
                <span>0</span>
            </div>
            <div className="bar-chart-bars-area">
                {data.map(item => (
                    <div key={item.month} className="bar-chart-group">
                        <div className="bar-wrapper-vertical" title={`Onboarded: ${item.onboarded}`}>
                            <div className="bar-fill-vertical onboarded" style={{ height: `${(item.onboarded / maxValue) * 100}%` }}></div>
                        </div>
                        <div className="bar-wrapper-vertical" title={`Terminated: ${item.terminated}`}>
                            <div className="bar-fill-vertical terminated" style={{ height: `${(item.terminated / maxValue) * 100}%` }}></div>
                        </div>
                        <div className="bar-chart-x-axis-label">{item.month}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FUNNEL_CHART_COLORS = ['#6D28D9', '#F5A623', '#10B981', '#EF4444', '#3B82F6', '#8B5CF6', '#F97316'];
export const FunnelChart: FC<{ data: { name: string; count: number }[]; useStatusColor?: boolean }> = ({ data, useStatusColor = false }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="funnel-chart-container">
            {total > 0 ? (
                <div className="funnel-chart">
                    {data.map(({ name, count }, index) => {
                        const percentage = total > 0 ? (count / total) * 100 : 0;
                        const color = useStatusColor ? getStatusColor(name) : FUNNEL_CHART_COLORS[index % FUNNEL_CHART_COLORS.length];
                        return (
                            <div className="funnel-row" key={name}>
                                <div className="funnel-label">{name}</div>
                                <div className="funnel-bar-wrapper">
                                    <div 
                                        className="funnel-bar-fill" 
                                        style={{ width: `${percentage}%`, backgroundColor: color }}
                                        title={`${count} drivers (${percentage.toFixed(1)}%)`}
                                    ></div>
                                </div>
                                <div className="funnel-value">{count}</div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="no-data-message">No driver data to display in the funnel.</p>
            )}
        </div>
    );
};


import React, { FC, useMemo, useCallback, useState } from 'react';
import { Prospect, Contact, DropdownOption, ProspectRoute, ProspectRouteDriver } from '../types';
import { 
    StatCard, formatCurrency, formatDate, safeGetDealValue, 
    getMarginPct, safeParseFloat, getStatusColor 
} from '../lib';
import { StatusBarChart, BarChart, FunnelChart } from './Charts';

export const DashboardView: FC<{ prospects: Prospect[]; contacts: Contact[]; statusOptions: DropdownOption[] }> = ({ prospects, contacts, statusOptions }) => {
    const prospectsWithLatestContact = useMemo(() => {
        return prospects.map(p => {
            const prospectContacts = contacts
                .filter(c => c.prospect_id === p.id)
                .sort((a, b) => {
                    const dateA = new Date(a.contact_date || '1970-01-01').getTime();
                    const dateB = new Date(b.contact_date || '1970-01-01').getTime();
                    if (dateB !== dateA) return dateB - dateA;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
            return { prospect: p, latestContact: prospectContacts[0] };
        });
    }, [prospects, contacts]);

    const activeProspectsWithLatestContact = useMemo(() => {
        return prospectsWithLatestContact.filter(item => item.latestContact && !['Won', 'Lost'].includes(item.latestContact.status));
    }, [prospectsWithLatestContact]);

    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);

    const wonIn12MoPeriod = useMemo(() => {
        return prospectsWithLatestContact
            .filter(p => 
                p.latestContact?.status === 'Won' && 
                p.latestContact.actual_close_date && 
                new Date(p.latestContact.actual_close_date + 'T00:00:00').getTime() >= startDate.getTime() && 
                new Date(p.latestContact.actual_close_date + 'T00:00:00').getTime() <= endDate.getTime()
            )
            .map(p => p.latestContact!);
    }, [prospectsWithLatestContact, startDate, endDate]);

    const totalWonForecast12Mo = useMemo(() => {
        return wonIn12MoPeriod.reduce((sum, c) => sum + safeParseFloat(c.forecast), 0);
    }, [wonIn12MoPeriod]);

    const totalWonMargin12Mo = useMemo(() => {
        return wonIn12MoPeriod.reduce((sum, c) => {
            const forecast = safeParseFloat(c.forecast);
            const gm = getMarginPct(c) / 100;
            return sum + (forecast * gm);
        }, 0);
    }, [wonIn12MoPeriod]);
    
    const totalWonValue12Mo = useMemo(() => {
        return wonIn12MoPeriod.reduce((sum, c) => sum + safeGetDealValue(c), 0);
    }, [wonIn12MoPeriod]);

    const totalWonMarginValue12Mo = useMemo(() => {
        return wonIn12MoPeriod.reduce((sum, c) => {
            const value = safeGetDealValue(c);
            const gm = getMarginPct(c) / 100;
            return sum + (value * gm);
        }, 0);
    }, [wonIn12MoPeriod]);

    const wonMarginPct12Mo = totalWonForecast12Mo > 0 ? (Number(totalWonMargin12Mo) / Number(totalWonForecast12Mo)) * 100 : 0;
    const wonMarginValuePct12Mo = totalWonValue12Mo > 0 ? (Number(totalWonMarginValue12Mo) / Number(totalWonValue12Mo)) * 100 : 0;

    const salesFunnelData = useMemo(() => {
        const statusAggregates = activeProspectsWithLatestContact.reduce((acc, { latestContact }) => {
            if (latestContact) {
                const status = latestContact.status;
                if (!acc[status]) {
                    acc[status] = { count: 0, totalForecast: 0, totalMargin: 0 };
                }
                acc[status].count += 1;
                acc[status].totalForecast += safeParseFloat(latestContact.forecast);
                acc[status].totalMargin += safeParseFloat(latestContact.forecast) * (safeParseFloat(latestContact.gross_margin) / 100);
            }
            return acc;
        }, {} as { [key: string]: { count: number; totalForecast: number; totalMargin: number } });

        return statusOptions
            .filter(opt => !['Won', 'Lost'].includes(opt.name))
            .map(option => ({
                name: option.name,
                count: statusAggregates[option.name]?.count || 0,
                totalForecast: statusAggregates[option.name]?.totalForecast || 0,
                totalMargin: statusAggregates[option.name]?.totalMargin || 0,
            }));
    }, [activeProspectsWithLatestContact, statusOptions]);

    const upcomingDeadlines = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deadlines = activeProspectsWithLatestContact.flatMap(({ prospect, latestContact }) => {
            const events: { type: string; date: string; prospectName: string }[] = [];
            if (latestContact) {
                if (latestContact.quote_due_date && new Date(latestContact.quote_due_date + 'T00:00:00').getTime() >= today.getTime()) {
                    events.push({ type: 'Quote Due', date: latestContact.quote_due_date, prospectName: prospect.name });
                }
                if (latestContact.expected_closing && new Date(latestContact.expected_closing + 'T00:00:00').getTime() >= today.getTime()) {
                    events.push({ type: 'Exp. Closing', date: latestContact.expected_closing, prospectName: prospect.name });
                }
            }
            return events;
        });

        return deadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);
    }, [activeProspectsWithLatestContact]);

    const topProspects = useMemo(() => {
        return [...activeProspectsWithLatestContact]
            .filter(p => p.latestContact)
            .sort((a, b) => b.latestContact!.forecast - a.latestContact!.forecast)
            .slice(0, 5)
            .map(({ prospect, latestContact }) => ({
                name: prospect.name,
                forecast: latestContact!.forecast,
                status: latestContact!.status,
                marginAmount: latestContact!.forecast * (latestContact!.gross_margin / 100),
            }));
    }, [activeProspectsWithLatestContact]);

    return (
        <div className="dashboard-grid">
            <div className="dashboard-kpis">
                <StatCard title="Forecast$( 12 mon)" value={formatCurrency(totalWonForecast12Mo)} />
                <StatCard title="Forecast Margin(12 Mo)" value={`${formatCurrency(totalWonMargin12Mo)} (${wonMarginPct12Mo.toFixed(0)}%)`} />
                <StatCard title="Final Forecast $ Won(12 mo)" value={formatCurrency(totalWonValue12Mo)} />
                <StatCard title="Final Forecast Margin Won(12 mo)" value={`${formatCurrency(totalWonMarginValue12Mo)} (${wonMarginValuePct12Mo.toFixed(0)}%)`} />
            </div>
            <div className="dashboard-widget">
                <h3>Sales Funnel</h3>
                <StatusBarChart data={salesFunnelData}/>
            </div>
            <div className="dashboard-widget">
                <h3>Upcoming Deadlines</h3>
                {upcomingDeadlines.length > 0 ? (
                    <ul className="dashboard-list">
                        {upcomingDeadlines.map((item, index) => (
                            <li key={index} className="dashboard-list-item">
                                <span>{item.prospectName}</span>
                                <span className="list-item-detail">{item.type}</span>
                                <span className="list-item-value">{formatDate(item.date)}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="no-data-message">No upcoming deadlines.</p>}
            </div>
            <div className="dashboard-widget">
                <h3>Top 5 Opportunities by Forecast</h3>
                 {topProspects.length > 0 ? (
                    <div className="prospect-ranking-table">
                        <div className="prospect-ranking-header">
                            <span className="ranking-name-col">Opportunity</span>
                            <span>Status</span>
                            <span>Forecast</span>
                            <span>Margin $</span>
                        </div>
                        <ul className="dashboard-list">
                            {topProspects.map((item, index) => (
                                <li key={index} className="prospect-ranking-item">
                                    <span className="ranking-name-col">{item.name}</span>
                                    <span><span className="status-badge" style={{ backgroundColor: getStatusColor(item.status) }}>{item.status}</span></span>
                                    <span className="list-item-value">{formatCurrency(item.forecast)}</span>
                                    <span className="list-item-value">{formatCurrency(item.marginAmount)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : <p className="no-data-message">No active opportunities to rank.</p>}
            </div>
        </div>
    );
};

export const MgmtReportView: FC<{ prospects: Prospect[]; contacts: Contact[] }> = ({ prospects, contacts }) => {
    const prospectsWithLatestContact = useMemo(() => {
        return prospects.map(p => {
            const prospectContacts = contacts
                .filter(c => c.prospect_id === p.id)
                .sort((a, b) => {
                    const dateA = new Date(a.contact_date || '1970-01-01').getTime();
                    const dateB = new Date(b.contact_date || '1970-01-01').getTime();
                    if (dateB !== dateA) return dateB - dateA;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
            return { prospect: p, latestContact: prospectContacts[0] };
        });
    }, [prospects, contacts]);

    const { startDate, endDate } = useMemo(() => {
        const allDates = contacts.flatMap(c => [c.actual_close_date, c.expected_closing]).filter(Boolean) as string[];
        const latestDate = allDates.length > 0 
            ? new Date(Math.max(...allDates.map(d => new Date(d + 'T00:00:00').getTime()))) 
            : new Date();
        
        const end = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0);
        const start = new Date(latestDate.getFullYear(), latestDate.getMonth() - 11, 1);
        return { startDate: start, endDate: end };
    }, [contacts]);

    const { wonInPeriod, activeProspects } = useMemo(() => {
        const won = prospectsWithLatestContact.filter(p => 
            p.latestContact?.status === 'Won' && 
            p.latestContact.actual_close_date && 
            new Date(p.latestContact.actual_close_date + 'T00:00:00').getTime() >= startDate.getTime() && 
            new Date(p.latestContact.actual_close_date + 'T00:00:00').getTime() <= endDate.getTime()
        );
        const active = prospectsWithLatestContact.filter(p => p.latestContact && !['Won', 'Lost'].includes(p.latestContact.status));
        return { wonInPeriod: won, activeProspects: active };
    }, [prospectsWithLatestContact, startDate, endDate]);

    const totalActiveForecast = useMemo(() => {
        return activeProspects.reduce((sum, { latestContact }) => {
            return sum + (latestContact ? safeParseFloat(latestContact.forecast) : 0);
        }, 0);
    }, [activeProspects]);

    const totalActiveMargin = useMemo(() => {
        return activeProspects.reduce((sum, { latestContact }) => {
            if (!latestContact) return sum;
            const forecast = safeParseFloat(latestContact.forecast);
            const gm = safeParseFloat(latestContact.gross_margin) / 100;
            return sum + (forecast * gm);
        }, 0);
    }, [activeProspects]);

    const calculateBalanceOfYear = useCallback((forecast: number, expected_closing: string | null | undefined): number => {
        const currentYear = new Date().getFullYear();
        if (!expected_closing || new Date(expected_closing + 'T00:00:00').getFullYear() !== currentYear) {
            return 0;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfYear = new Date(currentYear, 11, 31);

        if (today > endOfYear) return 0;

        const timeDiff = endOfYear.getTime() - today.getTime();
        const daysRemaining = Math.round(timeDiff / (1000 * 60 * 60 * 24)) + 1;
        
        return (forecast / 365) * daysRemaining;
    }, []);
    
    const totalForecastBalOfYear = useMemo(() => {
        return activeProspects.reduce((sum, { latestContact }) => {
            if (!latestContact) return sum;
            const dealValue = safeGetDealValue(latestContact);
            const balance = calculateBalanceOfYear(dealValue, latestContact.expected_closing);
            return sum + balance;
        }, 0);
    }, [activeProspects, calculateBalanceOfYear]);

    const totalMarginBalOfYear = useMemo(() => {
        return activeProspects.reduce((sum, { latestContact }) => {
            if (!latestContact) return sum;
            const dealValue = safeGetDealValue(latestContact);
            const gm = getMarginPct(latestContact) / 100;
            const balance = calculateBalanceOfYear(dealValue, latestContact.expected_closing);
            return sum + (balance * gm);
        }, 0);
    }, [activeProspects, calculateBalanceOfYear]);

    const activeMarginPct = totalActiveForecast > 0 ? (Number(totalActiveMargin) / Number(totalActiveForecast)) * 100 : 0;
    const balOfYearMarginPct = totalForecastBalOfYear > 0 ? (Number(totalMarginBalOfYear) / Number(totalForecastBalOfYear)) * 100 : 0;
    
    const performanceBySource = useMemo(() => {
        const sourceMap = new Map<string, { count: number; value: number }>();
        wonInPeriod.forEach(({ latestContact }) => {
            if (latestContact && latestContact.source) {
                const source = latestContact.source;
                const dealValue = safeGetDealValue(latestContact);
                const current = sourceMap.get(source) || { count: 0, value: 0 };
                current.count += 1;
                current.value += dealValue;
                sourceMap.set(source, current);
            }
        });
        return Array.from(sourceMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.value - a.value);
    }, [wonInPeriod]);

    const top5DealsWon = useMemo(() => {
        return wonInPeriod
            .map(({ prospect, latestContact }) => ({
                name: prospect.name,
                value: latestContact ? safeGetDealValue(latestContact) : 0,
                closeDate: latestContact?.actual_close_date || '',
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [wonInPeriod]);
    
    return (
        <div className="mgmt-report-grid">
            <div className="dashboard-kpis">
                <StatCard title="Forecast - Active" value={`${formatCurrency(totalActiveForecast)}`} />
                <StatCard title="Forecast Margin$ - Active" value={`${formatCurrency(totalActiveMargin)} (${activeMarginPct.toFixed(0)}%)`} />
                <StatCard title="Forecast $ Bal of Year - Active" value={formatCurrency(totalForecastBalOfYear)} />
                <StatCard title="Forecast Margin $ Bal of Year - Active" value={`${formatCurrency(totalMarginBalOfYear)} (${balOfYearMarginPct.toFixed(0)}%)`} />
            </div>
            
            {/* Widgets moved up since table was removed */}
            <div className="dashboard-widget">
                <h3>Performance by Source (Won, 12 Mo)</h3>
                 {performanceBySource.length > 0 ? (
                    <div className="prospect-ranking-table">
                        <div className="mgmt-ranking-header">
                            <span className="ranking-name-col">Source</span>
                            <span># Deals</span>
                            <span>$ Won</span>
                        </div>
                        <ul className="dashboard-list">
                            {performanceBySource.map((item) => (
                                <li key={item.name} className="mgmt-ranking-item">
                                    <span className="ranking-name-col">{item.name}</span>
                                    <span>{item.count}</span>
                                    <span className="list-item-value">{formatCurrency(item.value)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : <p className="no-data-message">No deals won in the last 12 months.</p>}
            </div>
            <div className="dashboard-widget">
                <h3>Top 5 Deals Won (12 Mo)</h3>
                 {top5DealsWon.length > 0 ? (
                    <div className="prospect-ranking-table">
                        <div className="mgmt-ranking-header">
                            <span className="ranking-name-col">Opportunity</span>
                            <span>Close Date</span>
                            <span>$ Won</span>
                        </div>
                        <ul className="dashboard-list">
                            {top5DealsWon.map((item, index) => (
                                <li key={index} className="mgmt-ranking-item">
                                    <span className="ranking-name-col">{item.name}</span>
                                    <span>{formatDate(item.closeDate)}</span>
                                    <span className="list-item-value">{formatCurrency(item.value)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : <p className="no-data-message">No deals won in the last 12 months.</p>}
            </div>
        </div>
    );
};

export const MonthlyPerformanceView: FC<{ prospects: Prospect[]; contacts: Contact[] }> = ({ prospects, contacts }) => {
    const prospectsWithLatestContact = useMemo(() => {
        return prospects.map(p => {
            const prospectContacts = contacts
                .filter(c => c.prospect_id === p.id)
                .sort((a, b) => {
                    const dateA = new Date(a.contact_date || '1970-01-01').getTime();
                    const dateB = new Date(b.contact_date || '1970-01-01').getTime();
                    if (dateB !== dateA) return dateB - dateA;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
            return { prospect: p, latestContact: prospectContacts[0] };
        });
    }, [prospects, contacts]);

    const { startDate, endDate } = useMemo(() => {
        const allDates = contacts.flatMap(c => [c.actual_close_date, c.expected_closing]).filter(Boolean) as string[];
        const latestDate = allDates.length > 0 
            ? new Date(Math.max(...allDates.map(d => new Date(d + 'T00:00:00').getTime()))) 
            : new Date();
        
        const end = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0);
        const start = new Date(latestDate.getFullYear(), latestDate.getMonth() - 11, 1);
        return { startDate: start, endDate: end };
    }, [contacts]);

    const { wonInPeriod, lostInPeriod, activeProspects } = useMemo(() => {
        const won = prospectsWithLatestContact.filter(p => 
            p.latestContact?.status === 'Won' && 
            p.latestContact.actual_close_date && 
            new Date(p.latestContact.actual_close_date + 'T00:00:00').getTime() >= startDate.getTime() && 
            new Date(p.latestContact.actual_close_date + 'T00:00:00').getTime() <= endDate.getTime()
        );
        const lost = prospectsWithLatestContact.filter(p => 
            p.latestContact?.status === 'Lost' && 
            p.latestContact.actual_close_date && 
            new Date(p.latestContact.actual_close_date + 'T00:00:00').getTime() >= startDate.getTime() && 
            new Date(p.latestContact.actual_close_date + 'T00:00:00').getTime() <= endDate.getTime()
        );
        const active = prospectsWithLatestContact.filter(p => p.latestContact && !['Won', 'Lost'].includes(p.latestContact.status));
        return { wonInPeriod: won, lostInPeriod: lost, activeProspects: active };
    }, [prospectsWithLatestContact, startDate, endDate]);

    const calculateBalanceOfYear = useCallback((forecast: number, expected_closing: string | null | undefined): number => {
        const currentYear = new Date().getFullYear();
        if (!expected_closing || new Date(expected_closing + 'T00:00:00').getFullYear() !== currentYear) {
            return 0;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfYear = new Date(currentYear, 11, 31);

        if (today > endOfYear) return 0;

        const timeDiff = endOfYear.getTime() - today.getTime();
        const daysRemaining = Math.round(timeDiff / (1000 * 60 * 60 * 24)) + 1;
        
        return (forecast / 365) * daysRemaining;
    }, []);

    const { monthlyData, totals } = useMemo(() => {
        const data: {
            monthLabel: string;
            wonCount: number;
            lostCount: number;
            newCount: number;
            wonRevenue: number;
            activeRevenue: number;
            wonMarginAmount: number;
            activeMarginAmount: number;
            wonBalanceOfYear: number;
            activeBalanceOfYear: number;
            wonMarginPercent: number;
            activeMarginPercent: number;
        }[] = [];
        for (let i = 0; i < 12; i++) {
            const date = new Date(startDate);
            date.setMonth(startDate.getMonth() + i);
            const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const newThisMonth = prospects.filter(p => {
                const d = new Date(p.created_at);
                return d.getTime() >= monthStart.getTime() && d.getTime() <= monthEnd.getTime();
            });
            const wonThisMonth = wonInPeriod.filter(({ latestContact }) => {
                const d = latestContact?.actual_close_date ? new Date(latestContact.actual_close_date + 'T00:00:00') : null;
                return d && d.getTime() >= monthStart.getTime() && d.getTime() <= monthEnd.getTime();
            });
            const lostThisMonth = lostInPeriod.filter(({ latestContact }) => {
                const d = latestContact?.actual_close_date ? new Date(latestContact.actual_close_date + 'T00:00:00') : null;
                return d && d.getTime() >= monthStart.getTime() && d.getTime() <= monthEnd.getTime();
            });
            const activeClosingThisMonth = activeProspects.filter(({ latestContact }) => {
                const d = latestContact?.expected_closing ? new Date(latestContact.expected_closing + 'T00:00:00') : null;
                return d && d.getTime() >= monthStart.getTime() && d.getTime() <= monthEnd.getTime();
            });

            const wonRevenue = wonThisMonth.reduce((sum: number, { latestContact }) => sum + safeGetDealValue(latestContact), 0);
            const wonMarginAmount = wonThisMonth.reduce((sum: number, { latestContact }) => sum + (safeGetDealValue(latestContact) * (getMarginPct(latestContact) / 100)), 0);
            const wonBalanceOfYear = wonThisMonth.reduce((sum: number, { latestContact }) => sum + calculateBalanceOfYear(safeGetDealValue(latestContact), latestContact?.actual_close_date), 0);
            
            const activeRevenue = activeClosingThisMonth.reduce((sum: number, { latestContact }) => sum + safeGetDealValue(latestContact), 0);
            const activeMarginAmount = activeClosingThisMonth.reduce((sum: number, { latestContact }) => sum + (safeGetDealValue(latestContact) * (getMarginPct(latestContact) / 100)), 0);
            const activeBalanceOfYear = activeClosingThisMonth.reduce((sum: number, { latestContact }) => sum + calculateBalanceOfYear(safeGetDealValue(latestContact), latestContact?.expected_closing), 0);
            
            data.push({
                monthLabel,
                wonCount: wonThisMonth.length,
                lostCount: lostThisMonth.length,
                newCount: newThisMonth.length,
                wonRevenue,
                activeRevenue,
                wonMarginAmount,
                activeMarginAmount,
                wonBalanceOfYear,
                activeBalanceOfYear,
                wonMarginPercent: wonRevenue > 0 ? (Number(wonMarginAmount) / Number(wonRevenue)) * 100 : 0,
                activeMarginPercent: activeRevenue > 0 ? (Number(activeMarginAmount) / Number(activeRevenue)) * 100 : 0,
            });
        }
        
        const totals = data.reduce((acc: {
            wonCount: number;
            lostCount: number;
            newCount: number;
            wonRevenue: number;
            activeRevenue: number;
            wonMarginAmount: number;
            activeMarginAmount: number;
            wonBalanceOfYear: number;
            activeBalanceOfYear: number;
        }, month) => {
            acc.wonCount += month.wonCount;
            acc.lostCount += month.lostCount;
            acc.newCount += month.newCount;
            acc.wonRevenue += month.wonRevenue;
            acc.activeRevenue += month.activeRevenue;
            acc.wonMarginAmount += month.wonMarginAmount;
            acc.activeMarginAmount += month.activeMarginAmount;
            acc.wonBalanceOfYear += month.wonBalanceOfYear;
            acc.activeBalanceOfYear += month.activeBalanceOfYear;
            return acc;
        }, { wonCount: 0, lostCount: 0, newCount: 0, wonRevenue: 0, activeRevenue: 0, wonMarginAmount: 0, activeMarginAmount: 0, wonBalanceOfYear: 0, activeBalanceOfYear: 0 });

        return { monthlyData: data, totals };
    }, [startDate, endDate, prospects, wonInPeriod, lostInPeriod, activeProspects, calculateBalanceOfYear]);

    return (
        <div className="mgmt-report-grid">
            <div className="dashboard-widget full-width">
                <h3>Monthly Performance (Rolling 12 Months)</h3>
                <div className="performance-grid-container">
                    <table className="performance-grid-table">
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th># Won</th>
                                <th># Lost</th>
                                <th># New</th>
                                <th>Rev $ Won</th>
                                <th>Rev $ Active</th>
                                <th>Margin $ Won</th>
                                <th>Margin $ Active</th>
                                <th>Bal of Yr Won</th>
                                <th>Bal of Yr Active</th>
                                <th>Margin % Won</th>
                                <th>Margin % Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyData.map((row) => (
                                <tr key={row.monthLabel}>
                                    <td>{row.monthLabel}</td>
                                    <td className={row.wonCount > 0 ? 'has-value' : ''}>{row.wonCount}</td>
                                    <td className={row.lostCount > 0 ? 'has-value' : ''}>{row.lostCount}</td>
                                    <td className={row.newCount > 0 ? 'has-value' : ''}>{row.newCount}</td>
                                    <td className={row.wonRevenue > 0 ? 'has-value' : ''}>{formatCurrency(row.wonRevenue)}</td>
                                    <td className={row.activeRevenue > 0 ? 'has-value' : ''}>{formatCurrency(row.activeRevenue)}</td>
                                    <td className={row.wonMarginAmount > 0 ? 'has-value' : ''}>{formatCurrency(row.wonMarginAmount)}</td>
                                    <td className={row.activeMarginAmount > 0 ? 'has-value' : ''}>{formatCurrency(row.activeMarginAmount)}</td>
                                    <td className={row.wonBalanceOfYear > 0 ? 'has-value' : ''}>{formatCurrency(row.wonBalanceOfYear)}</td>
                                    <td className={row.activeBalanceOfYear > 0 ? 'has-value' : ''}>{formatCurrency(row.activeBalanceOfYear)}</td>
                                    <td className={row.wonMarginPercent > 0 ? 'has-value' : ''}>{row.wonMarginPercent.toFixed(0)}%</td>
                                    <td className={row.activeMarginPercent > 0 ? 'has-value' : ''}>{row.activeMarginPercent.toFixed(0)}%</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td>Totals</td>
                                <td className={totals.wonCount > 0 ? 'has-value' : ''}>{totals.wonCount}</td>
                                <td className={totals.lostCount > 0 ? 'has-value' : ''}>{totals.lostCount}</td>
                                <td className={totals.newCount > 0 ? 'has-value' : ''}>{totals.newCount}</td>
                                <td className={totals.wonRevenue > 0 ? 'has-value' : ''}>{formatCurrency(totals.wonRevenue)}</td>
                                <td className={totals.activeRevenue > 0 ? 'has-value' : ''}>{formatCurrency(totals.activeRevenue)}</td>
                                <td className={totals.wonMarginAmount > 0 ? 'has-value' : ''}>{formatCurrency(totals.wonMarginAmount)}</td>
                                <td className={totals.activeMarginAmount > 0 ? 'has-value' : ''}>{formatCurrency(totals.activeMarginAmount)}</td>
                                <td className={totals.wonBalanceOfYear > 0 ? 'has-value' : ''}>{formatCurrency(totals.wonBalanceOfYear)}</td>
                                <td className={totals.activeBalanceOfYear > 0 ? 'has-value' : ''}>{formatCurrency(totals.activeBalanceOfYear)}</td>
                                <td className={totals.wonRevenue > 0 ? 'has-value' : ''}>{totals.wonRevenue > 0 ? ((totals.wonMarginAmount / totals.wonRevenue) * 100).toFixed(0) : 0}%</td>
                                <td className={totals.activeRevenue > 0 ? 'has-value' : ''}>{totals.activeRevenue > 0 ? ((totals.activeMarginAmount / totals.activeRevenue) * 100).toFixed(0) : 0}%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const RecruitingDashboardView: FC<{ 
    drivers: ProspectRouteDriver[]; 
    routes: ProspectRoute[]; 
    prospects: Prospect[];
    unassignedRouteId: number | null;
    statusOptions: DropdownOption[];
    sourceOptions: DropdownOption[];
    onNavigateToRoute: (routeId: number) => void;
}> = ({ drivers, routes, prospects, unassignedRouteId, statusOptions, sourceOptions, onNavigateToRoute }) => {

    const activeDrivers = useMemo(() => drivers.filter(d => !['Terminated', 'Rejected'].includes(d.status)), [drivers]);

    const funnelData = useMemo(() => {
        const counts = drivers.reduce((acc: Record<string, number>, driver) => {
            const status = driver.status || 'Unknown';
            const current = acc[status] || 0;
            acc[status] = current + 1;
            return acc;
        }, {} as Record<string, number>);

        return statusOptions
            .filter(opt => !['Terminated', 'Rejected'].includes(opt.name)) 
            .map(opt => ({
                name: opt.name,
                count: counts[opt.name] || 0
            }));
    }, [drivers, statusOptions]);

    const monthlyData = useMemo(() => {
        const today = new Date();
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthLabel = d.toLocaleString('default', { month: 'short' });
            const start = new Date(d.getFullYear(), d.getMonth(), 1);
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);

            const onboarded = drivers.filter(drv => {
                if (!drv.date_onboarded) return false;
                const date = new Date(drv.date_onboarded);
                return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
            }).length;

            const terminated = drivers.filter(drv => {
                if (!drv.date_terminated) return false;
                const date = new Date(drv.date_terminated);
                return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
            }).length;

            data.push({ month: monthLabel, onboarded, terminated });
        }
        return data;
    }, [drivers]);

    const topSources = useMemo(() => {
        const counts = drivers.reduce((acc: Record<string, number>, d) => {
            const s = d.source || 'Unknown';
            const current = acc[s] || 0;
            acc[s] = current + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => Number(b.count) - Number(a.count))
            .slice(0, 5);
    }, [drivers]);

    return (
        <div className="dashboard-grid">
            <div className="dashboard-kpis">
                <StatCard title="Active Candidates/Drivers" value={activeDrivers.length.toString()} />
                <StatCard title="In Pipeline (Recruiting)" value={drivers.filter(d => ['Recruiting', 'Verifications'].includes(d.status)).length.toString()} />
                <StatCard title="Compliant / Ready" value={drivers.filter(d => d.status === 'Compliant').length.toString()} />
                <StatCard title="Assigned Drivers" value={drivers.filter(d => d.status === 'Assigned').length.toString()} />
            </div>

            <div className="dashboard-widget">
                <h3>Recruiting Funnel (Active)</h3>
                <FunnelChart data={funnelData} />
            </div>

            <div className="dashboard-widget">
                <h3>Onboarded vs Terminated (Last 6 Months)</h3>
                <BarChart data={monthlyData} />
            </div>
            
            <div className="dashboard-widget">
                <h3>Top Sources</h3>
                 {topSources.length > 0 ? (
                    <ul className="dashboard-list">
                        {topSources.map((item, index) => (
                            <li key={index} className="dashboard-list-item">
                                <span>{item.name}</span>
                                <span className="list-item-value">{item.count}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="no-data-message">No source data available.</p>}
            </div>
        </div>
    );
};

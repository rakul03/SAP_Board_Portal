import { motion } from 'framer-motion';
import { Activity, ArrowUpRight, Clock3, Download, Sparkles, Target, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { useData } from '../context/DataContext';
import { exportDashboardReportToXlsx, todayStamp } from '../lib/export';
import { CATEGORIES } from '../types';
import { ExecutiveSummary } from './Dashboard/components/ExecutiveSummary';
import { useDashboardMetrics } from './Dashboard/hooks/useDashboardMetrics';
import styles from './Dashboard.module.css';

const STATUS_COLORS = ['#007564', '#1a5c32', '#d4940a', '#3B82F6', '#d64545', '#a8a69f'];
const SEVERITY_COLORS: Record<string, string> = {
  High: '#d64545',
  Medium: '#d4940a',
  Low: '#2d9d78',
  Information: '#3B82F6',
};
const URGENCY_COLORS: Record<string, string> = {
  High: '#d64545',
  Medium: '#f59e0b',
  Low: '#10b981',
};

interface DrillDownFilter {
  type: '' | 'status' | 'category' | 'owner' | 'severity' | 'urgency';
  value: string;
}

function tooltipStyle(): React.CSSProperties {
  return {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 12,
    padding: '8px 10px',
    boxShadow: 'var(--shadow-md)',
  };
}

export function Dashboard() {
  const { initiatives, auditLogs, owners } = useData();
  const [drillDown, setDrillDown] = useState<DrillDownFilter>({ type: '', value: '' });
  const [isExporting, setIsExporting] = useState(false);

  // New hooks for enhanced dashboard
  const metrics = useDashboardMetrics(initiatives);


  const categoryData = useMemo(
    () =>
      CATEGORIES.map((c) => ({ name: c, count: initiatives.filter((i) => i.category === c).length }))
        .filter((c) => c.count > 0),
    [initiatives],
  );

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    initiatives.forEach((i) => { counts[i.status] = (counts[i.status] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [initiatives]);

  const activityData = useMemo(() => {
    const days: Array<{ date: Date; label: string; count: number }> = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
      days.push({ date: d, label, count: 0 });
    }
    auditLogs.forEach((log) => {
      const dt = new Date(log.logDate);
      if (Number.isNaN(dt.getTime())) return;
      const match = days.find(
        (d) => d.date.toDateString() === dt.toDateString(),
      );
      if (match) match.count += 1;
    });
    return days.map((d) => ({ label: d.label, count: d.count }));
  }, [auditLogs]);

  const ownerWorkload = useMemo(() => {
    const map = new Map<string, number>();
    owners.forEach((o) => {
      if (o.name) map.set(o.name, 0);
    });
    initiatives.forEach((i) => {
      if (!i.owner) return;
      map.set(i.owner, (map.get(i.owner) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [owners, initiatives]);

  const urgencyData = useMemo(() => {
    const counts: Record<string, number> = {};
    initiatives.forEach((i) => { counts[i.urgency] = (counts[i.urgency] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [initiatives]);

  const statusCategoryData = useMemo(() => {
    const map = new Map<string, { Active: number; Pending: number; Delayed: number; Completed: number }>();
    CATEGORIES.forEach((c) => map.set(c, { Active: 0, Pending: 0, Delayed: 0, Completed: 0 }));
    initiatives.forEach((i) => {
      const cat = map.get(i.category);
      if (cat) cat[i.status] = (cat[i.status] ?? 0) + 1;
    });
    const result: Array<{ category: string; Active: number; Pending: number; Delayed: number; Completed: number }> = [];
    map.forEach((statuses, category) => {
      if ((statuses.Active + statuses.Pending + statuses.Delayed + statuses.Completed) > 0) {
        result.push({ category, ...statuses });
      }
    });
    return result;
  }, [initiatives]);

  const drillDownInitiatives = useMemo(() => {
    if (drillDown.type === '') return [];
    return initiatives.filter((i) => {
      if (drillDown.type === 'status') return i.status === drillDown.value;
      if (drillDown.type === 'category') return i.category === drillDown.value;
      if (drillDown.type === 'owner') return i.owner === drillDown.value;
      if (drillDown.type === 'severity') return i.severity === drillDown.value;
      if (drillDown.type === 'urgency') return i.urgency === drillDown.value;
      return false;
    });
  }, [initiatives, drillDown]);

  const severityData = useMemo(() => {
    const counts: Record<string, number> = {};
    auditLogs.forEach((l) => { counts[l.logSeverity] = (counts[l.logSeverity] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [auditLogs]);

  const completedCount = useMemo(
    () => initiatives.filter((initiative) => initiative.status === 'Completed').length,
    [initiatives],
  );

  const openCount = useMemo(
    () => initiatives.filter((initiative) => initiative.status !== 'Completed').length,
    [initiatives],
  );

  const completionRate = metrics.total > 0 ? Math.round((completedCount / metrics.total) * 100) : 0;
  const recentActivityCount = activityData.reduce((sum, entry) => sum + entry.count, 0);
  const topOwner = ownerWorkload[0]?.name ?? 'No owner assigned';

  const handleExportReport = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      const fileName = `dashboard_report_${todayStamp()}.xlsx`;
      exportDashboardReportToXlsx(initiatives, auditLogs, owners, fileName);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <PageHeader
        title="Portfolio Analytics"
        subtitle="Real-time initiative tracking & intelligent insights"
        breadcrumbs={['Analytics', 'Dashboard']}
        actions={
          <button className="liquid-btn" onClick={handleExportReport} disabled={isExporting}>
            <Download size={14} />
            {isExporting ? 'Exporting...' : 'Export Report'}
          </button>
        }
      />

      <motion.section
        className={styles.dashboardHero}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.heroBackdrop} aria-hidden="true" />
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>
              <Sparkles size={14} />
              Command center
            </span>
            <h2>Monitor the portfolio with a more cinematic, real-time command view.</h2>
            <p>
              Spot movement across initiatives, ownership, and audit activity at a glance.
              The screen responds with animated signal blocks, live counts, and polished chart surfaces.
            </p>

            <div className={styles.heroMeta}>
              <div className={styles.heroMetaItem}>
                <Activity size={14} />
                <span>{recentActivityCount} audit events in the last 7 days</span>
              </div>
              <div className={styles.heroMetaItem}>
                <ArrowUpRight size={14} />
                <span>{completionRate}% completion rate across the portfolio</span>
              </div>
            </div>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.heroPanelHeader}>
              <div>
                <p className={styles.heroPanelKicker}>Live signal</p>
                <h3>Portfolio pulse</h3>
              </div>
              <span className={styles.heroPanelStatus}>
                <span className={styles.heroPulse} />
                Updating
              </span>
            </div>

            <div className={styles.heroPanelMain}>
              <div className={styles.heroPanelValue}>{metrics.total}</div>
              <div className={styles.heroPanelLabel}>Tracked initiatives</div>
            </div>

            <div className={styles.heroStatGrid}>
              <div className={styles.heroStatCard}>
                <Users size={16} />
                <div>
                  <span className={styles.heroStatLabel}>Owners</span>
                  <strong>{metrics.owners}</strong>
                </div>
              </div>
              <div className={styles.heroStatCard}>
                <Target size={16} />
                <div>
                  <span className={styles.heroStatLabel}>Open items</span>
                  <strong>{openCount}</strong>
                </div>
              </div>
              <div className={styles.heroStatCard}>
                <Clock3 size={16} />
                <div>
                  <span className={styles.heroStatLabel}>Top owner</span>
                  <strong title={topOwner}>{topOwner}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* NEW: Executive Summary with Enhanced KPI Cards */}
      <ExecutiveSummary
        metrics={metrics}
        onDrillDown={(type, value) => setDrillDown({ type: type as any, value })}
      />

      <div className={styles.row2}>
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -3 }}
        >
          <h3>Resource Allocation</h3>
          <p className={styles.chartHint}>Distribution of initiatives across categories</p>
          <div className={styles.chartHost}>
            {categoryData.length === 0 ? (
              <div className={styles.chartEmpty}>No initiatives yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-light)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--bg-hover)' }}
                    contentStyle={tooltipStyle()}
                  />
                  <Bar
                    dataKey="count"
                    fill="#007564"
                    barSize={20}
                    radius={[0, 4, 4, 0]}
                    isAnimationActive
                    animationDuration={700}
                    onClick={(data: any) => setDrillDown({ type: 'category', value: data.name })}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -3 }}
        >
          <h3>Status Breakdown</h3>
          <p className={styles.chartHint}>Lifecycle distribution across the portfolio</p>
          <div className={styles.chartHost}>
            {statusData.length === 0 ? (
              <div className={styles.chartEmpty}>No initiatives yet.</div>
            ) : (
              <div className={styles.donutHost}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="var(--bg-secondary)"
                      strokeWidth={2}
                      isAnimationActive
                      animationDuration={700}
                    >
                      {statusData.map((data, idx) => (
                        <Cell
                          key={idx}
                          fill={STATUS_COLORS[idx % STATUS_COLORS.length]}
                          cursor="pointer"
                          onClick={() => setDrillDown({ type: 'status', value: data.name })}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle()} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.donutCenter}>
                  <span className={styles.donutValue}>{metrics.total}</span>
                  <span className={styles.donutLabel}>Total</span>
                </div>
              </div>
            )}
          </div>
          <ul className={styles.legend}>
            {statusData.map((s, idx) => (
              <li key={s.name}>
                <span className={styles.legendDot} style={{ background: STATUS_COLORS[idx % STATUS_COLORS.length] }} />
                <span>{s.name}</span>
                <span className={styles.legendValue}>{s.value}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <motion.div
        className={styles.chartCardFull}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -3 }}
      >
        <h3>Activity Over Time</h3>
        <p className={styles.chartHint}>Audit events logged over the past 7 days</p>
        <div className={styles.chartHost}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#007564" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#007564" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--border-light)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              />
              <Tooltip contentStyle={tooltipStyle()} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#007564"
                strokeWidth={2.5}
                fill="url(#activityFill)"
                isAnimationActive
                animationDuration={850}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className={styles.row2}>
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -3 }}
        >
          <h3>Owner Workload</h3>
          <p className={styles.chartHint}>Initiatives currently assigned per owner</p>
          <div className={styles.chartHost}>
            {ownerWorkload.length === 0 ? (
              <div className={styles.chartEmpty}>No owners yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ownerWorkload} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-light)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                  />
                  <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={tooltipStyle()} />
                  <Bar
                    dataKey="count"
                    fill="#1f6f8b"
                    barSize={18}
                    radius={[0, 4, 4, 0]}
                    isAnimationActive
                    animationDuration={700}
                    onClick={(data: any) => setDrillDown({ type: 'owner', value: data.name })}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -3 }}
        >
          <h3>Log Severity</h3>
          <p className={styles.chartHint}>Severity mix across all audit events</p>
          <div className={styles.chartHost}>
            {severityData.length === 0 ? (
              <div className={styles.chartEmpty}>No audit events yet.</div>
            ) : (
              <div className={styles.donutHost}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="var(--bg-secondary)"
                      strokeWidth={2}
                      isAnimationActive
                      animationDuration={700}
                    >
                      {severityData.map((s, idx) => (
                        <Cell
                          key={idx}
                          fill={SEVERITY_COLORS[s.name] ?? '#a8a69f'}
                          cursor="pointer"
                          onClick={() => setDrillDown({ type: 'severity', value: s.name })}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle()} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.donutCenter}>
                  <span className={styles.donutValue}>{auditLogs.length}</span>
                  <span className={styles.donutLabel}>Logs</span>
                </div>
              </div>
            )}
          </div>
          <ul className={styles.legend}>
            {severityData.map((s) => (
              <li key={s.name}>
                <span className={styles.legendDot} style={{ background: SEVERITY_COLORS[s.name] ?? '#a8a69f' }} />
                <span>{s.name}</span>
                <span className={styles.legendValue}>{s.value}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <div className={styles.row2}>
        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -3 }}
        >
          <h3>Urgency Distribution</h3>
          <p className={styles.chartHint}>Priority levels across all initiatives</p>
          <div className={styles.chartHost}>
            {urgencyData.length === 0 ? (
              <div className={styles.chartEmpty}>No initiatives yet.</div>
            ) : (
              <div className={styles.donutHost}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={urgencyData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="var(--bg-secondary)"
                      strokeWidth={2}
                      isAnimationActive
                      animationDuration={700}
                    >
                      {urgencyData.map((u) => (
                        <Cell
                          key={u.name}
                          fill={URGENCY_COLORS[u.name] ?? '#a8a69f'}
                          cursor="pointer"
                          onClick={() => setDrillDown({ type: 'urgency', value: u.name })}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle()} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.donutCenter}>
                  <span className={styles.donutValue}>{metrics.total}</span>
                  <span className={styles.donutLabel}>Total</span>
                </div>
              </div>
            )}
          </div>
          <ul className={styles.legend}>
            {urgencyData.map((u) => (
              <li key={u.name}>
                <span className={styles.legendDot} style={{ background: URGENCY_COLORS[u.name] ?? '#a8a69f' }} />
                <span>{u.name}</span>
                <span className={styles.legendValue}>{u.value}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className={styles.chartCard}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -3 }}
        >
          <h3>Status per Category</h3>
          <p className={styles.chartHint}>Initiative status breakdown by category</p>
          <div className={styles.chartHost}>
            {statusCategoryData.length === 0 ? (
              <div className={styles.chartEmpty}>No initiatives yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusCategoryData} margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip contentStyle={tooltipStyle()} />
                  <Bar
                    dataKey="Active"
                    stackId="a"
                    fill="#10b981"
                    isAnimationActive
                    animationDuration={700}
                    onClick={(data: any) => setDrillDown({ type: 'category', value: data.category })}
                  />
                  <Bar
                    dataKey="Pending"
                    stackId="a"
                    fill="#f59e0b"
                    isAnimationActive
                    animationDuration={700}
                    onClick={(data: any) => setDrillDown({ type: 'category', value: data.category })}
                  />
                  <Bar
                    dataKey="Delayed"
                    stackId="a"
                    fill="#d64545"
                    isAnimationActive
                    animationDuration={700}
                    onClick={(data: any) => setDrillDown({ type: 'category', value: data.category })}
                  />
                  <Bar
                    dataKey="Completed"
                    stackId="a"
                    fill="#4f46e5"
                    isAnimationActive
                    animationDuration={700}
                    onClick={(data: any) => setDrillDown({ type: 'category', value: data.category })}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {drillDown.type !== '' && (
        <motion.div
          className={styles.drillDownPanel}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.drillDownHeader}>
            <div>
              <h3 className={styles.drillDownTitle}>Filtered Results</h3>
              <p className={styles.drillDownSubtitle}>
                {drillDown.type === 'status' && `Status: ${drillDown.value}`}
                {drillDown.type === 'category' && `Category: ${drillDown.value}`}
                {drillDown.type === 'owner' && `Owner: ${drillDown.value}`}
                {drillDown.type === 'severity' && `Severity: ${drillDown.value}`}
                {drillDown.type === 'urgency' && `Urgency: ${drillDown.value}`}
              </p>
            </div>
            <button
              className={styles.drillDownClose}
              onClick={() => setDrillDown({ type: '', value: '' })}
              type="button"
              aria-label="Close drill-down"
            >
              <X size={18} />
            </button>
          </div>
          <ul className={styles.drillDownList}>
            {drillDownInitiatives.map((init) => (
              <motion.li
                key={init.id}
                className={styles.drillDownRow}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.16 }}
              >
                <span className={styles.drillDownName}>{init.name}</span>
                <span className={styles.drillDownMeta}>
                  <Badge type={init.status}>{init.status}</Badge>
                  <span className={styles.drillDownCategory}>{init.category}</span>
                </span>
              </motion.li>
            ))}
          </ul>
          {drillDownInitiatives.length === 0 && (
            <div className={styles.drillDownEmpty}>
              No initiatives match this filter.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

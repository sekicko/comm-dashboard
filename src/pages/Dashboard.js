import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { getCommission } from '../services/deriv';

const formatDate = (date) => date.format('YYYY-MM-DD');

const getBreakdownData = (response, appId) => {
  const breakdown = response?.data?.breakdown || [];

  if (!appId) {
    return breakdown.reduce((acc, app) => ({
      commission: acc.commission + (app.app_markup_usd || 0),
      transactions: acc.transactions + (app.contract_count || 0),
      clients: acc.clients + (app.client_count || 0)
    }), { commission: 0, transactions: 0, clients: 0 });
  }

  const appData = breakdown.find((app) => app.app_id === appId);
  return {
    commission: appData?.app_markup_usd || 0,
    transactions: appData?.contract_count || 0,
    clients: appData?.client_count || 0
  };
};

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import CommissionCard from '../components/CommissionCard';
import CommissionChart from '../components/CommissionChart';
import AllApps from './AllApps';

export default function Dashboard({ onLogout }) {
  const [today, setToday] = useState(0);
  const [todayTxns, setTodayTxns] = useState(0);
  const [thisMonth, setThisMonth] = useState(0);
  const [thisMonthTxns, setThisMonthTxns] = useState(0);
  const [lastMonth, setLastMonth] = useState(0);
  const [lastMonthTxns, setLastMonthTxns] = useState(0);
  const [custom, setCustom] = useState(null);
  const [customTxns, setCustomTxns] = useState(0);

  const [chartData, setChartData] = useState([]);
  const [chartTitle, setChartTitle] = useState('Monthly Commission Distribution');
  const [activeTab, setActiveTab] = useState('monthly');
  const [chartLoading, setChartLoading] = useState(false);
  
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('overview');
  
  // App filtering
  const [activeApps, setActiveApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState(null);

  // Load initial data on mount
  useEffect(() => {
    loadActiveApps();
    loadDefaultCards();
    loadMonthlyChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload data when app filter or tab changes
  useEffect(() => {
    loadDefaultCards();
    if (activeTab === 'monthly') {
      loadMonthlyChart();
    } else if (activeTab === 'daily') {
      loadDailyChart();
    } else if (activeTab === 'hourly') {
      loadHourlyChart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAppId, activeTab]);

  const loadActiveApps = async () => {
    try {
      const monthRes = await getCommission(formatDate(dayjs().startOf('month')), formatDate(dayjs().endOf('month')));
      const breakdown = monthRes?.data?.breakdown || [];

      const active = breakdown
        .filter((app) => (app.app_markup_usd || 0) > 0)
        .map((app) => ({
          app_id: app.app_id,
          commission: app.app_markup_usd || 0
        }))
        .sort((a, b) => b.commission - a.commission);

      setActiveApps(active);
    } catch (error) {
      console.error('Error loading active apps:', error);
    }
  };

  const loadDefaultCards = async () => {
    try {
      // TODAY
      const todayRes = await getCommission(formatDate(dayjs().startOf('day')), formatDate(dayjs().endOf('day')));
      const todayData = getBreakdownData(todayRes, selectedAppId);
      setToday(todayData.commission);
      setTodayTxns(todayData.transactions);

      const monthRes = await getCommission(formatDate(dayjs().startOf('month')), formatDate(dayjs().endOf('month')));
      const monthData = getBreakdownData(monthRes, selectedAppId);
      setThisMonth(monthData.commission);
      setThisMonthTxns(monthData.transactions);

      const lastRes = await getCommission(formatDate(dayjs().subtract(1, 'month').startOf('month')), formatDate(dayjs().subtract(1, 'month').endOf('month')));
      const lastData = getBreakdownData(lastRes, selectedAppId);
      setLastMonth(lastData.commission);
      setLastMonthTxns(lastData.transactions);
    } catch (error) {
      console.error('Error loading commission cards:', error);
    }
  };

  const loadMonthlyChart = async () => {
    setChartLoading(true);
    try {
      const data = [];
      const currentYear = dayjs().year();

      for (let i = 0; i < 12; i++) {
        const from = formatDate(dayjs().year(currentYear).month(i).startOf('month'));
        const to = formatDate(dayjs().year(currentYear).month(i).endOf('month'));

        const res = await getCommission(from, to);
        const monthData = getBreakdownData(res, selectedAppId);
        
        data.push({
          label: dayjs().month(i).format('MMM'),
          value: monthData.commission
        });
      }

      setChartData(data);
      setChartTitle(selectedAppId ? `Monthly Commission - App #${selectedAppId}` : 'Monthly Commission Distribution');
    } catch (error) {
      console.error('Error loading monthly chart:', error);
    } finally {
      setChartLoading(false);
    }
  };

  const loadDailyChart = async () => {
    setChartLoading(true);
    try {
      const data = [];
      const daysInMonth = dayjs().daysInMonth();

      for (let i = 1; i <= Math.min(daysInMonth, 30); i++) {
        const from = formatDate(dayjs().date(i).startOf('day'));
        const to = formatDate(dayjs().date(i).endOf('day'));

        const res = await getCommission(from, to);
        const dayData = getBreakdownData(res, selectedAppId);
        
        data.push({
          label: `Day ${i}`,
          value: dayData.commission
        });
      }

      setChartData(data);
      setChartTitle(selectedAppId ? `Daily Commission - App #${selectedAppId}` : 'Daily Commission Distribution');
    } catch (error) {
      console.error('Error loading daily chart:', error);
    } finally {
      setChartLoading(false);
    }
  };

  const loadHourlyChart = async () => {
    setChartLoading(true);
    try {
      const data = [];
      const today = dayjs();

      for (let i = 0; i < 24; i++) {
        const from = formatDate(today.hour(i).minute(0).second(0));
        const to = formatDate(today.hour(i).minute(59).second(59));

        const res = await getCommission(from, to);
        const hourData = getBreakdownData(res, selectedAppId);
        
        data.push({
          label: `${i}:00`,
          value: hourData.commission
        });
      }

      setChartData(data);
      setChartTitle(selectedAppId ? `Hourly Commission - App #${selectedAppId}` : 'Hourly Commission Distribution');
    } catch (error) {
      console.error('Error loading hourly chart:', error);
    } finally {
      setChartLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'monthly') {
      loadMonthlyChart();
    } else if (tab === 'daily') {
      loadDailyChart();
    } else if (tab === 'hourly') {
      loadHourlyChart();
    }
  };

  const checkCustom = async (from, to) => {
    try {
      const res = await getCommission(from, to);
      const customData = getBreakdownData(res, selectedAppId);
      setCustom(customData.commission);
      setCustomTxns(customData.transactions);
      // Don't update chart for custom range
    } catch (error) {
      console.error('Error loading custom commission:', error);
      // Silently fail - just log the error
    }
  };

  return (
    <div className="dashboard">
      <Header 
        onLogout={onLogout} 
        onDateRangeChange={checkCustom}
        activeApps={activeApps}
        selectedAppId={selectedAppId}
        onAppSelect={setSelectedAppId}
      />

      <div className="dashboard-content">
        <div className="tabs">
          <button
            className={`tab ${activeMainTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('overview')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', display: 'inline' }}>
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Overview
          </button>
          <button
            className={`tab ${activeMainTab === 'apps' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('apps')}
          >
            All APP_IDs
          </button>
        </div>

        {activeMainTab === 'overview' ? (
          <>
            <div className="cards-grid">
              <CommissionCard
                title="This Month"
                value={thisMonth}
                icon="dollar"
                trend={lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : null}
                transactions={thisMonthTxns}
              />
              <CommissionCard
                title="Today's Commission"
                value={today}
                icon="trending"
                transactions={todayTxns}
              />
              <CommissionCard
                title="Last Month"
                value={lastMonth}
                icon="calendar"
                transactions={lastMonthTxns}
              />
              {custom !== null && (
                <CommissionCard
                  title="Custom Range"
                  value={custom}
                  icon="dollar"
                  transactions={customTxns}
                />
              )}
            </div>

            <CommissionChart
              title={chartTitle}
              data={chartData}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              loading={chartLoading}
            />
          </>
        ) : (
          <AllApps />
        )}
      </div>

      {showSidebar && (
        <Sidebar 
          onCheck={checkCustom} 
          onClose={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
}

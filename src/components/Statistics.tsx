import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  Users, Eye, MousePointer2, TrendingUp, 
  Smartphone, Monitor, Tablet, Calendar, Filter,
  ArrowDownRight, ChevronRight, Activity, Search, BarChart3, MousePointerClick, Target,
  Globe, Layout, List, Layers
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5'];

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(7); // days
  const [stats, setStats] = useState<any>(null);
  const [gscStats, setGscStats] = useState<any>(null);
  const [gscQueries, setGscQueries] = useState<any[]>([]);
  const [gscPages, setGscPages] = useState<any[]>([]);
  const [gscCountries, setGscCountries] = useState<any[]>([]);
  const [gscDevices, setGscDevices] = useState<any[]>([]);
  const [gscAppearance, setGscAppearance] = useState<any[]>([]);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  
  // GSC Metric Visibility Toggles
  const [visibleMetrics, setVisibleMetrics] = useState({
    clicks: true,
    impressions: true,
    ctr: false,
    position: false
  });

  const toggleMetric = (metric: keyof typeof visibleMetrics) => {
    setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  const getFlagEmoji = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) return '🏳️';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  useEffect(() => {
    fetchStats();
    fetchGscStats();
  }, [dateRange]);

  const fetchGscStats = async () => {
    setGscLoading(true);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = subDays(new Date(), dateRange).toISOString().split('T')[0];

    try {
      // Fetch multiple dimensions in parallel
      const dimensions = ['date', 'query', 'page', 'country', 'device', 'searchAppearance'];
      const results = await Promise.all(
        dimensions.map(dim => 
          fetch(`/api/v1/gsc/stats?startDate=${startDate}&endDate=${endDate}&dimension=${dim}`)
            .then(res => {
              if (!res.ok) throw new Error(`Failed to fetch ${dim} stats`);
              return res.json();
            })
        )
      );

      const [dateData, queryData, pageData, countryData, deviceData, appearanceData] = results;

      setGscStats(processGscData(dateData.rows || []));
      setGscQueries(queryData.rows || []);
      setGscPages(pageData.rows || []);
      
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      setGscCountries((countryData.rows || []).map((row: any) => ({
        ...row,
        fullName: (() => {
          try {
            return regionNames.of(row.keys[0].toUpperCase()) || row.keys[0];
          } catch (e) {
            return row.keys[0];
          }
        })()
      })));
      
      setGscDevices(deviceData.rows || []);
      setGscAppearance(appearanceData.rows || []);
      setGscError(null);
    } catch (err: any) {
      console.error('Error fetching GSC stats:', err);
      setGscError(err.message);
    } finally {
      setGscLoading(false);
    }
  };

  const processGscData = (rows: any[]) => {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const getCountryName = (code: string) => {
      try {
        return regionNames.of(code.toUpperCase()) || code;
      } catch (e) {
        return code;
      }
    };

    const totals = rows.reduce((acc, row) => ({
      clicks: acc.clicks + row.clicks,
      impressions: acc.impressions + row.impressions,
      ctr: acc.ctr + row.ctr,
      position: acc.position + row.position
    }), { clicks: 0, impressions: 0, ctr: 0, position: 0 });

    const count = rows.length || 1;
    
    return {
      rows: rows.map(row => ({
        date: format(parseISO(row.keys[0]), 'MMM dd'),
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: parseFloat((row.ctr * 100).toFixed(2)),
        position: parseFloat(row.position.toFixed(1))
      })),
      totals: {
        clicks: totals.clicks,
        impressions: totals.impressions,
        avgCtr: ((totals.ctr / count) * 100).toFixed(2),
        avgPosition: (totals.position / count).toFixed(1)
      }
    };
  };

  const fetchStats = async () => {
    setLoading(true);
    const startDate = subDays(new Date(), dateRange).toISOString();

    try {
      // Fetch all events in range
      const { data: events, error } = await supabase
        .from('tracking_events')
        .select('*')
        .gte('created_at', startDate);

      if (error) throw error;

      // Process stats
      const processedStats = processEvents(events || []);
      setStats(processedStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const processEvents = (events: any[]) => {
    // 1. Device Counts
    const devices: Record<string, number> = {};
    const browsers: Record<string, number> = {};
    const os: Record<string, number> = {};

    events.forEach(e => {
      devices[e.device_type] = (devices[e.device_type] || 0) + 1;
      browsers[e.browser] = (browsers[e.browser] || 0) + 1;
      os[e.os] = (os[e.os] || 0) + 1;
    });

    const deviceData = Object.entries(devices).map(([name, value]) => ({ name, value }));
    const browserData = Object.entries(browsers).map(([name, value]) => ({ name, value }));

    // 2. Page Views
    const pageViews = events.filter(e => e.event_type === 'page_view').length;

    // 3. Visitor Trend (Daily)
    const days = eachDayOfInterval({
      start: subDays(new Date(), dateRange - 1),
      end: new Date(),
    });

    const trendData = days.map(day => {
      const dayStr = format(day, 'MMM dd');
      const dayEvents = events.filter(e => 
        format(new Date(e.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );

      return {
        date: dayStr,
        views: dayEvents.filter(e => e.event_type === 'page_view').length,
      };
    });

    return {
      deviceData,
      browserData,
      trendData,
      totals: {
        visitors: new Set(events.map(e => e.visitor_id)).size,
        sessions: new Set(events.map(e => e.session_id)).size,
        pageViews,
      }
    };
  };

  if (loading) return <div className="flex justify-center py-20"><Activity className="animate-spin text-accent w-10 h-10" /></div>;
  if (!stats) return <div>No data available.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
          <p className="text-secondary/60 text-sm">Anonymous visitor tracking statistics</p>
        </div>
        <div className="flex items-center gap-2 bg-alt p-1 rounded-xl border border-muted">
          {[7, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                dateRange === days ? 'bg-primary text-page shadow-lg' : 'text-secondary hover:bg-page'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard icon={<Users />} label="Unique Visitors" value={stats.totals.visitors} color="text-blue-500" />
        <StatCard icon={<TrendingUp />} label="Total Sessions" value={stats.totals.sessions} color="text-green-500" />
        <StatCard icon={<Eye />} label="Page Views" value={stats.totals.pageViews} color="text-purple-500" />
      </div>

      {/* Google Search Console Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Search className="w-5 h-5 text-accent" />
              Google Search Console
            </h3>
            <p className="text-secondary/60 text-xs">Organic search performance from Google</p>
          </div>
        </div>

        {gscLoading ? (
          <div className="flex justify-center py-10"><Activity className="animate-spin text-accent w-6 h-6" /></div>
        ) : gscError ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 text-center">
            <p className="text-red-400 text-sm">{gscError}</p>
            <p className="text-secondary/40 text-xs mt-2">Please ensure your Service Account is configured and has access to the site in Search Console.</p>
          </div>
        ) : gscStats ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<MousePointerClick />} label="Total Clicks" value={gscStats.totals.clicks} color="text-orange-500" small />
              <StatCard icon={<BarChart3 />} label="Total Impressions" value={gscStats.totals.impressions} color="text-blue-500" small />
              <StatCard icon={<Target />} label="Avg. CTR" value={`${gscStats.totals.avgCtr}%`} color="text-green-500" small />
              <StatCard icon={<TrendingUp />} label="Avg. Position" value={gscStats.totals.avgPosition} color="text-purple-500" small />
            </div>

            <div className="bg-alt p-6 rounded-3xl border border-muted">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h3 className="font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent" />
                  Search Performance Trend
                </h3>
                
                {/* Metric Toggles - GSC Style */}
                <div className="flex flex-wrap gap-2">
                  <MetricToggle 
                    label="Clicks" 
                    value={gscStats.totals.clicks} 
                    active={visibleMetrics.clicks} 
                    color="border-orange-500 text-orange-500"
                    activeBg="bg-orange-500/10"
                    onClick={() => toggleMetric('clicks')}
                  />
                  <MetricToggle 
                    label="Impressions" 
                    value={gscStats.totals.impressions} 
                    active={visibleMetrics.impressions} 
                    color="border-blue-500 text-blue-500"
                    activeBg="bg-blue-500/10"
                    onClick={() => toggleMetric('impressions')}
                  />
                  <MetricToggle 
                    label="Avg. CTR" 
                    value={`${gscStats.totals.avgCtr}%`} 
                    active={visibleMetrics.ctr} 
                    color="border-green-500 text-green-500"
                    activeBg="bg-green-500/10"
                    onClick={() => toggleMetric('ctr')}
                  />
                  <MetricToggle 
                    label="Avg. Position" 
                    value={gscStats.totals.avgPosition} 
                    active={visibleMetrics.position} 
                    color="border-purple-500 text-purple-500"
                    activeBg="bg-purple-500/10"
                    onClick={() => toggleMetric('position')}
                  />
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gscStats.rows}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#45B7D1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#45B7D1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#666'}} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#666'}} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#666'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    {visibleMetrics.clicks && (
                      <Area yAxisId="left" name="Clicks" type="monotone" dataKey="clicks" stroke="#FF6B6B" fillOpacity={1} fill="url(#colorClicks)" strokeWidth={3} />
                    )}
                    {visibleMetrics.impressions && (
                      <Area yAxisId="left" name="Impressions" type="monotone" dataKey="impressions" stroke="#45B7D1" fillOpacity={1} fill="url(#colorImpressions)" strokeWidth={3} />
                    )}
                    {visibleMetrics.ctr && (
                      <Line yAxisId="right" name="Avg. CTR (%)" type="monotone" dataKey="ctr" stroke="#4ECDC4" strokeWidth={2} dot={false} />
                    )}
                    {visibleMetrics.position && (
                      <Line yAxisId="right" name="Avg. Position" type="monotone" dataKey="position" stroke="#FFEEAD" strokeWidth={2} dot={false} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Queries */}
              <div className="bg-alt p-6 rounded-3xl border border-muted">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <Search className="w-4 h-4 text-accent" />
                  Top Queries
                </h3>
                <div className="h-[200px] w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gscQueries.slice(0, 5).map(q => ({ name: q.keys[0], clicks: q.clicks }))} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 9, fill: '#666'}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }}
                      />
                      <Bar dataKey="clicks" fill="#da755b" radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {(() => {
                    const maxClicks = Math.max(...gscQueries.map(q => q.clicks), 1);
                    return gscQueries.slice(0, 10).map((row, i) => (
                      <div key={i} className="relative overflow-hidden p-3 bg-page/30 rounded-xl border border-muted/50 hover:border-accent/30 transition-colors group">
                        <div 
                          className="absolute inset-y-0 left-0 bg-accent/5 transition-all duration-500" 
                          style={{ width: `${(row.clicks / maxClicks) * 100}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="text-xs text-secondary/40 font-mono">{i + 1}</span>
                            <span className="text-sm font-medium truncate">{row.keys[0]}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="text-orange-400 font-bold">{row.clicks.toLocaleString()} <span className="text-[10px] opacity-50">CLKS</span></span>
                            <span className="text-blue-400/70 group-hover:text-blue-400 transition-colors">{row.impressions.toLocaleString()} <span className="text-[10px] opacity-50">IMPR</span></span>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                  {gscQueries.length === 0 && <p className="text-center py-10 text-secondary/40 text-sm italic">No query data available</p>}
                </div>
              </div>

              {/* Top Pages */}
              <div className="bg-alt p-6 rounded-3xl border border-muted">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-accent" />
                  Top Pages
                </h3>
                <div className="h-[200px] w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gscPages.slice(0, 5).map(p => ({ name: p.keys[0].replace(/https?:\/\/[^\/]+/, '') || '/', clicks: p.clicks }))} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 9, fill: '#666'}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }}
                      />
                      <Bar dataKey="clicks" fill="#4ECDC4" radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {(() => {
                    const maxClicks = Math.max(...gscPages.map(p => p.clicks), 1);
                    return gscPages.slice(0, 10).map((row, i) => (
                      <div key={i} className="relative overflow-hidden p-3 bg-page/30 rounded-xl border border-muted/50 hover:border-accent/30 transition-colors group">
                        <div 
                          className="absolute inset-y-0 left-0 bg-accent/5 transition-all duration-500" 
                          style={{ width: `${(row.clicks / maxClicks) * 100}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <span className="text-sm font-medium truncate max-w-[200px]">{row.keys[0].replace(/https?:\/\/[^\/]+/, '') || '/'}</span>
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="text-orange-400 font-bold">{row.clicks.toLocaleString()}</span>
                            <span className="text-blue-400/70 group-hover:text-blue-400 transition-colors">{row.impressions.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                  {gscPages.length === 0 && <p className="text-center py-10 text-secondary/40 text-sm italic">No page data available</p>}
                </div>
              </div>

              {/* Countries */}
              <div className="bg-alt p-6 rounded-3xl border border-muted">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-accent" />
                  Countries Performance
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-12 gap-4 px-3 py-2 text-[10px] font-mono text-secondary/40 uppercase tracking-wider border-b border-muted/30">
                    <div className="col-span-6">Country</div>
                    <div className="col-span-3 text-right">Clicks</div>
                    <div className="col-span-3 text-right">Impr.</div>
                  </div>
                  {(() => {
                    const maxClicks = Math.max(...gscCountries.map(c => c.clicks), 1);
                    return gscCountries.sort((a, b) => b.clicks - a.clicks).map((row, i) => (
                      <div key={i} className="relative overflow-hidden p-3 bg-page/30 rounded-xl border border-muted/50 hover:border-accent/30 transition-colors group">
                        {/* Relative Progress Bar */}
                        <div 
                          className="absolute inset-y-0 left-0 bg-orange-500/5 transition-all duration-500" 
                          style={{ width: `${(row.clicks / maxClicks) * 100}%` }}
                        />
                        
                        <div className="relative grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                            <span className="text-xl leading-none" title={row.keys[0]}>
                              {getFlagEmoji(row.keys[0])}
                            </span>
                            <span className="text-sm font-medium truncate">{row.fullName}</span>
                          </div>
                          <div className="col-span-3 text-right text-sm font-mono text-orange-400 font-bold">
                            {row.clicks.toLocaleString()}
                          </div>
                          <div className="col-span-3 text-right text-sm font-mono text-blue-400/70 group-hover:text-blue-400 transition-colors">
                            {row.impressions.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                  {gscCountries.length === 0 && (
                    <div className="text-center py-10 text-secondary/40 text-sm italic">
                      No country data available
                    </div>
                  )}
                </div>
              </div>

              {/* Devices */}
              <div className="bg-alt p-6 rounded-3xl border border-muted">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-accent" />
                  Search Devices
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gscDevices.map(d => ({ name: d.keys[0], value: d.clicks }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {gscDevices.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Search Appearance */}
              {gscAppearance.length > 0 && (
                <div className="bg-alt p-6 rounded-3xl border border-muted lg:col-span-2">
                  <h3 className="font-bold mb-6 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accent" />
                    Search Appearance
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {gscAppearance.map((row, i) => (
                      <div key={i} className="p-4 bg-page/30 rounded-2xl border border-muted/50">
                        <p className="text-[10px] text-secondary/40 uppercase font-mono mb-1">{row.keys[0].replace(/_/g, ' ')}</p>
                        <div className="flex justify-between items-end">
                          <span className="text-xl font-bold">{row.clicks}</span>
                          <span className="text-xs text-blue-400 font-mono">{row.impressions} IMPR</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-alt/50 border border-dashed border-muted rounded-3xl p-10 text-center">
            <Search className="w-10 h-10 text-secondary/20 mx-auto mb-4" />
            <p className="text-secondary/60 text-sm">No Search Console data available.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Visitor Trend */}
        <div className="bg-alt p-6 rounded-3xl border border-muted lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Visitor Trends
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#666'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#666'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="views" stroke="#4ECDC4" fillOpacity={1} fill="url(#colorViews)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Distribution */}
        <div className="bg-alt p-6 rounded-3xl border border-muted">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-accent" />
            Device Distribution
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.deviceData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Browser Stats */}
        <div className="bg-alt p-6 rounded-3xl border border-muted">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-accent" />
            Top Browsers
          </h3>
          <div className="space-y-4">
            {stats.browserData.sort((a: any, b: any) => b.value - a.value).map((b: any, i: number) => (
              <div key={b.name} className="flex items-center justify-between p-3 bg-page/30 rounded-xl border border-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium">{b.name}</span>
                </div>
                <span className="text-sm font-mono text-secondary">{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricToggle = ({ label, value, active, color, activeBg, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-start p-3 rounded-xl border transition-all min-w-[120px] ${
      active ? `${color} ${activeBg} border-current shadow-sm` : 'border-muted text-secondary/40 grayscale opacity-50'
    }`}
  >
    <span className="text-[10px] font-mono uppercase tracking-wider mb-1">{label}</span>
    <span className="text-lg font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</span>
  </button>
);

const StatCard = ({ icon, label, value, color, small }: any) => (
  <div className={`bg-alt rounded-3xl border border-muted hover:border-accent/30 transition-colors group ${small ? 'p-4' : 'p-6'}`}>
    <div className={`rounded-2xl bg-page flex items-center justify-center border border-muted group-hover:scale-110 transition-transform ${color} ${small ? 'w-10 h-10 mb-3' : 'w-12 h-12 mb-4'}`}>
      {React.cloneElement(icon, { size: small ? 16 : 20 })}
    </div>
    <p className="text-secondary/60 text-[10px] font-mono uppercase tracking-wider mb-1">{label}</p>
    <h4 className={`${small ? 'text-xl' : 'text-2xl'} font-bold`}>{typeof value === 'number' ? value.toLocaleString() : value}</h4>
  </div>
);

export default Statistics;

import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, MapPin, Star, Zap, TrendingUp, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const API = 'http://localhost:5000/api';

const Home = () => {
  const navigate = useNavigate();
  const [stats, setStats]     = useState(null);
  const [quotes, setQuotes]   = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/homepage/stats`).then(r => r.json()),
      fetch(`${API}/homepage/quotes`).then(r => r.json()),
      fetch(`${API}/settings`).then(r => r.json()),
    ]).then(([s, q, cfg]) => {
      setStats(s);
      setQuotes(q);
      setSettings(cfg);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const g = (key) => settings[key]?.value || '';

  if (loading) return <div className="home-loading">加载平台数据...</div>;

  return (
    <div className="home-page">

      {/* ── Hero Banner ── */}
      <div className="home-hero">
        <div className="home-hero-tag">郑州建材共享平台</div>
        <h1 className="home-hero-title">99共享建材</h1>
        <p className="home-hero-sub">商砼 · 钢构 · 物资 &nbsp;一站式共享采购</p>

        {/* Platform Stats */}
        {stats && (
          <div className="home-stats-row">
            <div className="home-stat">
              <span className="home-stat-num">{stats.partner_concrete_stations}+</span>
              <span className="home-stat-lbl">合作商砼站</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <span className="home-stat-num">{stats.shared_steel_factories}+</span>
              <span className="home-stat-lbl">共享钢构厂</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <span className="home-stat-num">{stats.today_inquiries}</span>
              <span className="home-stat-lbl">今日询价</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Today's Quotes ── */}
      {quotes.length > 0 && (
        <div className="home-section">
          <div className="home-section-header">
            <Zap size={14} className="home-section-icon" />
            今日推荐报价
            <span className="home-section-badge">实时更新</span>
          </div>
          <div className="home-quotes-list">
            {quotes.map(q => (
              <div key={q.id} className="home-quote-card">
                <div className="home-quote-left">
                  <div className="home-quote-name">{q.product_name}</div>
                  <div className="home-quote-time">
                    {q.effective_time ? String(q.effective_time).replace('T', ' ').slice(0, 16) : ''} 生效
                  </div>
                  <div className="home-quote-tags">
                    {(q.tags || []).map((t, i) => (
                      <span key={i} className="home-quote-tag">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="home-quote-right">
                  <span className="home-quote-price">¥{q.price}</span>
                  <span className="home-quote-unit">/{q.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Entry ── */}
      <div className="home-section">
        <div className="home-section-header">
          <TrendingUp size={14} className="home-section-icon" />
          快速入口
        </div>
        <div className="home-entries">
          <div className="home-entry" onClick={() => navigate('/concrete')}>
            <div className="home-entry-icon" style={{background:'linear-gradient(135deg,#1565c0,#0d47a1)'}}>🚛</div>
            <div className="home-entry-name">共享商砼</div>
            <div className="home-entry-sub">抢本周额度</div>
          </div>
          <div className="home-entry" onClick={() => navigate('/steel')}>
            <div className="home-entry-icon" style={{background:'linear-gradient(135deg,#b71c1c,#7f0000)'}}>🏗️</div>
            <div className="home-entry-name">共享钢构</div>
            <div className="home-entry-sub">99元/吨起</div>
          </div>
          <div className="home-entry" onClick={() => navigate('/materials')}>
            <div className="home-entry-icon" style={{background:'linear-gradient(135deg,#1b5e20,#004d40)'}}>📦</div>
            <div className="home-entry-name">共享物资</div>
            <div className="home-entry-sub">组团拼价</div>
          </div>
          <div className="home-entry" onClick={() => navigate('/tracking')}>
            <div className="home-entry-icon" style={{background:'linear-gradient(135deg,#4a148c,#311b92)'}}>📋</div>
            <div className="home-entry-name">订单追踪</div>
            <div className="home-entry-sub">实时物流</div>
          </div>
        </div>
      </div>

      {/* ── Factory Info ── */}
      {g('factory_address') && (
        <div className="home-section">
          <div className="home-section-header">
            <Star size={14} className="home-section-icon" />
            平台实力
          </div>
          <div className="home-factory-card">
            <div className="home-factory-row">
              <MapPin size={13} style={{flexShrink:0, color:'#FF6F00'}} />
              <span>{g('factory_address')}</span>
            </div>
            <div className="home-factory-tags">
              {[g('factory_area'), g('factory_workshop'), g('factory_annual_output')]
                .filter(Boolean)
                .map((v, i) => <span key={i} className="home-factory-tag">{v}</span>)}
            </div>
            <div className="home-factory-metrics">
              <div className="home-factory-metric">
                <span className="home-metric-val">{g('response_label') || '7x12 人工响应'}</span>
              </div>
              <div className="home-factory-metric">
                <span className="home-metric-val">{g('fulfillment_rate') || '98%'} 履约率</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Contact ── */}
      <div className="home-section">
        <div className="home-contact-row">
          {g('phone_kefu') && (
            <a href={`tel:${g('phone_kefu')}`} className="home-contact-btn home-contact-call">
              <Phone size={16} />
              一键电话
            </a>
          )}
          {g('wechat_kefu_id') && (
            <div className="home-contact-btn home-contact-wechat">
              <MessageCircle size={16} />
              微信客服
            </div>
          )}
        </div>
        <div className="home-admin-link" onClick={() => window.open('/admin','_blank')}>
          报价后台管理 <ChevronRight size={14} />
        </div>
      </div>

      <div style={{height:'20px'}} />
    </div>
  );
};

export default Home;

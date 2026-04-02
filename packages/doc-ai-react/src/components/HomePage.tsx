export function Component() {
  return (
    <div className="home-view">
      <div className="page-header">
        <h2>概览大盘</h2>
        <p className="subtitle">电子商务业务数据实时监控</p>
      </div>

      <div className="stats-cards">
        <div className="stat-card blue">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-title">今日销售额</div>
            <div className="stat-value">￥128,450</div>
            <div className="stat-trend positive">↑ 12.5% 较昨日</div>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-title">总库存量</div>
            <div className="stat-value">1,248 件</div>
            <div className="stat-trend negative">↓ 3.2% 较上周</div>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">🛡️</div>
          <div className="stat-content">
            <div className="stat-title">待处理价保</div>
            <div className="stat-value">12 单</div>
            <div className="stat-trend neutral">- 持平</div>
          </div>
        </div>
      </div>

      <div className="info-section">
        <h3>使用指引</h3>
        <div className="guide-box">
          <p>
            本项目展示了如何将 <strong>webSkills</strong> 与 <strong>webMCP</strong> 集成到业务系统中：
          </p>
          <ul>
            <li>
              <strong>左侧系统视图：</strong>标准的 React + TinyVue 业务系统，包含数据列表与操作。
            </li>
            <li>
              <strong>右侧 AI 助手：</strong>基于 TinyRobot 开发的终端，内置了电商相关的业务技能 (skills)。
            </li>
          </ul>
          <p>
            <strong>💡 试试在右侧对 AI 说：</strong>
          </p>
          <div className="prompt-chips">
            <span className="chip">"帮我添加 100 台 iPhone 15 到北京一号仓"</span>
            <span className="chip">"顾客李四想申请订单 ORD-123 的价保 50 元，原因是百亿补贴变价了"</span>
            <span className="chip">"请查询目前的库存情况"</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Component

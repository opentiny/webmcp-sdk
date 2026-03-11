<template>
  <div class="home-view">
    <div class="page-header">
      <h2>概览大盘</h2>
      <p class="subtitle">电子商务业务数据实时监控</p>
    </div>

    <div class="stats-cards">
      <div class="stat-card blue">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-title">今日销售额</div>
          <div class="stat-value">￥128,450</div>
          <div class="stat-trend positive">↑ 12.5% 较昨日</div>
        </div>
      </div>
      <div class="stat-card purple">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <div class="stat-title">总库存量</div>
          <div class="stat-value">1,248件</div>
          <div class="stat-trend negative">↓ 3.2% 较上周</div>
        </div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">🛡️</div>
        <div class="stat-content">
          <div class="stat-title">待处理价保</div>
          <div class="stat-value">12单</div>
          <div class="stat-trend neutral">- 持平</div>
        </div>
      </div>
    </div>

    <div class="info-section">
      <h3>使用指引</h3>
      <div class="guide-box">
        <p>本项目展示了如何将 <strong>webSkills</strong> 与 <strong>webMCP</strong> 集成到业务系统中：</p>
        <ul>
          <li><strong>左侧系统视图：</strong>标准的Vue + TinyVue业务系统，包含数据列表与操作。</li>
          <li><strong>右侧 AI 助手：</strong>基于 TinyRobot 开发的终端，内置了电商相关的业务技能 (skills)。</li>
        </ul>
        <p><strong>💡 试试在右侧对AI说：</strong></p>
        <div class="prompt-chips">
          <span class="chip">"帮我添加100台iPhone 15到北京一号仓"</span>
          <span class="chip">"顾客李四想申请订单ORD-123的价保50元，原因是百亿补贴变价了"</span>
          <span class="chip">"请查询目前的库存情况"</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  animation: fadeIn 0.4s ease-out;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 4px 0;
}

.subtitle {
  color: #86909c;
  font-size: 0.95rem;
  margin: 0;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  transition:
    transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  font-size: 2rem;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
}

.blue .stat-icon {
  background: rgba(58, 120, 236, 0.1);
}
.purple .stat-icon {
  background: rgba(142, 58, 236, 0.1);
}
.orange .stat-icon {
  background: rgba(236, 117, 58, 0.1);
}

.stat-title {
  color: #86909c;
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1d2129;
  margin-bottom: 8px;
}

.stat-trend {
  font-size: 0.8rem;
  font-weight: 500;
}
.stat-trend.positive {
  color: #00b42a;
}
.stat-trend.negative {
  color: #f53f3f;
}
.stat-trend.neutral {
  color: #86909c;
}

.info-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
}

.info-section h3 {
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  color: #1d2129;
}

.guide-box {
  background: #f7f8fc;
  border-radius: 12px;
  padding: 20px;
  color: #4e5969;
  line-height: 1.6;
}

.guide-box ul {
  padding-left: 20px;
  margin: 12px 0 20px 0;
}

.prompt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.chip {
  background: #fff;
  border: 1px solid #e5e6eb;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #3a78ec;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

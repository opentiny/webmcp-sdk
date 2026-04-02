export function Component() {
  return (
    <div className="finance-container">
      <div className="header">
        <h2>财务管理</h2>
        <p className="subtitle">企业财务总览与结算</p>
      </div>

      <div className="finance-overview">
        <div className="overview-item">
          <h3>可用余额</h3>
          <div className="amount highlight">¥845,210.00</div>
        </div>
        <div className="overview-item">
          <h3>待结算金额</h3>
          <div className="amount">¥124,300.00</div>
        </div>
        <div className="overview-item">
          <h3>本月总支出</h3>
          <div className="amount text-danger">-¥45,120.00</div>
        </div>
      </div>

      <div className="actions">
        <div className="btn primary">发起提现</div>
        <div className="btn">导出账单</div>
        <div className="btn">发票管理</div>
      </div>

      <div className="transactions">
        <h3>最近交易记录</h3>
        <table className="transaction-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>描述</th>
              <th>金额</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2023-11-01 10:24</td>
              <td>收入</td>
              <td>订单结算 (批量)</td>
              <td className="text-success">+¥12,400.00</td>
              <td>
                <span className="status success">已完成</span>
              </td>
            </tr>
            <tr>
              <td>2023-11-02 14:10</td>
              <td>支出</td>
              <td>物流运费结算</td>
              <td className="text-danger">-¥1,200.00</td>
              <td>
                <span className="status success">已完成</span>
              </td>
            </tr>
            <tr>
              <td>2023-11-03 09:15</td>
              <td>退款</td>
              <td>订单原路退款</td>
              <td className="text-danger">-¥4,599.00</td>
              <td>
                <span className="status processing">处理中</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Component
